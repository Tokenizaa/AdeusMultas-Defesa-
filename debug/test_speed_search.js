const fs = await import('fs');

// Read the full draft we saved
const fullText = await fs.promises.readFile('./debug/full_draft_gd01.txt', 'utf8');

console.log('Full text length:', fullText.length);
console.log('---');

// Search for the specific speed values we expect
const expectedSpeeds = [80, 95, 91]; // limit, measured, considered

console.log('Searching for exact speed numbers:');
for (const speed of expectedSpeeds) {
  const speedStr = speed.toString();
  const indices = [];
  let pos = fullText.indexOf(speedStr);
  while (pos !== -1) {
    indices.push(pos);
    pos = fullText.indexOf(speedStr, pos + 1);
  }
  
  console.log(`  ${speed}: found at indices ${indices.length > 0 ? indices.join(', ') : 'none'}`);
  
  if (indices.length > 0) {
    // Show first few contexts
    for (let i = 0; i < Math.min(indices.length, 3); i++) {
      const start = Math.max(0, indices[i] - 20);
      const end = Math.min(fullText.length, indices[i] + speedStr.length + 20);
      const context = fullText.substring(start, end);
      console.log(`    Context ${i+1}: "...${context}..."`);
    }
  }
}

// Also search for these numbers with common prefixes/suffixes that might appear in the document
console.log('\nSearching for speed numbers with common contexts:');
const speedVariants = [80, 95, 91];
const prefixes = ['', ' ', '= ', ': ', 'limite ', 'medida ', 'considerada '];
const suffixes = ['', ' ', ' km/h', ' ', ':', ';', ','];

for (const speed of speedVariants) {
  const speedStr = speed.toString();
  let found = false;
  
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      const searchStr = prefix + speedStr + suffix;
      if (fullText.includes(searchStr)) {
        console.log(`  Found "${searchStr}"`);
        found = true;
        // Show context
        const index = fullText.indexOf(searchStr);
        const start = Math.max(0, index - 20);
        const end = Math.min(fullText.length, index + searchStr.length + 20);
        console.log(`    Context: "...${fullText.substring(start, end)}..."`);
        break;
      }
    }
    if (found) break;
  }
  
  if (!found) {
    console.log(`  No contextual match found for ${speed}`);
  }
}