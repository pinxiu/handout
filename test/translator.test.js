import test from "node:test";
import assert from "node:assert/strict";
import { translateDocument } from "../server/translator.js";

test("sends a structured JSON request to Gemini", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  let requestUrl;
  let requestHeaders;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestHeaders = options.headers;
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: "View of Self / 自我观",
                blocks: [{ type: "heading", english: "Questions", chinese: "问题" }]
              })
            }]
          }
        }]
      })
    };
  };

  try {
    const result = await translateDocument("Questions", {
      apiKey: "test-key",
      model: "test-model"
    });
    assert.match(requestBody.contents[0].parts[0].text, /json/i);
    assert.equal(requestBody.generationConfig.responseMimeType, "application/json");
    assert.match(requestBody.systemInstruction.parts[0].text, /Simplified Chinese/i);
    assert.match(requestUrl, /generativelanguage\.googleapis\.com/);
    assert.equal(requestHeaders["x-goog-api-key"], "test-key");
    assert.equal(result.blocks[0].chinese, "问题");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
