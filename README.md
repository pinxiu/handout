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
- Uploads the editable output to Google Drive, converts it to a native Google Doc,
  and opens it directly.
- Supports portrait and landscape output, with each English/Chinese block kept at the same vertical level.
- Offers separate English and Chinese font selectors.
- Can request the complete local font list from browsers that support the Local Font Access API.
- Supports optional titles, custom left/right running headers, and configurable page-number position and style, including no page number.
- Includes a reference-derived compact landscape preset plus adjustable margins, body/heading/header sizes, question answer space, and notes space.
- Provides independent English and Chinese line-spacing controls and a paired-block gap control; the reference preset defaults to compact questions with no forced answer gap.
- Generates content-aware left/right header suggestions that the user can accept individually.
- Formats detected Bible verse numbers as bold superscript.
- Uses the compact, borderless two-column style found in the supplied handout archive.
- Requires Gemini for handout translation and never substitutes stub/demo translations.

## Configure real translation and scripture

Copy `.env.example` to `.env` and load it through your shell or process manager.

- `GEMINI_API_KEY`: enables production-quality Simplified Chinese translation through Google Gemini.
- `GEMINI_MODEL`: optional model override; defaults to `gemini-3.6-flash`.
- `ESV_API_TOKEN`: Crossway ESV API token.
- `GOOGLE_CLIENT_ID`: Google OAuth 2.0 Web client ID for one-click Google Docs conversion.

For Google Docs, enable the Google Drive API, create an OAuth 2.0 **Web
application** client, and add `http://localhost:4174` to its authorized JavaScript
origins. The app requests the limited `drive.file` scope, so it can access only
files created through Handout Bridge.

Chinese scripture does not require an API key. It is fetched from [Bible API](https://bible-api.com/) using the `cuv` translation and converted to Simplified Chinese locally. When the ESV credential is absent—or when a different Bible translation is wanted—paste the complete authoritative verse text into the relevant override field.

ESV API use is subject to Crossway's quotation, attribution, caching, and non-commercial-use terms. Review notices returned by each provider before distributing a generated handout.

## Checks

```bash
npm run check
```
