const fs = await import('fs');

// Read the full draft we saved
const fullText = await fs.promises.readFile('./debug/full_draft_gd01.txt', 'utf8');

console.log('Full text length:', fullText.length);
console.log('---');

// Look for the date context area
const dateIndex = fullText.toLowerCase().indexOf('2023-10-15');
if (dateIndex !== -1) {
  const start = Math.max(0, dateIndex - 100);
  const end = Math.min(fullText.length, dateIndex + 100);
  console.log('Context around date (2023-10-15):');
  console.log(JSON.stringify(fullText.substring(start, end)));
  console.log('');
}

// Look for the location context area
const locationIndex = fullText.toLowerCase().indexOf('rodovia anchieta');
if (locationIndex !== -1) {
  const start = Math.max(0, locationIndex - 100);
  const end = Math.min(fullText.length, locationIndex + 100);
  console.log('Context around location (Rodovia Anchieta):');
  console.log(JSON.stringify(fullText.substring(start, end)));
  console.log('');
}

// Search for any numbers that might be speeds
console.log('Searching for potential speed-related numbers:');
const speedRelatedPatterns = [
  /\b\d{2,3}\s*km\/h\b/i,
  /\b\d{2,3}\s*quilômetros\/hora\b/i,
  /\bvelocidade\s*:?\s*\d{2,3}\b/i,
  /\blimite\s*:?\s*\d{2,3}\b/i,
  /\b\d{2,3}\s*[,;]\s*km\/h\b/i
];

for (const pattern of speedRelatedPatterns) {
  const matches = fullText.match(pattern);
  if (matches) {
    console.log(`  Pattern ${pattern}:`);
    console.log(`    Matches: ${matches.map(m => `"${m}"`).join(', ')}`);
  }
}

// Look for sections that might contain speed info (like in arguments)
console.log('\nLooking for argument sections:');
const argumentSections = [
  'II - DAS PRELIMINARES',
  'III - DO MÉRITO',
  'ARG-',
  'ARGUMENTO'
];

for (const section of argumentSections) {
  const index = fullText.indexOf(section);
  if (index !== -1) {
    const start = Math.max(0, index - 50);
    const end = Math.min(fullText.length, index + 200);
    console.log(`  Found "${section}" at index ${index}:`);
    console.log(`    "...${fullText.substring(start, end)}..."`);
    console.log('');
  }
}