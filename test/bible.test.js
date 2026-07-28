import test from "node:test";
import assert from "node:assert/strict";
import { fetchCuvs, normalizeCuvPunctuation, resolveBiblePassages, toCuvReference } from "../server/bible.js";

test("converts detected English book names to Bible API CUV book names", () => {
  assert.equal(toCuvReference("John 3:16"), "約翰福音 3:16");
  assert.equal(toCuvReference("2 Corinthians 5:14-21"), "哥林多後書 5:14-21");
  assert.equal(toCuvReference("Song of Songs 2:1"), "雅歌 2:1");
});

test("fetchCuvs requests CUV and converts Traditional Chinese to Simplified", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        reference: "約翰福音 3:16",
        verses: [{ verse: 16, text: "〔小字〕「神愛世人」，甚至將他的獨生子賜給他們。" }]
      })
    };
  };

  const result = await fetchCuvs("John 3:16");
  assert.match(requestedUrl, /translation=cuv/);
  assert.match(decodeURIComponent(requestedUrl), /約翰福音 3:16/);
  assert.equal(result.reference, "约翰福音 3:16");
  assert.equal(result.text, "16 （小字）“神爱世人”，甚至将他的独生子赐给他们。");
  assert.match(result.source, /Simplified Chinese/);
});

test("normalizes CUV brackets and quotation marks", () => {
  assert.equal(normalizeCuvPunctuation("〔小字〕「经文」"), "（小字）“经文”");
});

test("user-provided Bible text takes priority over fetched scripture", async () => {
  const passages = await resolveBiblePassages(
    ["John 3:16"],
    { "John 3:16": { english: "Complete custom English verse.", chinese: "完整的自定义中文经文。" } },
    {}
  );
  assert.equal(passages[0].english.text, "Complete custom English verse.");
  assert.equal(passages[0].chinese.text, "完整的自定义中文经文。");
  assert.equal(passages[0].chinese.source, "User-provided Bible text");
});
