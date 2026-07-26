import { AlignmentType, BorderStyle, Document, Footer, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

const green="173D34", pale="EAF3EF", gray="5D6662";
const border={style:BorderStyle.SINGLE,size:1,color:"D7E1DD"};
const textRun=(text,opts={})=>new TextRun({text,font:opts.chinese?"Noto Sans CJK SC":"Arial",size:opts.size||21,bold:opts.bold,color:opts.color,italics:opts.italics});

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

function contentParagraph(block,mode){
  const isHeading=block.type==="heading", children=[];
  if(mode==="bilingual"){
    children.push(textRun(block.english,{bold:isHeading,size:isHeading?24:21}));
    if(block.chinese) children.push(new TextRun({break:1}),textRun(block.chinese,{chinese:true,color:isHeading?green:undefined,bold:isHeading,size:isHeading?24:21}));
  } else children.push(textRun(mode==="chinese"?block.chinese:block.english,{chinese:mode==="chinese",bold:isHeading,size:isHeading?24:21}));
  return new Paragraph({children,spacing:{before:isHeading?220:0,after:block.type==="question"?180:120,line:290},border:block.type==="question"?{left:{style:BorderStyle.SINGLE,size:16,color:"8AB6A6",space:8}}:undefined});
}

export async function makeDocx(data){
  const mode=data.outputMode||"bilingual";
  const children=[
    new Paragraph({children:[textRun(data.title||"Handout",{size:34,bold:true,color:green})],spacing:{after:80}}),
    new Paragraph({children:[textRun(mode==="bilingual"?"ENGLISH · 简体中文":mode==="chinese"?"简体中文":"ENGLISH",{size:18,bold:true,color:gray})],spacing:{after:280}})
  ];
  for(const passage of data.passages||[]) if(passage.english?.text||passage.chinese?.text) children.push(passageBlock(passage,mode),new Paragraph({spacing:{after:120}}));
  for(const block of data.blocks||[]) children.push(contentParagraph(block,mode));
  const doc=new Document({styles:{default:{document:{run:{font:"Arial",size:21,color:"1E2925"},paragraph:{spacing:{after:120,line:290}}}}},sections:[{properties:{page:{margin:{top:1080,right:1080,bottom:1080,left:1080}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[textRun("Handout Bridge  ·  ",{size:17,color:gray}),new TextRun({children:[PageNumber.CURRENT],size:17,color:gray})]})]})},children}]});
  return Packer.toBuffer(doc);
}
