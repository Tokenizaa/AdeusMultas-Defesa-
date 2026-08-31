const fs = require('fs');
function scan(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const stack = [];
  const mis = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(re)) {
      const [, sl, tag, , self] = m;
      if (sl) {
        const top = stack.pop();
        if (!top || top[0] !== tag) mis.push(`MISMATCH close ${tag}@${i + 1} stacktop ${JSON.stringify(top)}`);
      } else if (!self) {
        stack.push([tag, i + 1]);
      }
    }
  }
  console.log(file);
  console.log('  open:', stack.length, 'leftover:', JSON.stringify(stack.slice(-8)));
  mis.slice(0, 10).forEach((m) => console.log('  ' + m));
}
scan(process.argv[2]);
if (process.argv[3]) scan(process.argv[3]);