import { AlignmentType, BorderStyle, Document, Footer, Header, Packer, PageNumber, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";

const green="173D34", pale="EAF3EF", gray="5D6662";
const border={style:BorderStyle.SINGLE,size:1,color:"D7E1DD"};
const noBorder={style:BorderStyle.NONE,size:0,color:"FFFFFF"};
const textRun=(text,opts={})=>{
  const font=opts.font||(opts.chinese?"Heiti SC":"Arial");
  return new TextRun({text,font:opts.chinese?{ascii:font,hAnsi:font,eastAsia:font,cs:font}:font,size:opts.size||21,bold:opts.bold,color:opts.color,italics:opts.italics,superScript:opts.superScript});
};
const fontRegular=fileURLToPath(new URL("../node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff",import.meta.url));
const fontBold=fileURLToPath(new URL("../node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff",import.meta.url));
const serifRegular=fileURLToPath(new URL("../node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff",import.meta.url));
const serifBold=fileURLToPath(new URL("../node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-700-normal.woff",import.meta.url));

const fontSettings=(data={})=>({
  english:data.englishFont||"Arial",
  chinese:data.chineseFont||"Heiti SC"
});
const verseRuns=(text,{font,chinese=false,size=20}={})=>{
  const parts=String(text||"").split(/(\b\d{1,3})(?=\s)/g);
  return parts.filter(Boolean).map((part)=>/^\d{1,3}$/.test(part)
    ? textRun(part,{font,chinese,size:Math.max(size-4,12),bold:true,superScript:true})
    : textRun(part,{font,chinese,size}));
};

function passageBlock(passage,mode,tableWidth=9360,fonts=fontSettings()) {
  const halfWidth=Math.floor(tableWidth/2);
  const rows=[];
  if(mode==="bilingual"&&passage.english?.text){
    rows.push(new TableRow({children:[
      new TableCell({margins:{top:80,bottom:80,left:120,right:120},children:[
        new Paragraph({children:[textRun(`${passage.reference} (ESV)`,{bold:true,font:fonts.english})],spacing:{after:70}}),
        new Paragraph({children:verseRuns(passage.english.text,{font:fonts.english}),spacing:{line:276}})
      ]}),
      new TableCell({margins:{top:80,bottom:80,left:120,right:120},children:[
        new Paragraph({children:[textRun(`${passage.reference}（和合本）`,{chinese:true,bold:true,font:fonts.chinese})],spacing:{after:70}}),
        new Paragraph({children:verseRuns(passage.chinese?.text||"请在导出前提供经文。",{chinese:true,font:fonts.chinese}),spacing:{line:276}})
      ]})
    ]}));
  } else {
    const value=mode==="chinese"?passage.chinese:passage.english;
    rows.push(new TableRow({children:[new TableCell({columnSpan:2,margins:{top:80,bottom:80,left:120,right:120},children:[
      new Paragraph({children:[textRun(`${passage.reference}${mode==="chinese"?"（和合本）":" (ESV)"}`,{chinese:mode==="chinese",bold:true,font:mode==="chinese"?fonts.chinese:fonts.english})],spacing:{after:70}}),
      new Paragraph({children:verseRuns(value?.text||"Scripture text not configured.",{chinese:mode==="chinese",font:mode==="chinese"?fonts.chinese:fonts.english}),spacing:{line:276}})
    ]})]}));
  }
  return new Table({width:{size:tableWidth,type:WidthType.DXA},columnWidths:[halfWidth,tableWidth-halfWidth],borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows});
}

function blockParagraph(text,block,chinese=false,font){
  const isHeading=block.type==="heading";
  return new Paragraph({
    children:[textRun(text||"",{chinese,font,bold:isHeading,size:isHeading?21:20})],
    spacing:{before:isHeading?150:0,after:block.type==="question"?90:70,line:276}
  });
}

function contentBlock(block,mode,tableWidth=9360,fonts=fontSettings()){
  if(mode!=="bilingual") return blockParagraph(mode==="chinese"?block.chinese:block.english,block,mode==="chinese",mode==="chinese"?fonts.chinese:fonts.english);
  const halfWidth=Math.floor(tableWidth/2);
  const cellMargins={top:70,bottom:70,left:120,right:120};
  return new Table({
    width:{size:tableWidth,type:WidthType.DXA},
    columnWidths:[halfWidth,tableWidth-halfWidth],
    borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
    rows:[new TableRow({children:[
      new TableCell({width:{size:halfWidth,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.english,block,false,fonts.english)]}),
      new TableCell({width:{size:tableWidth-halfWidth,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.chinese,block,true,fonts.chinese)]})
    ]})]
  });
}

export async function makeDocx(data){
  const mode=data.outputMode||"bilingual";
  const landscape=data.orientation==="landscape";
  const tableWidth=landscape?13680:9360;
  const fonts=fontSettings(data);
  const children=[];
  if(data.title?.trim())children.push(new Paragraph({children:[textRun(data.title.trim(),{font:fonts.english,size:28,bold:true})],spacing:{after:180}}));
  for(const passage of data.passages||[]) if(passage.english?.text||passage.chinese?.text) children.push(passageBlock(passage,mode,tableWidth,fonts),new Paragraph({spacing:{after:80}}));
  for(const block of data.blocks||[]) children.push(contentBlock(block,mode,tableWidth,fonts));
  const headerTable=new Table({width:{size:tableWidth,type:WidthType.DXA},columnWidths:[Math.floor(tableWidth/2),Math.ceil(tableWidth/2)],borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[
    new TableCell({children:[new Paragraph({children:[textRun(data.headerLeft||"",{font:fonts.english,size:18})]})]}),
    new TableCell({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[textRun(data.headerRight||"",{font:fonts.chinese,chinese:true,size:18})]})]})
  ]})]});
  const pageAlign={left:AlignmentType.LEFT,center:AlignmentType.CENTER,right:AlignmentType.RIGHT}[data.pageNumberPosition]||AlignmentType.RIGHT;
  const pageRuns=data.pageNumberStyle==="currentTotal"
    ? [new TextRun({children:[PageNumber.CURRENT],size:17}),textRun(" / ",{font:fonts.english,size:17}),new TextRun({children:[PageNumber.TOTAL_PAGES],size:17})]
    : [new TextRun({children:[PageNumber.CURRENT],size:17})];
  const doc=new Document({styles:{default:{document:{run:{font:fonts.english,size:20,color:"202020"},paragraph:{spacing:{after:80,line:276}}}}},sections:[{properties:{page:{size:landscape?{width:15840,height:12240,orientation:PageOrientation.LANDSCAPE}:undefined,margin:{top:900,right:1080,bottom:900,left:1080}}},headers:{default:new Header({children:[headerTable]})},footers:{default:new Footer({children:[new Paragraph({alignment:pageAlign,children:pageRuns})]})},children}]});
  return Packer.toBuffer(doc);
}

function writePdfText(doc,text,x,y,width,{bold=false,font,boldFont,size=10,color="#1E2925",lineGap=2}={}){
  doc.font(bold?(boldFont||"NotoBold"):(font||"Noto")).fontSize(size).fillColor(color);
  doc.text(text||"",x,y,{width,lineGap});
  return doc.heightOfString(text||"",{width,lineGap});
}

function writePdfVerse(doc,text,x,y,width,{font="Noto",boldFont="NotoBold",size=9.5}={}){
  const parts=String(text||"").split(/(\b\d{1,3})(?=\s)/g).filter(Boolean);
  if(!parts.length)return 0;
  doc.font(font).fontSize(size).fillColor("#202020");
  parts.forEach((part,index)=>{
    const number=/^\d{1,3}$/.test(part);
    const options={
      width,
      lineGap:2,
      continued:index<parts.length-1,
      baseline:number?2:0
    };
    doc.font(number?boldFont:font).fontSize(number?size-2:size);
    if(index===0)doc.text(part,x,y,options);
    else doc.text(part,options);
  });
  return doc.heightOfString(String(text||""),{width,lineGap:2});
}

export async function makePdf(data){
  const mode=data.outputMode||"bilingual";
  const layout=data.orientation==="landscape"?"landscape":"portrait";
  const doc=new PDFDocument({size:"LETTER",layout,margins:{top:52,bottom:52,left:54,right:54},bufferPages:true,autoFirstPage:true});
  const fonts=fontSettings(data);
  const chineseSerif=fonts.chinese==="Songti SC";
  doc.registerFont("Noto",chineseSerif?serifRegular:fontRegular).registerFont("NotoBold",chineseSerif?serifBold:fontBold);
  const englishPdf={Arial:"Helvetica","Times New Roman":"Times-Roman","Courier New":"Courier"}[fonts.english]||"Helvetica";
  const englishBold={Arial:"Helvetica-Bold","Times New Roman":"Times-Bold","Courier New":"Courier-Bold"}[fonts.english]||"Helvetica-Bold";
  const chunks=[];
  doc.on("data",(chunk)=>chunks.push(chunk));
  const done=new Promise((resolve,reject)=>{doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);});
  const grayPdf="#555555";
  const margin=54,pageWidth=doc.page.width,usable=pageWidth-margin*2,gap=18;
  const bilingual=mode==="bilingual",columnWidth=bilingual?(usable-gap)/2:usable;
  let y=52;
  const addPageIfNeeded=(height)=>{if(y+height>doc.page.height-68){doc.addPage({size:"LETTER",layout,margins:{top:52,bottom:52,left:54,right:54}});y=52;}};
  if(data.title?.trim()){writePdfText(doc,data.title.trim(),margin,y,usable,{font:englishPdf,boldFont:englishBold,bold:true,size:16,color:"#202020",lineGap:1});y+=30;}
  for(const passage of data.passages||[]){
    const english=passage.english?.text||"",chinese=passage.chinese?.text||"请提供实际的经文内容。";
    if(!english&&!passage.chinese?.text)continue;
    if(bilingual){
      doc.font("NotoBold").fontSize(10);
      const leftHeight=20+doc.heightOfString(english,{width:columnWidth-24,lineGap:2});
      const rightHeight=20+doc.heightOfString(chinese,{width:columnWidth-24,lineGap:2});
      const height=Math.max(leftHeight,rightHeight)+24;
      addPageIfNeeded(height+18);
      writePdfText(doc,`${passage.reference} (ESV)`,margin,y,columnWidth-8,{font:englishPdf,boldFont:englishBold,bold:true,size:10,color:"#202020"});
      writePdfVerse(doc,english,margin,y+20,columnWidth-8,{font:englishPdf,boldFont:englishBold,size:9.5});
      writePdfText(doc,`${passage.reference}（和合本简体）`,margin+columnWidth+gap,y,columnWidth-8,{font:"Noto",boldFont:"NotoBold",bold:true,size:10,color:"#202020"});
      writePdfVerse(doc,chinese,margin+columnWidth+gap,y+20,columnWidth-8,{font:"Noto",boldFont:"NotoBold",size:9.5});
      y+=height+18;
    }else{
      const value=mode==="chinese"?chinese:english;
      doc.font("Noto").fontSize(9.5);
      const height=44+doc.heightOfString(value,{width:usable-24,lineGap:2});
      addPageIfNeeded(height+18);
      writePdfText(doc,`${passage.reference}${mode==="chinese"?"（和合本简体）":" (ESV)"}`,margin,y,usable,{font:mode==="chinese"?"Noto":englishPdf,boldFont:mode==="chinese"?"NotoBold":englishBold,bold:true,size:10,color:"#202020"});
      writePdfVerse(doc,value,margin,y+20,usable,{font:mode==="chinese"?"Noto":englishPdf,boldFont:mode==="chinese"?"NotoBold":englishBold,size:9.5});
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
    doc.font(heading?englishBold:englishPdf);
    writePdfText(doc,left,margin,y,columnWidth-8,{font:englishPdf,boldFont:englishBold,bold:heading,size,color:"#202020"});
    if(bilingual)writePdfText(doc,right,margin+columnWidth+gap,y,columnWidth-8,{font:"Noto",boldFont:"NotoBold",bold:heading,size,color:"#202020"});
    y+=height;
  }
  const pages=doc.bufferedPageRange();
  for(let i=0;i<pages.count;i++){
    doc.switchToPage(i);
    const headerY=30;
    doc.font(englishPdf).fontSize(8.5).fillColor("#202020").text(data.headerLeft||"",margin,headerY,{width:usable/2,lineBreak:false});
    doc.font("Noto").fontSize(8.5).text(data.headerRight||"",margin+usable/2,headerY,{width:usable/2,align:"right",lineBreak:false});
    doc.page.margins.bottom=0;
    const pageText=data.pageNumberStyle==="currentTotal"?`${i+1} / ${pages.count}`:`${i+1}`;
    const pagePosition=data.pageNumberPosition||"right";
    const footerX=pagePosition==="left"?margin:pagePosition==="center"?(doc.page.width-96)/2:doc.page.width-margin-96;
    doc.font(englishPdf).fontSize(8).fillColor(grayPdf).text(
      pageText,
      footerX,
      doc.page.height-38,
      {width:96,align:pagePosition==="center"?"center":pagePosition,lineBreak:false}
    );
  }
  doc.end();
  return done;
}
