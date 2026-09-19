import { mdToPdf } from 'md-to-pdf';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const md = path.join(__dirname, 'azimut-description-complete.md');
const pdfDocs = path.join(__dirname, 'Azimut_Description_Complete_V3.pdf');
const pdfAlias = path.join(__dirname, 'azimut-description-complete.pdf');
const pdfPostAudit = path.join(__dirname, 'Azimut_Description_Complete_PostAudit.pdf');
const downloads = path.join(os.homedir(), 'Downloads', 'Azimut_Description_Complete_V3.pdf');

const chromeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const executablePath = chromeCandidates.find((p) => p && fs.existsSync(p));

const result = await mdToPdf(
  { path: md },
  {
    dest: pdfDocs,
    pdf_options: {
      format: 'A4',
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      printBackground: true,
    },
    stylesheet: path.join(__dirname, 'pdf-style.css'),
    launch_options: executablePath
      ? { executablePath, args: ['--no-sandbox'] }
      : undefined,
  },
);

if (!result) {
  console.error('PDF generation failed');
  process.exit(1);
}

fs.copyFileSync(pdfDocs, pdfAlias);
fs.copyFileSync(pdfDocs, pdfPostAudit);
fs.copyFileSync(pdfDocs, downloads);
console.log('OK', pdfDocs);
console.log('OK', downloads);

try {
  execSync(`start "" "${downloads}"`, { shell: true, stdio: 'ignore' });
} catch {
  /* ignore */
}
