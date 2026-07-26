# Handout Bridge

A local web app that turns English DOCX/PDF sermon notes into editable Simplified Chinese or bilingual Word handouts. Its layout is based on the supplied 2025–2026 handout archive.

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
- Uses official ESV text from Crossway and CUVS text from API.Bible when credentials are configured.
- Allows per-passage ESV/CUVS overrides.
- Translates headings, notes, and discussion questions into Simplified Chinese.
- Provides an editable browser preview.
- Exports bilingual, Chinese-only, or English-only `.docx`.
- Exports matching `.pdf` files through LibreOffice, with every English/Chinese block kept on the same row.
- Runs in no-key demo mode so the UI and export flow work immediately.

## Configure real translation and scripture

Copy `.env.example` to `.env` and load it through your shell or process manager.

- `OPENAI_API_KEY`: enables production-quality Simplified Chinese translation.
- `OPENAI_MODEL`: optional model override.
- `ESV_API_TOKEN`: Crossway ESV API token.
- `API_BIBLE_KEY`: API.Bible key.
- `API_BIBLE_CUVS_ID`: the CUVS Bible ID available to your API.Bible account.
- `SOFFICE_PATH`: optional path to LibreOffice's `soffice` executable for PDF export.

When scripture credentials are absent, paste authoritative ESV/CUVS text into the passage override fields. The app deliberately does not scrape BibleGateway or silently substitute a different translation.

PDF export requires [LibreOffice](https://www.libreoffice.org/). On macOS the standard application path is detected automatically. For a custom installation, set `SOFFICE_PATH`.

ESV API use is subject to Crossway's quotation, attribution, caching, and non-commercial-use terms. Review notices returned by each provider before distributing a generated handout.

## Checks

```bash
npm run check
```
