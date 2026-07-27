const systemPrompt = `You are a careful translator of English church and conference handouts into natural Simplified Chinese.
Preserve the handout's paragraph order, section hierarchy, headings, numbered questions, bullets, blank-fill lines, and discussion tone. Keep each question's visible number at the beginning of both its English and Chinese strings. Mark an "Extra Notes" or equivalent blank writing section as type "notes".
Bible passages are injected separately. At the exact position where each passage appears, return one block with {"type":"scripture","reference":"the exact English reference","english":"","chinese":""}. Do not also return its passage label or verse body as another block. Copy any English Bible passage text actually present in the source into scriptureEnglish, keyed by that exact reference. Do not invent missing verse text.
Keep every English block paired with exactly one Chinese block at the same structural level.
Suggest concise running headers from the content: headerSuggestions.left should use an event/date/series label if present, and headerSuggestions.right should use the handout topic, preferably bilingual when supported by the content.
When source lines are used only as running-header metadata, omit those duplicate metadata lines from blocks.
Return JSON only with this shape: {"title":"","headerSuggestions":{"left":"...","right":"..."},"scriptureEnglish":{"John 3:16":"complete source text if present"},"blocks":[{"type":"heading|paragraph|question|list|notes|scripture","reference":"required only for scripture","english":"...","chinese":"..."}]}.
Leave title blank; the user can optionally enter their own handout title in the editor.
Keep the English text unchanged except for harmless whitespace cleanup.`;

export async function translateDocument(text, { apiKey, model }) {
  if (!apiKey) throw new Error("Gemini is not configured. Add GEMINI_API_KEY to .env and restart the app; demo translations are disabled.");
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
