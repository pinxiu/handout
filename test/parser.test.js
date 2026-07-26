import test from "node:test";
import assert from "node:assert/strict";
import { detectReferences, normalize } from "../server/parser.js";
test("detects and deduplicates common scripture references",()=>{assert.deepEqual(detectReferences("Read John 3:16-18, then John 3:16-18 and 2 Corinthians 5:14."),["John 3:16-18","2 Corinthians 5:14"]);});
test("normalizes excess whitespace without flattening paragraphs",()=>{assert.equal(normalize("Title  \r\n\r\n\r\nBody \t\r\n"),"Title\n\nBody");});
