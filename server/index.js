import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractDocument, detectReferences } from "./parser.js";
import { resolveBiblePassages } from "./bible.js";
import { translateDocument } from "./translator.js";
import { makeDocx, makePdf } from "./exporter.js";

const app=express();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
app.use(express.json({limit:"5mb"}));
app.get("/api/health",(_req,res)=>res.json({ok:true,translationConfigured:Boolean(process.env.OPENAI_API_KEY),esvConfigured:Boolean(process.env.ESV_API_TOKEN),cuvsConfigured:Boolean(process.env.API_BIBLE_KEY&&process.env.API_BIBLE_CUVS_ID)}));
app.post("/api/import",upload.single("document"),async(req,res)=>{try{if(!req.file)throw new Error("Choose a DOCX or PDF first.");const text=await extractDocument(req.file);res.json({text,references:detectReferences(text),filename:req.file.originalname});}catch(error){res.status(400).json({error:error.message});}});
app.post("/api/generate",async(req,res)=>{try{const{text,references=[],overrides={},demo=false}=req.body;if(!text?.trim())throw new Error("The imported document has no text.");const[translated,passages]=await Promise.all([translateDocument(text,{apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||"gpt-5.6-sol",demo}),resolveBiblePassages(references,overrides,{esvToken:process.env.ESV_API_TOKEN,apiBibleKey:process.env.API_BIBLE_KEY,cuvsBibleId:process.env.API_BIBLE_CUVS_ID})]);res.json({...translated,passages});}catch(error){res.status(500).json({error:error.message});}});
app.post("/api/export",async(req,res)=>{try{const buffer=await makeDocx(req.body);res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.wordprocessingml.document");res.setHeader("Content-Disposition",'attachment; filename="bilingual-handout.docx"');res.send(buffer);}catch(error){res.status(500).json({error:error.message});}});
app.post("/api/export/pdf",async(req,res)=>{try{const buffer=await makePdf(req.body);res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition",'attachment; filename="bilingual-handout.pdf"');res.send(buffer);}catch(error){res.status(500).json({error:error.message});}});
if(process.env.NODE_ENV==="production"){app.use(express.static(path.join(root,"dist")));app.get("*",(_req,res)=>res.sendFile(path.join(root,"dist","index.html")));}
const port=Number(process.env.PORT||4174);
app.listen(port,()=>console.log(`Handout Bridge running at http://localhost:${port}`));
