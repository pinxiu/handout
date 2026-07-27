import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import"./styles.css";

const emptyDraft={title:"",headerSuggestions:{left:"",right:""},blocks:[],passages:[]};
const commonFonts=["Arial","Arial Unicode MS","Times New Roman","Georgia","Verdana","Tahoma","Trebuchet MS","Courier New","Helvetica","Heiti SC","Songti SC","PingFang SC","STHeiti","STSong"];
const versePreview=(text="")=>text.split(/(\b\d{1,3})(?=\s)/g).filter(Boolean).map((part,i)=>/^\d{1,3}$/.test(part)?<sup key={i}>{part}</sup>:part);

function App(){
  const[step,setStep]=useState(1);
  const[file,setFile]=useState(null);
  const[source,setSource]=useState("");
  const[references,setReferences]=useState([]);
  const[overrides,setOverrides]=useState({});
  const[draft,setDraft]=useState(emptyDraft);
  const[mode,setMode]=useState("bilingual");
  const[orientation,setOrientation]=useState("landscape");
  const[englishFont,setEnglishFont]=useState("Arial");
  const[chineseFont,setChineseFont]=useState("Arial Unicode MS");
  const[availableFonts,setAvailableFonts]=useState(commonFonts);
  const[fontMessage,setFontMessage]=useState("");
  const[headerLeft,setHeaderLeft]=useState("");
  const[headerRight,setHeaderRight]=useState("");
  const[pageNumberPosition,setPageNumberPosition]=useState("none");
  const[pageNumberStyle,setPageNumberStyle]=useState("current");
  const[layoutPreset,setLayoutPreset]=useState("archive");
  const[marginSize,setMarginSize]=useState("standard");
  const[bodyFontSize,setBodyFontSize]=useState(9.5);
  const[headingFontSize,setHeadingFontSize]=useState(11);
  const[headerFontSize,setHeaderFontSize]=useState(9);
  const[englishLineSpacing,setEnglishLineSpacing]=useState(1.22);
  const[chineseLineSpacing,setChineseLineSpacing]=useState(1.4);
  const[blockSpacing,setBlockSpacing]=useState(1);
  const[questionSpaceLines,setQuestionSpaceLines]=useState(0);
  const[notesSpaceLines,setNotesSpaceLines]=useState(10);
  const[health,setHealth]=useState({});
  const[busy,setBusy]=useState("");
  const[exporting,setExporting]=useState("");
  const[error,setError]=useState("");

  useEffect(()=>{fetch("/api/health").then(r=>r.json()).then(setHealth).catch(()=>{})},[]);
  const configured=health.translationConfigured;
  const statusText=useMemo(()=>[
    configured?"Gemini translation ready":"Gemini not configured",
    health.esvConfigured?"ESV connected":"ESV source-text/override mode",
    "CUV via Bible API"
  ],[health,configured]);

  async function importFile(){
    if(!file)return;
    setBusy("Reading document…");
    setError("");
    const form=new FormData();
    form.append("document",file);
    const res=await fetch("/api/import",{method:"POST",body:form});
    const json=await res.json();
    if(!res.ok){setError(json.error);setBusy("");return}
    setSource(json.text);
    setReferences(json.references);
    setStep(2);
    setBusy("");
  }

  async function generate(){
    setBusy(configured?"Translating and matching scripture…":"Building handout…");
    setError("");
    const res=await fetch("/api/generate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text:source,references,overrides})
    });
    const json=await res.json();
    if(!res.ok){setError(json.error);setBusy("");return}
    setDraft({...emptyDraft,...json});
    setStep(3);
    setBusy("");
  }

  async function exportFile(format){
    setExporting(format);
    setError("");
    const res=await fetch(format==="pdf"?"/api/export/pdf":"/api/export",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({...draft,outputMode:mode,orientation,englishFont,chineseFont,headerLeft,headerRight,pageNumberPosition,pageNumberStyle,layoutPreset,marginSize,bodyFontSize,headingFontSize,headerFontSize,englishLineSpacing,chineseLineSpacing,blockSpacing,questionSpaceLines,notesSpaceLines})
    });
    if(!res.ok){
      const json=await res.json();
      setError(json.error);
      setExporting("");
      return;
    }
    const blob=await res.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`${mode}-${orientation}-handout.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting("");
  }

  async function loadSystemFonts(){
    if(!window.queryLocalFonts){
      setFontMessage("This browser does not support local font discovery. Common system fonts are still listed.");
      return;
    }
    try{
      const fonts=await window.queryLocalFonts();
      const names=[...new Set(fonts.flatMap(font=>[font.family,font.fullName]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      setAvailableFonts([...new Set([...commonFonts,...names])]);
      setFontMessage(`${names.length} local fonts available.`);
    }catch{
      setFontMessage("Font access was not granted. Common system fonts are still listed.");
    }
  }

  const updateBlock=(index,key,value)=>setDraft(current=>({...current,blocks:current.blocks.map((b,i)=>i===index?{...b,[key]:value}:b)}));
  const updatePassage=(index,language,value)=>setDraft(current=>({...current,passages:current.passages.map((p,i)=>i===index?{...p,[language]:{...(p[language]||{}),text:value,source:"Edited by user"}}:p)}));
  const suggestions=draft.headerSuggestions||{};

  return <main>
    <header className="topbar"><a className="brand" href="#"><span className="mark">H</span><span>Handout Bridge</span></a><span className="eyebrow">EN → 简体中文</span></header>
    <section className="hero">
      <div><p className="kicker">Church handouts, without the formatting marathon</p><h1>From an English handout<br/>to a polished bilingual edition.</h1><p className="lede">Import an English Word or PDF handout, review scripture substitutions, refine the translation, then export in bilingual or Chinese-only format.</p></div>
      <div className="status-card"><p className="mini-label">System readiness</p>{statusText.map((x,i)=><div className="status" key={x}><span className={i===0&&!configured?"dot amber":"dot"}/>{x}</div>)}</div>
    </section>
    <nav className="steps" aria-label="Workflow">{["Import","Scripture","Review & export"].map((label,i)=><button key={label} className={step===i+1?"active":step>i+1?"done":""} onClick={()=>step>i+1&&setStep(i+1)}><span>0{i+1}</span>{label}</button>)}</nav>
    <section className="workspace">
      {step===1&&<div className="panel import-panel">
        <div className="panel-heading"><p className="mini-label">Step 01</p><h2>Bring in the English source</h2><p>DOCX and text-based PDF are supported up to 20 MB.</p></div>
        <label className="dropzone"><input type="file" accept=".docx,.pdf" onChange={e=>setFile(e.target.files[0])}/><span className="upload-icon">↑</span><strong>{file?file.name:"Choose a document"}</strong><small>{file?`${(file.size/1024).toFixed(0)} KB · ready to import`:"or drag it here"}</small></label>
        <button className="primary" disabled={!file||busy} onClick={importFile}>{busy||"Read document"} <span>→</span></button>
      </div>}

      {step===2&&<div className="editor-grid">
        <div className="panel"><div className="panel-heading"><p className="mini-label">Source text</p><h2>Confirm the extraction</h2></div><textarea className="source-editor" value={source} onChange={e=>setSource(e.target.value)}/></div>
        <div className="panel scripture-panel">
          <div className="panel-heading"><p className="mini-label">Detected scripture</p><h2>{references.length} passage{references.length===1?"":"s"} found</h2><p>Default: ESV plus CUV converted to Simplified Chinese. Without an ESV API token, English verse text is extracted from the source handout when present. For another version, paste the complete verse text—not only the version name.</p></div>
          {references.length===0&&<div className="empty">No Bible references detected. You can continue and translate the handout as-is.</div>}
          {references.map(ref=><div className="verse-card" key={ref}><div className="verse-title"><strong>{ref}</strong><span>ESV · CUV 简体</span></div><textarea placeholder="Optional replacement: paste the complete English verses" value={overrides[ref]?.english||""} onChange={e=>setOverrides({...overrides,[ref]:{...overrides[ref],english:e.target.value}})}/><textarea placeholder="可选替换：请粘贴完整的中文经文内容（不只是译本名称）" value={overrides[ref]?.chinese||""} onChange={e=>setOverrides({...overrides,[ref]:{...overrides[ref],chinese:e.target.value}})}/></div>)}
          <button className="primary" disabled={!source.trim()||busy} onClick={generate}>{busy||"Generate handout"} <span>→</span></button>
          {!configured&&<p className="hint">Add GEMINI_API_KEY to .env and restart the app for production-quality translation.</p>}
        </div>
      </div>}

      {step===3&&<div className="review-layout">
        <aside className="panel controls">
          <div className="panel-heading"><p className="mini-label">Output</p><h2>Customize handout</h2></div>
          {[["bilingual","Bilingual","English + 简体中文"],["chinese","Chinese only","仅简体中文"],["english","English only","Source language"]].map(([value,label,sub])=><label className={`mode ${mode===value?"selected":""}`} key={value}><input type="radio" name="mode" checked={mode===value} onChange={()=>setMode(value)}/><span><strong>{label}</strong><small>{sub}</small></span></label>)}

          <p className="mini-label layout-label">Typography</p>
          <label className="field-label">English font<select value={englishFont} onChange={e=>setEnglishFont(e.target.value)}>{availableFonts.map(font=><option key={`en-${font}`}>{font}</option>)}</select></label>
          <label className="field-label">中文字体<select value={chineseFont} onChange={e=>setChineseFont(e.target.value)}>{availableFonts.map(font=><option key={`zh-${font}`}>{font}</option>)}</select></label>
          <button className="font-button" type="button" onClick={loadSystemFonts}>Load fonts from this computer</button>
          {fontMessage&&<p className="control-hint">{fontMessage}</p>}

          <p className="mini-label layout-label">Page header</p>
          <label className="field-label">Left<input value={headerLeft} placeholder="e.g. 2026.07.05 Sunday Gathering" onChange={e=>setHeaderLeft(e.target.value)}/></label>
          {suggestions.left&&<button className="suggestion" type="button" onClick={()=>setHeaderLeft(suggestions.left)}>Use suggestion: {suggestions.left}</button>}
          <label className="field-label">Right<input value={headerRight} placeholder="e.g. View of Self 自我观" onChange={e=>setHeaderRight(e.target.value)}/></label>
          {suggestions.right&&<button className="suggestion" type="button" onClick={()=>setHeaderRight(suggestions.right)}>Use suggestion: {suggestions.right}</button>}

          <p className="mini-label layout-label">Page layout</p>
          <label className="field-label">Layout density<select value={layoutPreset} onChange={e=>setLayoutPreset(e.target.value)}><option value="archive">Archive compact (recommended)</option><option value="spacious">Spacious</option></select></label>
          <div className="orientation-options">{[["portrait","Portrait","纵向"],["landscape","Landscape","横向"]].map(([value,label,sub])=><label className={`mode compact ${orientation===value?"selected":""}`} key={value}><input type="radio" name="orientation" checked={orientation===value} onChange={()=>setOrientation(value)}/><span><strong>{label}</strong><small>{sub}</small></span></label>)}</div>
          <label className="field-label">Margins<select value={marginSize} onChange={e=>setMarginSize(e.target.value)}><option value="standard">Reference style (1 inch)</option><option value="compact">Compact (0.65 inch)</option></select></label>
          <label className="field-label">Page number position<select value={pageNumberPosition} onChange={e=>setPageNumberPosition(e.target.value)}><option value="none">None</option><option value="left">Left</option><option value="center">Middle</option><option value="right">Right</option></select></label>
          <label className="field-label">Page number style<select value={pageNumberStyle} onChange={e=>setPageNumberStyle(e.target.value)}><option value="current">Page number only (1)</option><option value="currentTotal">With total count (1 / 4)</option></select></label>
          <p className="mini-label layout-label">Type & writing space</p>
          <label className="field-label">Body size<input type="number" min="8" max="14" step="0.5" value={bodyFontSize} onChange={e=>setBodyFontSize(e.target.value)}/></label>
          <label className="field-label">Section heading size<input type="number" min="9" max="18" step="0.5" value={headingFontSize} onChange={e=>setHeadingFontSize(e.target.value)}/></label>
          <label className="field-label">Header size<input type="number" min="7" max="14" step="0.5" value={headerFontSize} onChange={e=>setHeaderFontSize(e.target.value)}/></label>
          <label className="field-label">English line spacing<input type="number" min="1.05" max="2" step="0.05" value={englishLineSpacing} onChange={e=>setEnglishLineSpacing(e.target.value)}/></label>
          <label className="field-label">中文行距<input type="number" min="1.1" max="2" step="0.05" value={chineseLineSpacing} onChange={e=>setChineseLineSpacing(e.target.value)}/></label>
          <label className="field-label">Gap between paired blocks (pt)<input type="number" min="0" max="24" step="1" value={blockSpacing} onChange={e=>setBlockSpacing(e.target.value)}/></label>
          <label className="field-label">Answer-space lines after each question<input type="number" min="0" max="8" value={questionSpaceLines} onChange={e=>setQuestionSpaceLines(e.target.value)}/></label>
          <label className="field-label">Blank lines after Notes<input type="number" min="0" max="24" value={notesSpaceLines} onChange={e=>setNotesSpaceLines(e.target.value)}/></label>

          <div className="export-actions">
            <button className="primary" disabled={Boolean(exporting)} onClick={()=>exportFile("docx")}>{exporting==="docx"?"Preparing Word handout…":"Download DOCX"} <span>↓</span></button>
            <button className="primary pdf" disabled={Boolean(exporting)} onClick={()=>exportFile("pdf")}>{exporting==="pdf"?"Preparing PDF handout…":"Download PDF"} <span>↓</span></button>
          </div>
          <button className="secondary" onClick={()=>setStep(2)}>← Edit source & scripture</button>
        </aside>

        <article className={`paper ${orientation} ${layoutPreset}`} style={{"--english-font":englishFont,"--chinese-font":chineseFont,"--body-size":`${bodyFontSize}px`,"--heading-size":`${headingFontSize}px`,"--header-size":`${headerFontSize}px`,"--english-leading":englishLineSpacing,"--chinese-leading":chineseLineSpacing,"--block-gap":`${blockSpacing}px`,"--question-space":`${Number(questionSpaceLines)*Number(bodyFontSize)*Math.max(Number(englishLineSpacing),Number(chineseLineSpacing))}px`,"--notes-space":`${Number(notesSpaceLines)*Number(bodyFontSize)*Math.max(Number(englishLineSpacing),Number(chineseLineSpacing))}px`}}>
          <div className="preview-header"><span>{headerLeft}</span><span>{headerRight}</span></div>
          <input className="title-editor" placeholder="Optional handout title" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/>
          {draft.blocks.map((block,i)=>{
            if(block.type==="scripture"){
              const pi=draft.passages.findIndex(p=>p.reference===block.reference);
              const p=draft.passages[pi];
              if(!p)return null;
              return <div className={`passage ${mode}`} key={`scripture-${block.reference}`}>
                {mode!=="chinese"&&<div className="english-copy"><strong>{p.reference} (ESV)</strong><div className="verse-display" contentEditable suppressContentEditableWarning onBlur={e=>updatePassage(pi,"english",e.currentTarget.innerText)}>{versePreview(p.english?.text||"Provide the complete ESV verse text before export.")}</div><small>{p.english?.source||"Needs English source text"} · click text to edit</small></div>}
                {mode!=="english"&&<div className="chinese-copy"><strong>{p.chinese?.reference||p.reference}（和合本简体）</strong><div className="verse-display" lang="zh-Hans" contentEditable suppressContentEditableWarning onBlur={e=>updatePassage(pi,"chinese",e.currentTarget.innerText)}>{versePreview(p.chinese?.text||"请提供实际的经文内容")}</div><small>{p.chinese?.source||"Needs source"} · 点击经文可编辑</small></div>}
              </div>;
            }
            return <div className={`block ${block.type} ${mode}`} key={i}>{mode!=="chinese"&&<textarea className="english-copy" value={block.english} onChange={e=>updateBlock(i,"english",e.target.value)}/>} {mode!=="english"&&<textarea className="chinese-copy" lang="zh-Hans" value={block.chinese} onChange={e=>updateBlock(i,"chinese",e.target.value)}/>}</div>;
          })}
        </article>
      </div>}
      {error&&<div className="error">{error}</div>}
    </section>
    <footer><span>Designed from your 2025–2026 handout archive.</span><span>Local-first · keys stay on your machine</span></footer>
  </main>
}

createRoot(document.getElementById("root")).render(<App/>);
