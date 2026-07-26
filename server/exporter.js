import { AlignmentType, BorderStyle, Document, Footer, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const green="173D34", pale="EAF3EF", gray="5D6662";
const border={style:BorderStyle.SINGLE,size:1,color:"D7E1DD"};
const noBorder={style:BorderStyle.NONE,size:0,color:"FFFFFF"};
const textRun=(text,opts={})=>new TextRun({text,font:opts.chinese?"Noto Sans CJK SC":"Arial",size:opts.size||21,bold:opts.bold,color:opts.color,italics:opts.italics});
const runFile=promisify(execFile);

function passageBlock(passage,mode) {
  const rows=[];
  if(mode==="bilingual"&&passage.english?.text){
    rows.push(new TableRow({children:[
      new TableCell({shading:{fill:"FFFFFF",type:ShadingType.CLEAR},margins:{top:140,bottom:140,left:160,right:160},children:[
        new Paragraph({children:[textRun(`${passage.reference} (ESV)`,{bold:true,color:green})],spacing:{after:100}}),
        new Paragraph({children:[textRun(passage.english.text)],spacing:{line:290}})
      ]}),
      new TableCell({shading:{fill:pale,type:ShadingType.CLEAR},margins:{top:140,bottom:140,left:160,right:160},children:[
        new Paragraph({children:[textRun(`${passage.reference}（和合本）`,{chinese:true,bold:true,color:green})],spacing:{after:100}}),
        new Paragraph({children:[textRun(passage.chinese?.text||"请在导出前提供 CUVS 经文。",{chinese:true})],spacing:{line:290}})
      ]})
    ]}));
  } else {
    const value=mode==="chinese"?passage.chinese:passage.english;
    rows.push(new TableRow({children:[new TableCell({columnSpan:2,shading:{fill:pale,type:ShadingType.CLEAR},margins:{top:160,bottom:160,left:180,right:180},children:[
      new Paragraph({children:[textRun(`${passage.reference}${mode==="chinese"?"（和合本）":" (ESV)"}`,{chinese:mode==="chinese",bold:true,color:green})],spacing:{after:100}}),
      new Paragraph({children:[textRun(value?.text||"Scripture text not configured.",{chinese:mode==="chinese"})],spacing:{line:290}})
    ]})]}));
  }
  return new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[4680,4680],borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows});
}

function blockParagraph(text,block,chinese=false){
  const isHeading=block.type==="heading";
  return new Paragraph({
    children:[textRun(text||"",{chinese,bold:isHeading,size:isHeading?23:20,color:isHeading?green:undefined})],
    spacing:{before:isHeading?160:0,after:block.type==="question"?120:90,line:276},
    border:block.type==="question"?{left:{style:BorderStyle.SINGLE,size:12,color:"8AB6A6",space:7}}:undefined
  });
}

function contentBlock(block,mode){
  if(mode!=="bilingual") return blockParagraph(mode==="chinese"?block.chinese:block.english,block,mode==="chinese");
  const cellMargins={top:70,bottom:70,left:120,right:120};
  return new Table({
    width:{size:9360,type:WidthType.DXA},
    columnWidths:[4680,4680],
    borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
    rows:[new TableRow({children:[
      new TableCell({width:{size:4680,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.english,block,false)]}),
      new TableCell({width:{size:4680,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.chinese,block,true)]})
    ]})]
  });
}

export async function makeDocx(data){
  const mode=data.outputMode||"bilingual";
  const children=[
    new Paragraph({children:[textRun(data.title||"Handout",{size:34,bold:true,color:green})],spacing:{after:80}}),
    new Paragraph({children:[textRun(mode==="bilingual"?"ENGLISH · 简体中文":mode==="chinese"?"简体中文":"ENGLISH",{size:18,bold:true,color:gray})],spacing:{after:280}})
  ];
  for(const passage of data.passages||[]) if(passage.english?.text||passage.chinese?.text) children.push(passageBlock(passage,mode),new Paragraph({spacing:{after:120}}));
  for(const block of data.blocks||[]) children.push(contentBlock(block,mode));
  const doc=new Document({styles:{default:{document:{run:{font:"Arial",size:21,color:"1E2925"},paragraph:{spacing:{after:120,line:290}}}}},sections:[{properties:{page:{margin:{top:1080,right:1080,bottom:1080,left:1080}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[textRun("Handout Bridge  ·  ",{size:17,color:gray}),new TextRun({children:[PageNumber.CURRENT],size:17,color:gray})]})]})},children}]});
  return Packer.toBuffer(doc);
}

function sofficeCandidates(){
  return [
    process.env.SOFFICE_PATH,
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "soffice",
    "libreoffice"
  ].filter(Boolean);
}

export async function makePdf(data){
  const tempDir=await mkdtemp(path.join(os.tmpdir(),"handout-bridge-"));
  const docxPath=path.join(tempDir,"handout.docx");
  try{
    await writeFile(docxPath,await makeDocx(data));
    let lastError;
    for(const executable of sofficeCandidates()){
      try{
        await runFile(executable,["--headless","--convert-to","pdf","--outdir",tempDir,docxPath],{timeout:60000});
        return await readFile(path.join(tempDir,"handout.pdf"));
      }catch(error){lastError=error;}
    }
    throw new Error(`PDF conversion needs LibreOffice. Set SOFFICE_PATH if it is installed in a custom location. ${lastError?.message||""}`.trim());
  }finally{
    await rm(tempDir,{recursive:true,force:true});
  }
}
