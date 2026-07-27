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
  chinese:data.chineseFont||"Arial Unicode MS"
});
const layoutSettings=(data={})=>{
  const compact=data.layoutPreset!=="spacious";
  return {
    bodySize:Number(data.bodyFontSize)||9.5,
    headingSize:Number(data.headingFontSize)||11,
    headerSize:Number(data.headerFontSize)||9,
    questionSpaceLines:Math.max(0,Math.min(8,Number(data.questionSpaceLines ?? 0))),
    notesSpaceLines:Math.max(0,Math.min(24,Number(data.notesSpaceLines ?? 10))),
    englishLineSpacing:Math.max(1.05,Math.min(2,Number(data.englishLineSpacing ?? (compact?1.22:1.45)))),
    chineseLineSpacing:Math.max(1.1,Math.min(2,Number(data.chineseLineSpacing ?? (compact?1.4:1.6)))),
    blockSpacing:Math.max(0,Math.min(24,Number(data.blockSpacing ?? (compact?1:8)))),
    columnGap:compact?16:24,
    marginInches:data.marginSize==="compact"?0.65:1
  };
};
const hasChinese=(value)=>/[\u3400-\u9fff]/.test(String(value||""));
const chineseReference=(passage)=>passage.chinese?.reference||passage.reference;
const contentSequence=(data)=>{
  const blocks=data.blocks||[];
  if(blocks.some(block=>block.type==="scripture"))return blocks;
  return [...(data.passages||[]).map(passage=>({type:"scripture",reference:passage.reference})),...blocks];
};
const presentationSequence=(data)=>{
  const sequence=contentSequence(data);
  const output=[];
  for(let index=0;index<sequence.length;index+=1){
    const block=sequence[index];
    if(block.type==="heading"&&/^(bible text|scripture|圣经经文)$/i.test(String(block.english||block.chinese||"").trim()))continue;
    if(block.type==="heading"&&sequence[index+1]?.type==="scripture"){
      output.push({...sequence[index+1],subtitleEnglish:block.english||"",subtitleChinese:block.chinese||""});
      index+=1;
      continue;
    }
    output.push(block);
  }
  return output;
};
const findPassage=(data,reference)=>(data.passages||[]).find(passage=>passage.reference===reference);
const verseRuns=(text,{font,chinese=false,size=20}={})=>{
  const parts=String(text||"").split(/(\b\d{1,3})(?=\s)/g);
  return parts.filter(Boolean).map((part)=>/^\d{1,3}$/.test(part)
    ? textRun(part,{font,chinese,size:Math.max(size-4,12),bold:true,superScript:true})
    : textRun(part,{font,chinese,size}));
};

function passageBlock(passage,mode,tableWidth=9360,fonts=fontSettings(),layout=layoutSettings()) {
  const halfWidth=Math.floor(tableWidth/2);
  const bodyHalfPoints=layout.bodySize*2;
  const englishLine=Math.round(layout.bodySize*20*layout.englishLineSpacing);
  const chineseLine=Math.round(layout.bodySize*20*layout.chineseLineSpacing);
  const rows=[];
  if(mode==="bilingual"){
    rows.push(new TableRow({children:[
      new TableCell({margins:{top:80,bottom:80,left:120,right:120},children:[
        new Paragraph({children:[textRun(`${passage.reference} (ESV)${passage.subtitleEnglish?` – ${passage.subtitleEnglish}`:""}`,{bold:true,font:fonts.english,size:bodyHalfPoints})],spacing:{after:60}}),
        new Paragraph({children:verseRuns(passage.english?.text||"Provide the complete ESV verse text before export.",{font:fonts.english,size:bodyHalfPoints}),spacing:{line:englishLine}})
      ]}),
      new TableCell({margins:{top:80,bottom:80,left:120,right:120},children:[
        new Paragraph({children:[textRun(`${chineseReference(passage)}（和合本）${passage.subtitleChinese?`—— ${passage.subtitleChinese}`:""}`,{chinese:true,bold:true,font:fonts.chinese,size:bodyHalfPoints})],spacing:{after:60}}),
        new Paragraph({children:verseRuns(passage.chinese?.text||"请在导出前提供经文。",{chinese:true,font:fonts.chinese,size:bodyHalfPoints}),spacing:{line:chineseLine}})
      ]})
    ]}));
  } else {
    const value=mode==="chinese"?passage.chinese:passage.english;
    rows.push(new TableRow({children:[new TableCell({columnSpan:2,margins:{top:80,bottom:80,left:120,right:120},children:[
      new Paragraph({children:[textRun(`${mode==="chinese"?chineseReference(passage):passage.reference}${mode==="chinese"?"（和合本）":" (ESV)"}`,{chinese:mode==="chinese",bold:true,font:mode==="chinese"?fonts.chinese:fonts.english})],spacing:{after:70}}),
      new Paragraph({children:verseRuns(value?.text||"Scripture text not configured.",{chinese:mode==="chinese",font:mode==="chinese"?fonts.chinese:fonts.english}),spacing:{line:276}})
    ]})]}));
  }
  return new Table({width:{size:tableWidth,type:WidthType.DXA},columnWidths:[halfWidth,tableWidth-halfWidth],borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows});
}

function blockParagraph(text,block,chinese=false,font,layout=layoutSettings()){
  const isHeading=block.type==="heading";
  const isNotes=block.type==="notes";
  const extraLines=block.type==="question"?layout.questionSpaceLines:isNotes?layout.notesSpaceLines:0;
  const lineSpacing=chinese?layout.chineseLineSpacing:layout.englishLineSpacing;
  const bottomSpace=Math.round((layout.blockSpacing+extraLines*layout.bodySize*lineSpacing)*20);
  return new Paragraph({
    children:[textRun(text||"",{chinese,font,bold:isHeading||isNotes,size:(isHeading||isNotes)?layout.headingSize*2:layout.bodySize*2})],
    spacing:{before:(isHeading||isNotes)?100:0,after:bottomSpace,line:Math.round(layout.bodySize*20*lineSpacing)},
    indent:block.type==="question"?{left:300,hanging:300}:undefined,
    border:(isHeading||isNotes)&&/^(background|questions|reflection|extra notes|notes|背景|问题|反思|笔记)/i.test(String(text||""))
      ? {bottom:{style:BorderStyle.SINGLE,size:4,color:"A6AAA8",space:5}}
      : undefined
  });
}

function contentBlock(block,mode,tableWidth=9360,fonts=fontSettings(),layout=layoutSettings()){
  if(mode!=="bilingual") return blockParagraph(mode==="chinese"?block.chinese:block.english,block,mode==="chinese",mode==="chinese"?fonts.chinese:fonts.english,layout);
  const halfWidth=Math.floor(tableWidth/2);
  const cellMargins={top:70,bottom:70,left:120,right:120};
  return new Table({
    width:{size:tableWidth,type:WidthType.DXA},
    columnWidths:[halfWidth,tableWidth-halfWidth],
    borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
    rows:[new TableRow({children:[
      new TableCell({width:{size:halfWidth,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.english,block,false,fonts.english,layout)]}),
      new TableCell({width:{size:tableWidth-halfWidth,type:WidthType.DXA},margins:cellMargins,children:[blockParagraph(block.chinese,block,true,fonts.chinese,layout)]})
    ]})]
  });
}

export async function makeDocx(data){
  const mode=data.outputMode||"bilingual";
  const landscape=data.orientation==="landscape";
  const layout=layoutSettings(data);
  const pageWidth=landscape?15840:12240;
  const tableWidth=pageWidth-Math.round(layout.marginInches*1440)*2;
  const fonts=fontSettings(data);
  const children=[];
  if(data.title?.trim())children.push(new Paragraph({children:[textRun(data.title.trim(),{font:hasChinese(data.title)?fonts.chinese:fonts.english,chinese:hasChinese(data.title),size:28,bold:true})],spacing:{after:180}}));
  for(const block of presentationSequence(data)){
    if(block.type==="scripture"){
      const passage=findPassage(data,block.reference);
      if(passage)children.push(passageBlock({...passage,subtitleEnglish:block.subtitleEnglish,subtitleChinese:block.subtitleChinese},mode,tableWidth,fonts,layout),new Paragraph({spacing:{after:50}}));
    }else children.push(contentBlock(block,mode,tableWidth,fonts,layout));
  }
  const headerTable=new Table({width:{size:tableWidth,type:WidthType.DXA},columnWidths:[Math.floor(tableWidth/2),Math.ceil(tableWidth/2)],borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[
    new TableCell({children:[new Paragraph({children:[textRun(data.headerLeft||"",{font:hasChinese(data.headerLeft)?fonts.chinese:fonts.english,chinese:hasChinese(data.headerLeft),size:layout.headerSize*2})]})]}),
    new TableCell({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[textRun(data.headerRight||"",{font:hasChinese(data.headerRight)?fonts.chinese:fonts.english,chinese:hasChinese(data.headerRight),size:layout.headerSize*2})]})]})
  ]})]});
  const pageAlign={left:AlignmentType.LEFT,center:AlignmentType.CENTER,right:AlignmentType.RIGHT}[data.pageNumberPosition]||AlignmentType.RIGHT;
  const pageRuns=data.pageNumberStyle==="currentTotal"
    ? [new TextRun({children:[PageNumber.CURRENT],size:17}),textRun(" / ",{font:fonts.english,size:17}),new TextRun({children:[PageNumber.TOTAL_PAGES],size:17})]
    : [new TextRun({children:[PageNumber.CURRENT],size:17})];
  const margin=Math.round(layout.marginInches*1440);
  const footer=data.pageNumberPosition==="none"?undefined:{default:new Footer({children:[new Paragraph({alignment:pageAlign,children:pageRuns})]})};
  const doc=new Document({styles:{default:{document:{run:{font:fonts.english,size:layout.bodySize*2,color:"202020"},paragraph:{spacing:{after:Math.round(layout.blockSpacing*20),line:Math.round(layout.bodySize*20*layout.englishLineSpacing)}}}}},sections:[{properties:{page:{size:landscape?{width:15840,height:12240,orientation:PageOrientation.LANDSCAPE}:undefined,margin:{top:720,right:margin,bottom:720,left:margin,header:360,footer:360}}},headers:{default:new Header({children:[headerTable]})},footers:footer,children}]});
  return Packer.toBuffer(doc);
}

function writePdfText(doc,text,x,y,width,{bold=false,font,boldFont,size=10,color="#1E2925",lineGap=2}={}){
  doc.font(bold?(boldFont||"NotoBold"):(font||"Noto")).fontSize(size).fillColor(color);
  doc.text(text||"",x,y,{width,lineGap});
  return doc.heightOfString(text||"",{width,lineGap});
}

function writePdfVerse(doc,text,x,y,width,{font="Noto",boldFont="NotoBold",size=9.5,lineGap=2}={}){
  const parts=String(text||"").split(/(\b\d{1,3})(?=\s)/g).filter(Boolean);
  if(!parts.length)return 0;
  doc.font(font).fontSize(size).fillColor("#202020");
  parts.forEach((part,index)=>{
    const number=/^\d{1,3}$/.test(part);
    const options={
      width,
      lineGap,
      continued:index<parts.length-1,
      baseline:number?2:0
    };
    doc.font(number?boldFont:font).fontSize(number?size-2:size);
    if(index===0)doc.text(part,x,y,options);
    else doc.text(part,options);
  });
  doc.font(font).fontSize(size);
  return doc.heightOfString(String(text||""),{width,lineGap});
}

function measurePdfText(doc,text,width,{font="Noto",size=10,lineGap=2}={}){
  doc.font(font).fontSize(size);
  return doc.heightOfString(String(text||""),{width,lineGap});
}

export async function makePdf(data){
  const mode=data.outputMode||"bilingual";
  const layout=data.orientation==="landscape"?"landscape":"portrait";
  const style=layoutSettings(data);
  const margin=Math.round(style.marginInches*72);
  const doc=new PDFDocument({size:"LETTER",layout,margins:{top:42,bottom:42,left:margin,right:margin},bufferPages:true,autoFirstPage:true});
  const fonts=fontSettings(data);
  const chineseSerif=fonts.chinese==="Songti SC";
  doc.registerFont("Noto",chineseSerif?serifRegular:fontRegular).registerFont("NotoBold",chineseSerif?serifBold:fontBold);
  const englishPdf={Arial:"Helvetica","Times New Roman":"Times-Roman","Courier New":"Courier"}[fonts.english]||"Helvetica";
  const englishBold={Arial:"Helvetica-Bold","Times New Roman":"Times-Bold","Courier New":"Courier-Bold"}[fonts.english]||"Helvetica-Bold";
  const chunks=[];
  doc.on("data",(chunk)=>chunks.push(chunk));
  const done=new Promise((resolve,reject)=>{doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);});
  const grayPdf="#555555";
  const pageWidth=doc.page.width,usable=pageWidth-margin*2,gap=style.columnGap;
  const bilingual=mode==="bilingual",columnWidth=bilingual?(usable-gap)/2:usable;
  let y=58;
  const addPageIfNeeded=(height)=>{if(y+height>doc.page.height-54){doc.addPage({size:"LETTER",layout,margins:{top:42,bottom:42,left:margin,right:margin}});y=58;}};
  if(data.title?.trim()){const mixedTitle=hasChinese(data.title);writePdfText(doc,data.title.trim(),margin,y,usable,{font:mixedTitle?"Noto":englishPdf,boldFont:mixedTitle?"NotoBold":englishBold,bold:true,size:16,color:"#202020",lineGap:1});y+=30;}
  for(const block of presentationSequence(data)){
    if(block.type==="scripture"){
      const foundPassage=findPassage(data,block.reference);
      const passage=foundPassage?{...foundPassage,subtitleEnglish:block.subtitleEnglish,subtitleChinese:block.subtitleChinese}:null;
      if(!passage)continue;
      const english=passage.english?.text||"Provide the complete ESV verse text before export.",chinese=passage.chinese?.text||"请提供实际的经文内容。";
      const verseSize=Math.max(8,style.bodySize-.5);
      const englishGap=Math.max(0,verseSize*(style.englishLineSpacing-1));
      const chineseGap=Math.max(1,verseSize*(style.chineseLineSpacing-1));
      if(bilingual){
        const leftLabel=`${passage.reference} (ESV)${passage.subtitleEnglish?` – ${passage.subtitleEnglish}`:""}`;
        const rightLabel=`${chineseReference(passage)}（和合本）${passage.subtitleChinese?`—— ${passage.subtitleChinese}`:""}`;
        const textWidth=columnWidth-8;
        const labelBodyGap=8;
        const leftLabelHeight=Math.max(style.bodySize*1.4,measurePdfText(doc,leftLabel,textWidth,{font:englishBold,size:style.bodySize,lineGap:0}));
        const rightLabelHeight=Math.max(style.bodySize*Math.max(1.6,style.chineseLineSpacing),measurePdfText(doc,rightLabel,textWidth,{font:"NotoBold",size:style.bodySize,lineGap:1}));
        const leftVerseHeight=measurePdfText(doc,english,textWidth,{font:englishPdf,size:verseSize,lineGap:englishGap});
        const rightVerseHeight=measurePdfText(doc,chinese,textWidth,{font:"Noto",size:verseSize,lineGap:chineseGap});
        const leftHeight=leftLabelHeight+labelBodyGap+leftVerseHeight;
        const rightHeight=rightLabelHeight+labelBodyGap+rightVerseHeight;
        const height=Math.max(leftHeight,rightHeight);
        addPageIfNeeded(height+style.blockSpacing);
        writePdfText(doc,leftLabel,margin,y,textWidth,{font:englishPdf,boldFont:englishBold,bold:true,size:style.bodySize,color:"#202020",lineGap:0});
        writePdfVerse(doc,english,margin,y+leftLabelHeight+labelBodyGap,textWidth,{font:englishPdf,boldFont:englishBold,size:verseSize,lineGap:englishGap});
        writePdfText(doc,rightLabel,margin+columnWidth+gap,y,textWidth,{font:"Noto",boldFont:"NotoBold",bold:true,size:style.bodySize,color:"#202020",lineGap:1});
        writePdfVerse(doc,chinese,margin+columnWidth+gap,y+rightLabelHeight+labelBodyGap,textWidth,{font:"Noto",boldFont:"NotoBold",size:verseSize,lineGap:chineseGap});
        y+=height+style.blockSpacing;
      }else{
        const value=mode==="chinese"?chinese:english;
        const chineseMode=mode==="chinese";
        const subtitle=chineseMode?passage.subtitleChinese:passage.subtitleEnglish;
        const label=`${chineseMode?chineseReference(passage):passage.reference}${chineseMode?"（和合本）":" (ESV)"}${subtitle?(chineseMode?`—— ${subtitle}`:` – ${subtitle}`):""}`;
        const font=chineseMode?"Noto":englishPdf,boldFont=chineseMode?"NotoBold":englishBold;
        const lineGap=chineseMode?chineseGap:englishGap;
        const labelHeight=Math.max(style.bodySize*(chineseMode?Math.max(1.6,style.chineseLineSpacing):1.4),measurePdfText(doc,label,usable,{font:boldFont,size:style.bodySize,lineGap:chineseMode?1:0}));
        const verseHeight=measurePdfText(doc,value,usable,{font,size:verseSize,lineGap});
        const height=labelHeight+8+verseHeight;
        addPageIfNeeded(height+style.blockSpacing);
        writePdfText(doc,label,margin,y,usable,{font,boldFont,bold:true,size:style.bodySize,color:"#202020",lineGap:chineseMode?1:0});
        writePdfVerse(doc,value,margin,y+labelHeight+8,usable,{font,boldFont,size:verseSize,lineGap});
        y+=height+style.blockSpacing;
      }
    }else{
      const heading=block.type==="heading"||block.type==="notes",size=heading?style.headingSize:style.bodySize;
      const left=bilingual?block.english:(mode==="chinese"?block.chinese:block.english);
      const right=bilingual?block.chinese:"";
      const englishGap=Math.max(0,size*(style.englishLineSpacing-1));
      const chineseGap=Math.max(1,size*(style.chineseLineSpacing-1));
      const leftIsChinese=!bilingual&&mode==="chinese";
      const leftFont=leftIsChinese?(heading?"NotoBold":"Noto"):(heading?englishBold:englishPdf);
      const leftGap=leftIsChinese?chineseGap:englishGap;
      const leftHeight=measurePdfText(doc,left||"",columnWidth-8,{font:leftFont,size,lineGap:leftGap});
      const rightHeight=bilingual?measurePdfText(doc,right||"",columnWidth-8,{font:heading?"NotoBold":"Noto",size,lineGap:chineseGap}):0;
      const extraLines=block.type==="question"?style.questionSpaceLines:block.type==="notes"?style.notesSpaceLines:0;
      const baseHeight=Math.max(leftHeight,rightHeight)+(heading?5:style.blockSpacing);
      const height=baseHeight+extraLines*style.bodySize*Math.max(style.englishLineSpacing,style.chineseLineSpacing);
      addPageIfNeeded(block.type==="notes"?baseHeight:height);
      writePdfText(doc,left,margin,y,columnWidth-8,{font:leftIsChinese?"Noto":englishPdf,boldFont:leftIsChinese?"NotoBold":englishBold,bold:heading,size,color:"#202020",lineGap:leftGap});
      if(bilingual)writePdfText(doc,right,margin+columnWidth+gap,y,columnWidth-8,{font:"Noto",boldFont:"NotoBold",bold:heading,size,color:"#202020",lineGap:chineseGap});
      y+=height;
    }
  }
  const pages=doc.bufferedPageRange();
  for(let i=0;i<pages.count;i++){
    doc.switchToPage(i);
    const headerY=30;
    doc.font(hasChinese(data.headerLeft)?"Noto":englishPdf).fontSize(style.headerSize).fillColor("#202020").text(data.headerLeft||"",margin,headerY,{width:usable/2,lineBreak:false});
    doc.font(hasChinese(data.headerRight)?"Noto":englishPdf).fontSize(style.headerSize).text(data.headerRight||"",margin+usable/2,headerY,{width:usable/2,align:"right",lineBreak:false});
    if(data.pageNumberPosition==="none")continue;
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
