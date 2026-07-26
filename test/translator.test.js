import test from "node:test";
import assert from "node:assert/strict";
import { translateDocument } from "../server/translator.js";

test("includes an explicit JSON request in Responses API input", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          title: "View of Self / 自我观",
          blocks: [{ type: "heading", english: "Questions", chinese: "问题" }]
        })
      })
    };
  };

  try {
    const result = await translateDocument("Questions", {
      apiKey: "test-key",
      model: "test-model"
    });
    assert.match(requestBody.input, /json/i);
    assert.equal(requestBody.text.format.type, "json_object");
    assert.equal(result.blocks[0].chinese, "问题");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
