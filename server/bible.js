const stripHtml = (value = "") => value.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function fetchEsv(reference, token) {
  if (!token) return null;
  const params = new URLSearchParams({q:reference,"include-passage-references":"false","include-first-verse-numbers":"true","include-footnotes":"false","include-footnote-body":"false","include-headings":"false","include-short-copyright":"true"});
  const response = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, { headers: { Authorization: `Token ${token}` } });
  if (!response.ok) throw new Error(`ESV API returned ${response.status}.`);
  const json = await response.json();
  return { reference: json.canonical || reference, text: json.passages?.join("\n").trim(), source: "ESV API (Crossway)" };
}

export async function fetchCuvs(reference, key, bibleId) {
  if (!key || !bibleId) return null;
  const params = new URLSearchParams({"content-type":"html","include-notes":"false","include-titles":"false","include-chapter-numbers":"false","include-verse-numbers":"true"});
  const response = await fetch(`https://rest.api.bible/v1/bibles/${bibleId}/passages/${encodeURIComponent(reference)}?${params}`, { headers: { "api-key": key } });
  if (!response.ok) throw new Error(`API.Bible returned ${response.status} for CUVS.`);
  const json = await response.json();
  return { reference: json.data?.reference || reference, text: stripHtml(json.data?.content), source: "API.Bible (CUVS)" };
}

export async function resolveBiblePassages(references, overrides, config) {
  const results = [];
  for (const reference of references) {
    const override = overrides?.[reference] || {};
    const english = override.english?.trim() ? { reference, text: override.english.trim(), source: "User override" } : await fetchEsv(reference, config.esvToken);
    const chinese = override.chinese?.trim() ? { reference, text: override.chinese.trim(), source: "User override" } : await fetchCuvs(reference, config.apiBibleKey, config.cuvsBibleId);
    results.push({ reference, english, chinese });
  }
  return results;
}
