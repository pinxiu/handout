import { AlignmentType, BorderStyle, Document, Footer, Packer, PageNumber, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";

const green="173D34", pale="EAF3EF", gray="5D6662";
const border={style:BorderStyle.SINGLE,size:1,color:"D7E1DD"};
const noBorder={style:BorderStyle.NONE,size:0,color:"FFFFFF"};
const textRun=(text,opts={})=>new TextRun({text,font:opts.chinese?"Noto Sans CJK SC":"Arial",size:opts.size||21,bold:opts.bold,color:opts.color,italics:opts.italics});
const fontRegular=fileURLToPath(new URL("../node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff",import.meta.url));
const fontBold=fileURLToPath(new URL("../node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff",import.meta.url));

function passageBlock(passage,mode,tableWidth=9360) {
  const halfWidth=Math.floor(tableWidth/2);
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
  return new Table({width:{size:tableWidth,type:WidthType.DXA},columnWidths:[halfWidth,tableWidth-halfWidth],borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows});
}

function blockParagraph(text,block,chinese=false){
  const isHeading=block.type==="heading";
  return new Paragraph({
    children:[textRun(text||"",{chinese,bold:isHeading,size:isHeading?23:20,color:isHeading?green:undefined})],
    spacing:{before:isHeading?160:0,after:block.type==="question"?120:90,line:276},
    border:block.type==="question"?{left:{style:BorderStyle.SINGLE,size:12,color:"8AB6A6",space:7}}:undefined
  });
}

function contentBlock(block,mode,tableWidth=9360){
  if(mode!=="bilingual") return blockParagraph(mode==="chinese"?block.chinese:block.english,block,mode==="chinese");
  const halfWidth=Math.floor(tableWidth/2);
  const cellMargins={top:70,bottom:70,left:120,right:120};
  return new Table({
    width:{size:tableWidth,type:WidthType.DXA},
    columnWidths:[halfWidth,tableWidth-halfWidth],
    borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
    rows:[new TableRow({children:[
      new TableCell({width:{size:halfWidth,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.english,block,false)]}),
      new TableCell({width:{size:tableWidth-halfWidth,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.chinese,block,true)]})
    ]})]
  });
}

export async function makeDocx(data){
  const mode=data.outputMode||"bilingual";
  const landscape=data.orientation==="landscape";
  const tableWidth=landscape?13680:9360;
  const children=[
    new Paragraph({children:[textRun(data.title||"Handout",{size:34,bold:true,color:green})],spacing:{after:80}}),
    new Paragraph({children:[textRun(mode==="bilingual"?"ENGLISH · 简体中文":mode==="chinese"?"简体中文":"ENGLISH",{size:18,bold:true,color:gray})],spacing:{after:280}})
  ];
  for(const passage of data.passages||[]) if(passage.english?.text||passage.chinese?.text) children.push(passageBlock(passage,mode,tableWidth),new Paragraph({spacing:{after:120}}));
  for(const block of data.blocks||[]) children.push(contentBlock(block,mode,tableWidth));
  const doc=new Document({styles:{default:{document:{run:{font:"Arial",size:21,color:"1E2925"},paragraph:{spacing:{after:120,line:290}}}}},sections:[{properties:{page:{size:landscape?{width:15840,height:12240,orientation:PageOrientation.LANDSCAPE}:undefined,margin:{top:1080,right:1080,bottom:1080,left:1080}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[textRun("Handout Bridge  ·  ",{size:17,color:gray}),new TextRun({children:[PageNumber.CURRENT],size:17,color:gray})]})]})},children}]});
  return Packer.toBuffer(doc);
}

function writePdfText(doc,text,x,y,width,{bold=false,size=10,color="#1E2925",lineGap=2}={}){
  doc.font(bold?"NotoBold":"Noto").fontSize(size).fillColor(color);
  doc.text(text||"",x,y,{width,lineGap});
  return doc.heightOfString(text||"",{width,lineGap});
}

export async function makePdf(data){
  const mode=data.outputMode||"bilingual";
  const layout=data.orientation==="landscape"?"landscape":"portrait";
  const doc=new PDFDocument({size:"LETTER",layout,margins:{top:52,bottom:52,left:54,right:54},bufferPages:true,autoFirstPage:true});
  doc.registerFont("Noto",fontRegular).registerFont("NotoBold",fontBold);
  const chunks=[];
  doc.on("data",(chunk)=>chunks.push(chunk));
  const done=new Promise((resolve,reject)=>{doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);});
  const greenPdf="#173D34",grayPdf="#5D6662",palePdf="#EAF3EF",linePdf="#D7E1DD";
  const margin=54,pageWidth=doc.page.width,usable=pageWidth-margin*2,gap=18;
  const bilingual=mode==="bilingual",columnWidth=bilingual?(usable-gap)/2:usable;
  let y=52;
  const addPageIfNeeded=(height)=>{if(y+height>doc.page.height-68){doc.addPage({size:"LETTER",layout,margins:{top:52,bottom:52,left:54,right:54}});y=52;}};
  writePdfText(doc,data.title||"Handout",margin,y,usable,{bold:true,size:19,color:greenPdf,lineGap:1});
  y+=34;
  writePdfText(doc,bilingual?"ENGLISH · 简体中文":mode==="chinese"?"简体中文":"ENGLISH",margin,y,usable,{bold:true,size:8,color:grayPdf});
  y+=30;
  for(const passage of data.passages||[]){
    const english=passage.english?.text||"",chinese=passage.chinese?.text||"请提供实际的经文内容。";
    if(!english&&!passage.chinese?.text)continue;
    if(bilingual){
      doc.font("NotoBold").fontSize(10);
      const leftHeight=20+doc.heightOfString(english,{width:columnWidth-24,lineGap:2});
      const rightHeight=20+doc.heightOfString(chinese,{width:columnWidth-24,lineGap:2});
      const height=Math.max(leftHeight,rightHeight)+24;
      addPageIfNeeded(height+18);
      doc.rect(margin,y,columnWidth,height).fillAndStroke("#FFFFFF",linePdf);
      doc.rect(margin+columnWidth+gap,y,columnWidth,height).fillAndStroke(palePdf,linePdf);
      writePdfText(doc,`${passage.reference} (ESV)`,margin+12,y+12,columnWidth-24,{bold:true,size:10,color:greenPdf});
      writePdfText(doc,english,margin+12,y+34,columnWidth-24,{size:9.5});
      writePdfText(doc,`${passage.reference}（和合本简体）`,margin+columnWidth+gap+12,y+12,columnWidth-24,{bold:true,size:10,color:greenPdf});
      writePdfText(doc,chinese,margin+columnWidth+gap+12,y+34,columnWidth-24,{size:9.5});
      y+=height+18;
    }else{
      const value=mode==="chinese"?chinese:english;
      doc.font("Noto").fontSize(9.5);
      const height=44+doc.heightOfString(value,{width:usable-24,lineGap:2});
      addPageIfNeeded(height+18);
      doc.rect(margin,y,usable,height).fillAndStroke(palePdf,linePdf);
      writePdfText(doc,`${passage.reference}${mode==="chinese"?"（和合本简体）":" (ESV)"}`,margin+12,y+12,usable-24,{bold:true,size:10,color:greenPdf});
      writePdfText(doc,value,margin+12,y+34,usable-24,{size:9.5});
      y+=height+18;
    }
  }
  for(const block of data.blocks||[]){
    const heading=block.type==="heading",question=block.type==="question",size=heading?11:9.5;
    doc.font(heading?"NotoBold":"Noto").fontSize(size);
    const left=bilingual?block.english:(mode==="chinese"?block.chinese:block.english);
    const right=bilingual?block.chinese:"";
    const leftHeight=doc.heightOfString(left||"",{width:columnWidth-8,lineGap:2});
    const rightHeight=bilingual?doc.heightOfString(right||"",{width:columnWidth-8,lineGap:2}):0;
    const height=Math.max(leftHeight,rightHeight)+(heading?18:12);
    addPageIfNeeded(height);
    if(question){doc.rect(margin-8,y,3,height-6).fill("#8AB6A6");}
    writePdfText(doc,left,margin,y,columnWidth-8,{bold:heading,size,color:heading?greenPdf:"#1E2925"});
    if(bilingual)writePdfText(doc,right,margin+columnWidth+gap,y,columnWidth-8,{bold:heading,size,color:heading?greenPdf:"#1E2925"});
    y+=height;
  }
  const pages=doc.bufferedPageRange();
  for(let i=0;i<pages.count;i++){
    doc.switchToPage(i);
    doc.page.margins.bottom=0;
    doc.font("Noto").fontSize(8).fillColor(grayPdf).text(
      `Handout Bridge  ·  ${i+1}`,
      doc.page.width-150,
      doc.page.height-38,
      {width:96,lineBreak:false}
    );
  }
  doc.end();
  return done;
}
