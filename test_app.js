const fs = require('fs');
const path = require('path');

const jsFiles = [
  'js/storage.js',
  'js/detail-modal.js',
  'js/tree-view.js',
  'js/test-mode.js',
  'js/app.js',
  'sw.js'
];

console.log('--- 1. Testing JavaScript Files Syntax ---');
jsFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const code = fs.readFileSync(fullPath, 'utf8');
  try {
    new Function(code);
    console.log('✓ Syntax OK:', file);
  } catch (err) {
    console.error('✗ Syntax Error in', file, ':', err.message);
    process.exit(1);
  }
});

console.log('\n--- 2. Testing hanja.json Database ---');
const hanjaPath = path.join(__dirname, 'data', 'hanja.json');
const hanjaData = JSON.parse(fs.readFileSync(hanjaPath, 'utf8'));

let totalHanja = 0;
hanjaData.branches.forEach((b, idx) => {
  totalHanja += b.characters.length;
});
console.log(`Hanja: ${hanjaData.branches.length} branches, ${totalHanja} characters`);

console.log('\n--- 3. Testing kanji.json Database ---');
const kanjiPath = path.join(__dirname, 'data', 'kanji.json');
const kanjiData = JSON.parse(fs.readFileSync(kanjiPath, 'utf8'));

let totalKanji = 0;
kanjiData.branches.forEach((b, idx) => {
  totalKanji += b.characters.length;
});
console.log(`Kanji: ${kanjiData.branches.length} branches, ${totalKanji} characters`);

const grandTotal = totalHanja + totalKanji;
console.log('\n=======================================');
console.log(`GRAND TOTAL CHARACTERS: ${grandTotal} (${totalHanja} Hanja + ${totalKanji} Kanji)`);
if (grandTotal >= 500) {
  console.log('✓ Requirement met: Over 500 characters loaded successfully!');
} else {
  console.error('✗ Less than 500 characters:', grandTotal);
  process.exit(1);
}
console.log('=======================================');
