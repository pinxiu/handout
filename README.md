# Handout Bridge

A local web app that turns structured English DOCX/PDF handouts into editable Simplified Chinese or bilingual handouts. Its layout is based on the supplied 2025–2026 handout archive.

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The API runs on `http://localhost:4174`.

For a production-style local run:

```bash
npm run build
npm start
```

Open `http://localhost:4174`.

## Features

- Imports `.docx` and text-based `.pdf` files up to 20 MB.
- Detects common English Bible references.
- Uses official ESV text from Crossway and public-domain CUV text from Bible API, converting the latter from Traditional to Simplified Chinese.
- Allows per-passage Bible-text overrides. An override must contain the complete verse text, not only a translation/version name.
- Translates headings, notes, and discussion questions into Simplified Chinese.
- Makes every generated translation and Bible passage editable before export.
- Exports bilingual, Chinese-only, or English-only `.docx`.
- Exports matching `.pdf` files directly, without LibreOffice.
- Supports portrait and landscape output, with each English/Chinese block kept at the same vertical level.
- Runs in no-key demo mode so the UI and export flow work immediately.

## Configure real translation and scripture

Copy `.env.example` to `.env` and load it through your shell or process manager.

- `GEMINI_API_KEY`: enables production-quality Simplified Chinese translation through Google Gemini.
- `GEMINI_MODEL`: optional model override; defaults to `gemini-3.6-flash`.
- `ESV_API_TOKEN`: Crossway ESV API token.

Chinese scripture does not require an API key. It is fetched from [Bible API](https://bible-api.com/) using the `cuv` translation and converted to Simplified Chinese locally. When the ESV credential is absent—or when a different Bible translation is wanted—paste the complete authoritative verse text into the relevant override field.

ESV API use is subject to Crossway's quotation, attribution, caching, and non-commercial-use terms. Review notices returned by each provider before distributing a generated handout.

## Checks

```bash
npm run check
```
