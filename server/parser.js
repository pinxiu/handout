import mammoth from "mammoth";
import pdf from "pdf-parse";

export async function extractDocument(file) {
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".docx")) return normalize((await mammoth.extractRawText({ buffer: file.buffer })).value);
  if (name.endsWith(".pdf")) return normalize((await pdf(file.buffer)).text);
  throw new Error("Please upload a .docx or .pdf file.");
}

export function normalize(value) {
  return value.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms?","Proverbs","Ecclesiastes","Song of (?:Solomon|Songs)","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const referencePattern = new RegExp(`\\b(?:${BOOKS.join("|")})\\s+\\d{1,3}(?::\\d{1,3}(?:\\s*[-–—]\\s*\\d{1,3})?)?`, "gi");

export function detectReferences(text) {
  return [...new Set((text.match(referencePattern) || []).map((x) => x.replace(/[–—]/g, "-")))];
}
