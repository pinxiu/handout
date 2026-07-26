const systemPrompt = `You are a careful church handout translator. Translate English into natural Simplified Chinese.
Preserve paragraph order, headings, bullet meaning, blank-fill lines, and discussion-question tone.
Do not translate Bible verse text; scripture is replaced separately with licensed ESV and CUVS text.
Return JSON only with this shape: {"title":"...","blocks":[{"type":"heading|paragraph|question|list","english":"...","chinese":"..."}]}.
Keep the English text unchanged except for harmless whitespace cleanup.`;

function demoTranslation(text) {
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const dictionary = new Map([["Notes","笔记"],["Discussion","讨论"],["What is one takeaway from this message?","你从这篇信息中得到的一个收获是什么？"],["How does this apply to your life?","这如何应用在你的生活中？"]]);
  return { title: "Bilingual Handout / 双语讲义", blocks: lines.map((english,index)=>({type:index===0?"heading":english.endsWith("?")?"question":"paragraph",english,chinese:dictionary.get(english)||`【演示译文】${english}`})) };
}

export async function translateDocument(text, { apiKey, model, demo = false }) {
  if (demo || !apiKey) return demoTranslation(text);
  const response = await fetch("https://api.openai.com/v1/responses", {method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,instructions:systemPrompt,input:text,text:{format:{type:"json_object"}}})});
  if (!response.ok) throw new Error(`Translation service returned ${response.status}: ${(await response.text()).slice(0,240)}`);
  const json = await response.json();
  const raw = json.output_text || json.output?.flatMap((o)=>o.content||[]).find((x)=>x.type==="output_text")?.text;
  if (!raw) throw new Error("Translation service returned no text.");
  return JSON.parse(raw);
}
