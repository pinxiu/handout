import * as OpenCC from "opencc-js";

const traditionalToSimplified=OpenCC.Converter({from:"tw",to:"cn"});

export async function fetchEsv(reference, token) {
  if (!token) return null;
  const params = new URLSearchParams({q:reference,"include-passage-references":"false","include-first-verse-numbers":"true","include-footnotes":"false","include-footnote-body":"false","include-headings":"false","include-short-copyright":"true"});
  const response = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, { headers: { Authorization: `Token ${token}` } });
  if (!response.ok) throw new Error(`ESV API returned ${response.status}.`);
  const json = await response.json();
  return { reference: json.canonical || reference, text: json.passages?.join("\n").trim(), source: "ESV API (Crossway)" };
}

export async function fetchCuvs(reference) {
  const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=cuv`);
  if (!response.ok) throw new Error(`Bible API returned ${response.status} for CUV.`);
  const json = await response.json();
  const traditional=(json.verses||[]).map((verse)=>`${verse.verse} ${verse.text.trim()}`).join(" ").trim()||json.text?.trim();
  if(!traditional) throw new Error(`Bible API returned no CUV text for ${reference}.`);
  return { reference: json.reference || reference, text: traditionalToSimplified(traditional), source: "Bible API CUV, converted to Simplified Chinese" };
}

export async function resolveBiblePassages(references, overrides, config) {
  const results = [];
  for (const reference of references) {
    const override = overrides?.[reference] || {};
    const english = override.english?.trim() ? { reference, text: override.english.trim(), source: "User override" } : await fetchEsv(reference, config.esvToken);
    const chinese = override.chinese?.trim() ? { reference, text: override.chinese.trim(), source: "User-provided Bible text" } : await fetchCuvs(reference);
    results.push({ reference, english, chinese });
  }
  return results;
}
