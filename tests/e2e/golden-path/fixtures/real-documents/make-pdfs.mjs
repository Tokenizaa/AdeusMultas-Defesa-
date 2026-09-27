import { writeFileSync } from 'fs';

// Minimal valid PDF with text content for OCR
const makePDF = (title: string, content: string) => {
  const body = `BT /F1 12 Tf 50 700 Td (${title}) Tj ET`;
  const xref = `0 3
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
`;
  const trailer = `trailer << /Size 3 /Root 1 0 R >>`;
  return `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj << /Length ${body.length} >> stream
${body}
endstream
endobj
xref
${xref}
${trailer}
startxref
${150 + body.length}
%%EOF`;
};

writeFileSync('ait-sample.pdf', makePDF('AIT', 'Auto de Infraccao de Transito Numero: 1234567890 Orgao: DETRAN-SP Placa: ABC1D23'));
writeFileSync('cnh-sample.pdf', makePDF('CNH', 'Carteira Nacional de Habilitacao Nome: Joao da Silva CPF: 123.456.789-00'));
writeFileSync('crlv-sample.pdf', makePDF('CRLV', 'Certificado de Registro e Licenciamento de Veiculo Placa: ABC1D23 Renavam: 12345678901'));
console.log('PDFs created');
