import fs from 'fs';
import path from 'path';

const { en } = await import('../src/i18n/translations/en.js');
const { mr } = await import('../src/i18n/translations/mr.js');

function getAllFiles(dir, ext = '.jsx') {
  let files = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(full, ext));
    } else if (full.endsWith(ext)) {
      files.push(full);
    }
  }
  return files;
}

const files = getAllFiles('./src');
const dynamicCalls = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('t(')) {
      // Find what is inside t(...)
      const match = line.match(/t\(([^)]+)\)/g);
      if (match) {
        match.forEach(m => {
          if (m.includes('$') || !m.includes("'") && !m.includes('"')) {
            dynamicCalls.push({ file: path.basename(file), line: idx + 1, call: m });
          }
        });
      }
    }
  });
}

console.log('Dynamic t() calls found:', dynamicCalls.length);
dynamicCalls.forEach(d => console.log(`${d.file}:${d.line} -> ${d.call}`));
