// Bulk-uploads every PDF in a local folder into the corpus, one after
// another — chunked and embedded automatically. This is the shortcut
// for handling "many documents": drop PDFs into one folder, run this
// once, done. No per-file PowerShell commands needed.
//
// Usage:
//   1. Create a folder (e.g. ./corpus-pdfs) and put your PDF files in it.
//   2. Log in via the API and copy your token.
//   3. Run: node scripts/bulkUploadFolder.js <your-token> <folder-path>
//      Example: node scripts/bulkUploadFolder.js eyJhbGci... ./corpus-pdfs
//
// Each file's name (without .pdf) is used as its title, and "source" is
// set to "Bulk upload" — edit titleFor()/SOURCE_LABEL below if you want
// different naming.

import { readdir, readFile } from "fs/promises";
import path from "path";

const BASE_URL = "http://127.0.0.1:8080";
const SOURCE_LABEL = "Bulk upload";

function titleFor(filename) {
  return path.basename(filename, path.extname(filename)).replace(/[-_]+/g, " ");
}

async function uploadAndProcess(token, filePath) {
  const filename = path.basename(filePath);
  const title = titleFor(filename);

  console.log(`\n${filename}`);
  const fileBuffer = await readFile(filePath);

  const form = new FormData();
  form.append("title", title);
  form.append("source", SOURCE_LABEL);
  form.append("file", new Blob([fileBuffer], { type: "application/pdf" }), filename);

  const uploadResponse = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadResult = await uploadResponse.json();
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResult.error}`);
  }
  console.log(`  uploaded (${uploadResult.textLength} chars)`);

  const processResponse = await fetch(`${BASE_URL}/api/process/${uploadResult.id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const processResult = await processResponse.json();
  if (!processResponse.ok) {
    throw new Error(`Processing failed: ${processResult.error}`);
  }
  console.log(`  processed — ${processResult.chunksCreated} chunks`);
}

async function main() {
  const token = process.argv[2];
  const folderPath = process.argv[3];

  if (!token || !folderPath) {
    console.error("Usage: node scripts/bulkUploadFolder.js <your-auth-token> <folder-path>");
    process.exit(1);
  }

  const allFiles = await readdir(folderPath);
  const pdfFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.error(`No .pdf files found in ${folderPath}`);
    process.exit(1);
  }

  console.log(`Found ${pdfFiles.length} PDF(s) in ${folderPath}. Uploading...`);

  let succeeded = 0;
  for (const file of pdfFiles) {
    try {
      await uploadAndProcess(token, path.join(folderPath, file));
      succeeded++;
    } catch (err) {
      // One bad file shouldn't stop the rest of the batch.
      console.error(`  FAILED: ${err.message}`);
    }
  }

  console.log(`\nDone. ${succeeded}/${pdfFiles.length} documents added to the corpus.`);
}

main();