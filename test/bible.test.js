import test from "node:test";
import assert from "node:assert/strict";
import { fetchCuvs, resolveBiblePassages } from "../server/bible.js";

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
        verses: [{ verse: 16, text: "神愛世人，甚至將他的獨生子賜給他們。" }]
      })
    };
  };

  const result = await fetchCuvs("John 3:16");
  assert.match(requestedUrl, /translation=cuv/);
  assert.equal(result.text, "16 神爱世人，甚至将他的独生子赐给他们。");
  assert.match(result.source, /Simplified Chinese/);
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
