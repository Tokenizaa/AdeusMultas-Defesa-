const fs = await import('fs');

// Read the full draft we saved
const fullText = await fs.promises.readFile('./debug/full_draft_gd01.txt', 'utf8');

console.log('Full text length:', fullText.length);
console.log('---');

// Test for speed values from the infraction
const infractionData = {
  speedLimit: 80,
  measuredSpeed: 95,
  consideredSpeed: 91  // after 5% tolerance
};

console.log('Checking for speed values:');
for (const [type, value] of Object.entries(infractionData)) {
  const valueStr = value.toString();
  const index = fullText.indexOf(valueStr);
  console.log(`  ${type}: ${valueStr} -> found at index ${index}`);
  if (index !== -1) {
    // Show context
    const start = Math.max(0, index - 20);
    const end = Math.min(fullText.length, index + valueStr.length + 20);
    console.log(`    Context: "...${fullText.substring(start, end)}..."`);
  }
}

// Also check for common speed-related phrases in Portuguese
console.log('\nChecking for Portuguese speed-related terms:');
const portugueseTerms = [
  'km/h',
  'quilômetros por hora',
  'velocidade',
  'limite',
  'medida',
  'considerada'
];

for (const term of portugueseTerms) {
  const index = fullText.toLowerCase().indexOf(term.toLowerCase());
  console.log(`  '${term}': found at index ${index}`);
  if (index !== -1) {
    // Show context
    const start = Math.max(0, index - 20);
    const end = Math.min(fullText.length, index + term.length + 20);
    console.log(`    Context: "...${fullText.substring(start, end)}..."`);
  }
}