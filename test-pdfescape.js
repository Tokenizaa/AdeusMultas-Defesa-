// Test the pdfEscape function behavior
function pdfEscape(value) {
  const ascii = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[—–]/g, '-').replace(/[^\x20-\x7E\n\r]/g, '?');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

const tests = ['São Paulo', 'Rio de Janeiro', 'José da Silva', 'Mária', 'Êxito', 'teste—atividade', 'teste–valor'];
for (const t of tests) {
  console.log('Input:', t, '-> Output:', pdfEscape(t));
}

// Test wrap function
function wrap(text, max = 92) {
  const lines = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    const words = paragraph.trim().split(/\s+/);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

const longText = 'Este é um texto de teste muito longo para verificar como a função wrap lida com o quebra de linha em documentos PDF de defesa de multas de trânsito. ' + 'Série de teste. '.repeat(10);
const wrapped = wrap(longText, 40);
console.log('\nWrap test:');
console.log('Input length:', longText.length);
console.log('Output lines:', wrapped.length);
console.log('First 3 lines:', wrapped.slice(0, 3).join('\n'));

// Test buildPdf
function buildPdf(title, body) {
  const lines = wrap(body);
  const pages = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  if (!pages.length) pages.push([]);
  const objects = [];
  const add = (value) => { objects.push(value); return objects.length; };
  const catalogId = add('');
  const pagesId = add('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  for (const pageLines of pages) {
    const content = ['BT','/F1 16 Tf','50 770 Td',`(${pdfEscape(title)}) Tj`,'/F1 10 Tf','0 -24 Td',...pageLines.map((line) => `(${pdfEscape(line)}) Tj 0 -14 Td`),'ET'].join('\n');
    const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

const title = 'Adeus Multa - Defesa de Trânsito';
const testBody = 'Este é um texto de teste com acentuação São Paulo Rio de Janeiro em um documento de defesa de multa de trânsito. O(A) Requerente impugna a autuação nº 12345-67.890/2023.';
const pdf = buildPdf(title, testBody);
console.log('\nPDF byte length:', pdf.byteLength);
console.log('PDF starts with:', new TextDecoder().decode(pdf).substring(0, 50));

// Check if PDF is valid
const decoder = new TextDecoder();
const pdfText = decoder.decode(pdf);
console.log('Contains %PDF-1.4:', pdfText.includes('%PDF-1.4'));
console.log('Contains number_ait:', pdfText.includes('número_ait') || pdfText.includes('numero_ait'));
console.log('Contains orao_autuador:', pdfText.includes('{{orgao_autuador}}') || pdfText.includes('orgao_autuador'));
// Check if accents are preserved
console.log('Contains São:', pdfText.includes('São'));

// Check what the escaped version looks like
console.log('\npdfEscape tests:');
console.log('São Paulo:', pdfEscape('São Paulo'));
console.log('Rio de Janeiro:', pdfEscape('Rio de Janeiro'));
console.log('José:', pdfEscape('José'));
console.log('Mária:', pdfEscape('Mária'));
console.log('teste—atividade:', pdfEscape('teste—atividade'));