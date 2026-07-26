const systemPrompt = `You are a careful translator of English church and conference handouts into natural Simplified Chinese.
Preserve the handout's paragraph order, section hierarchy, headings, numbered questions, bullets, blank-fill lines, and discussion tone.
Bible passages are injected separately. Omit their passage labels and verse bodies from blocks so they are not duplicated, but copy any English Bible passage text that is actually present in the source into scriptureEnglish, keyed by its exact detected English reference. Do not invent missing verse text.
Keep every English block paired with exactly one Chinese block at the same structural level.
Suggest concise running headers from the content: headerSuggestions.left should use an event/date/series label if present, and headerSuggestions.right should use the handout topic, preferably bilingual when supported by the content.
When source lines are used only as running-header metadata, omit those duplicate metadata lines from blocks.
Return JSON only with this shape: {"title":"","headerSuggestions":{"left":"...","right":"..."},"scriptureEnglish":{"John 3:16":"complete source text if present"},"blocks":[{"type":"heading|paragraph|question|list","english":"...","chinese":"..."}]}.
Leave title blank; the user can optionally enter their own handout title in the editor.
Keep the English text unchanged except for harmless whitespace cleanup.`;

function demoTranslation(text) {
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const dictionary = new Map([["Notes","笔记"],["Discussion","讨论"],["What is one takeaway from this message?","你从这篇信息中得到的一个收获是什么？"],["How does this apply to your life?","这如何应用在你的生活中？"]]);
  return { title: "", headerSuggestions:{left:"",right:lines[0]||""}, scriptureEnglish:{}, blocks: lines.map((english,index)=>({type:index===0?"heading":english.endsWith("?")?"question":"paragraph",english,chinese:dictionary.get(english)||`【演示译文】${english}`})) };
}

export async function translateDocument(text, { apiKey, model, demo = false }) {
  if (demo || !apiKey) return demoTranslation(text);
  const input = `Return the translated handout as JSON matching the required schema.\n\nENGLISH HANDOUT:\n${text}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method:"POST",
    headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:systemPrompt}]},
      contents:[{role:"user",parts:[{text:input}]}],
      generationConfig:{responseMimeType:"application/json"}
    })
  });
  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try { message = JSON.parse(raw).error?.message || raw; } catch {}
    if (response.status === 429) {
      throw new Error(`Gemini API quota exceeded. Check Gemini API billing and usage limits, then try again. ${message}`);
    }
    throw new Error(`Gemini translation returned ${response.status}: ${message.slice(0,320)}`);
  }
  const json = await response.json();
  const raw = json.candidates?.[0]?.content?.parts?.map((part)=>part.text||"").join("").trim();
  if (!raw) throw new Error("Gemini returned no translated text.");
  return JSON.parse(raw);
}
