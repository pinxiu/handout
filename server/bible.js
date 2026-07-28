import * as OpenCC from "opencc-js";

const traditionalToSimplified=OpenCC.Converter({from:"tw",to:"cn"});
export function normalizeCuvPunctuation(value) {
  return String(value||"")
    .replaceAll("〔","（")
    .replaceAll("〕","）")
    .replaceAll("「","“")
    .replaceAll("」","”");
}
const simplifyCuv=(value)=>normalizeCuvPunctuation(traditionalToSimplified(value));
const cuvBookNames=new Map(Object.entries({
  Genesis:"創世紀",Exodus:"出埃及記",Leviticus:"利未記",Numbers:"民數記",Deuteronomy:"申命記",
  Joshua:"約書亞記",Judges:"士師記",Ruth:"路得記","1 Samuel":"撒母耳記上","2 Samuel":"撒母耳記下",
  "1 Kings":"列王紀上","2 Kings":"列王紀下","1 Chronicles":"歷代志上","2 Chronicles":"歷代志下",
  Ezra:"以斯拉記",Nehemiah:"尼希米記",Esther:"以斯帖記",Job:"約伯記",Psalm:"詩篇",Psalms:"詩篇",
  Proverbs:"箴言",Ecclesiastes:"傳道書","Song of Solomon":"雅歌","Song of Songs":"雅歌",Isaiah:"以賽亞書",
  Jeremiah:"耶利米書",Lamentations:"耶利米哀歌",Ezekiel:"以西結書",Daniel:"但以理書",Hosea:"何西阿書",
  Joel:"約珥書",Amos:"阿摩司書",Obadiah:"俄巴底亞書",Jonah:"約拿書",Micah:"彌迦書",Nahum:"那鴻書",
  Habakkuk:"哈巴谷書",Zephaniah:"西番雅書",Haggai:"哈該書",Zechariah:"撒迦利亞書",Malachi:"瑪拉基書",
  Matthew:"馬太福音",Mark:"馬可福音",Luke:"路加福音",John:"約翰福音",Acts:"使徒行傳",Romans:"羅馬書",
  "1 Corinthians":"哥林多前書","2 Corinthians":"哥林多後書",Galatians:"加拉太書",Ephesians:"以弗所書",
  Philippians:"腓利比書",Colossians:"歌羅西書","1 Thessalonians":"帖撒羅尼迦前書",
  "2 Thessalonians":"帖撒羅尼迦後書","1 Timothy":"提摩太前書","2 Timothy":"提摩太後書",Titus:"提多書",
  Philemon:"腓利門書",Hebrews:"希伯來書",James:"雅各書","1 Peter":"彼得前書","2 Peter":"彼得後書",
  "1 John":"約翰壹書","2 John":"約翰貳書","3 John":"約翰參書",Jude:"猶大書",Revelation:"啟示錄"
}).map(([name,chinese])=>[name.toLowerCase(),chinese]));

export function toCuvReference(reference) {
  const match=String(reference).trim().match(/^(.+?)\s+(\d{1,3}(?::.*)?)$/);
  if(!match)return reference;
  const chineseBook=cuvBookNames.get(match[1].toLowerCase());
  return chineseBook?`${chineseBook} ${match[2]}`:reference;
}

export async function fetchEsv(reference, token) {
  if (!token) return null;
  const params = new URLSearchParams({q:reference,"include-passage-references":"false","include-first-verse-numbers":"true","include-footnotes":"false","include-footnote-body":"false","include-headings":"false","include-short-copyright":"true"});
  const response = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, { headers: { Authorization: `Token ${token}` } });
  if (!response.ok) throw new Error(`ESV API returned ${response.status}.`);
  const json = await response.json();
  return { reference: json.canonical || reference, text: json.passages?.join("\n").trim(), source: "ESV API (Crossway)" };
}

export async function fetchCuvs(reference) {
  const cuvReference=toCuvReference(reference);
  const response = await fetch(`https://bible-api.com/${encodeURIComponent(cuvReference)}?translation=cuv`);
  if (!response.ok) throw new Error(`Bible API returned ${response.status} for CUV.`);
  const json = await response.json();
  const traditional=(json.verses||[]).map((verse)=>`${verse.verse} ${verse.text.trim()}`).join(" ").trim()||json.text?.trim();
  if(!traditional) throw new Error(`Bible API returned no CUV text for ${reference}.`);
  return { reference: simplifyCuv(json.reference || cuvReference), text: simplifyCuv(traditional), source: "Bible API CUV, converted to Simplified Chinese" };
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
