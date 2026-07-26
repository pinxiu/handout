const systemPrompt = `You are a careful translator of English church and conference handouts into natural Simplified Chinese.
Preserve the handout's paragraph order, section hierarchy, headings, numbered questions, bullets, blank-fill lines, and discussion tone.
Bible passage bodies are injected separately from authoritative ESV and CUVS sources. Omit those verse bodies from blocks so they are not duplicated, but preserve non-Bible commentary, passage labels, section headings, questions, and notes.
Keep every English block paired with exactly one Chinese block at the same structural level.
Return JSON only with this shape: {"title":"...","blocks":[{"type":"heading|paragraph|question|list","english":"...","chinese":"..."}]}.
Keep the English text unchanged except for harmless whitespace cleanup.`;

function demoTranslation(text) {
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const dictionary = new Map([["Notes","笔记"],["Discussion","讨论"],["What is one takeaway from this message?","你从这篇信息中得到的一个收获是什么？"],["How does this apply to your life?","这如何应用在你的生活中？"]]);
  return { title: "Bilingual Handout / 双语讲义", blocks: lines.map((english,index)=>({type:index===0?"heading":english.endsWith("?")?"question":"paragraph",english,chinese:dictionary.get(english)||`【演示译文】${english}`})) };
}

export async function translateDocument(text, { apiKey, model, demo = false }) {
  if (demo || !apiKey) return demoTranslation(text);
  const input = `Return the translated handout as JSON matching the required schema.\n\nENGLISH HANDOUT:\n${text}`;
  const response = await fetch("https://api.openai.com/v1/responses", {method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,instructions:systemPrompt,input,text:{format:{type:"json_object"}}})});
  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try { message = JSON.parse(raw).error?.message || raw; } catch {}
    if (response.status === 429) {
      throw new Error(`OpenAI API quota exceeded. Check API billing and usage limits, then try again. ${message}`);
    }
    throw new Error(`Translation service returned ${response.status}: ${message.slice(0,320)}`);
  }
  const json = await response.json();
  const raw = json.output_text || json.output?.flatMap((o)=>o.content||[]).find((x)=>x.type==="output_text")?.text;
  if (!raw) throw new Error("Translation service returned no text.");
  return JSON.parse(raw);
}
