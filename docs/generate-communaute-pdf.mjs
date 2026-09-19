import { mdToPdf } from 'md-to-pdf';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const md = path.join(__dirname, 'azimut-communaute-beta.md');
const pdf = path.join(__dirname, 'Azimut_Communaute_Beta.pdf');

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
    dest: pdf,
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
console.log('OK', pdf);
