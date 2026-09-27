const fs = await import('fs');

// Read the full draft we saved
const fullText = await fs.promises.readFile('./debug/full_draft_gd01.txt', 'utf8');

console.log('Full text length:', fullText.length);
console.log('First 500 chars:');
console.log(fullText.substring(0, 500));
console.log('\n---\n');

// Test the facts we're looking for
const testFacts = [
  'Vehicle was traveling at 91 km/h',
  'Speed limit was 80 km/h',
  'Infraction occurred on 2023-10-15 at 08:30',
  'Location: Rodovia Anchieta, km 45',
  'Radar equipment DECUTRAN123 was calibrated on 2023-09-01'
];

function containsIgnoreCase(str, substr) {
  return str.toLowerCase().includes(substr.toLowerCase());
}

for (const fact of testFacts) {
  const found = containsIgnoreCase(fullText, fact);
  console.log(`Fact: "${fact}"`);
  console.log(`  Found: ${found}`);
  if (!found) {
    // Show what we're looking for in lowercase
    console.log(`  Looking for (lower): "${fact.toLowerCase()}"`);
    // Find where similar text might be
    const lowerText = fullText.toLowerCase();
    const factLower = fact.toLowerCase();
    
    // Check for key components
    if (fact.includes('91 km/h')) {
      const speed91Index = lowerText.indexOf('91 km/h');
      console.log(`  '91 km/h' found at index: ${speed91Index}`);
      if (speed91Index !== -1) {
        console.log(`  Context: "${lowerText.substring(Math.max(0, speed91Index - 20), speed91Index + 30)}"`);
      }
    }
    if (fact.includes('80 km/h')) {
      const speed80Index = lowerText.indexOf('80 km/h');
      console.log(`  '80 km/h' found at index: ${speed80Index}`);
      if (speed80Index !== -1) {
        console.log(`  Context: "${lowerText.substring(Math.max(0, speed80Index - 20), speed80Index + 30)}"`);
      }
    }
    if (fact.includes('2023-10-15')) {
      const dateIndex = lowerText.indexOf('2023-10-15');
      console.log(`  '2023-10-15' found at index: ${dateIndex}`);
      if (dateIndex !== -1) {
        console.log(`  Context: "${lowerText.substring(Math.max(0, dateIndex - 20), dateIndex + 30)}"`);
      }
    }
    if (fact.includes('Rodovia Anchieta')) {
      const locationIndex = lowerText.indexOf('rodovia anchieta');
      console.log(`  'rodovia anchieta' found at index: ${locationIndex}`);
      if (locationIndex !== -1) {
        console.log(`  Context: "${lowerText.substring(Math.max(0, locationIndex - 20), locationIndex + 30)}"`);
      }
    }
  }
  console.log('');
}