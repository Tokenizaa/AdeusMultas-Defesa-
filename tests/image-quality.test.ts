/**
 * TESTE DO GATE DE QUALIDADE DE IMAGEM
 * Rode: npx tsx tests/image-quality.test.ts
 *
 * Seção A (sempre roda): vetores sintéticos via sharp — nítida passa, borrada reprova,
 * pequena reprova por resolução (minDimension default 500).
 * Seção B (condicional): valida as 7 peças REAIS da campanha inaugural (storage público,
 * Supabase bucket marketing-assets). Esperado (após recalibragem 900→500, review 2026-08-29):
 * 6 utilizáveis (5 de 768x768 + dia6 580x1015 retrato NÍTIDA) PASSAM; só dia3 (580x1015,
 * borrada, nitidez ~63 < 100) reprova. Se o ambiente estiver offline, a seção pula sem falhar.
 */

import assert from 'node:assert';
import sharp from 'sharp';
import { validateImageQuality } from '../src/server/services/image-quality.service';

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s & 0xff;
  };
}

/** Renderiza ruído determinístico em escala de cinza como PNG */
async function renderGrayNoise(size: number, seed: number): Promise<Buffer> {
  const rand = lcg(seed);
  const gray = new Uint8Array(size * size);
  for (let i = 0; i < gray.length; i++) gray[i] = rand();
  return sharp(Buffer.from(gray), { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toBuffer();
}

async function main() {
  let failures = 0;
  const check = (name: string, cond: boolean, detail = '') => {
    if (cond) {
      console.log(`  [PASS] ${name}`);
    } else {
      failures++;
      console.error(`  [FAIL] ${name} ${detail}`);
    }
  };

  // ── Seção A: vetores sintéticos ────────────────────────────────────────
  console.log('\n=== A) Vetores sintéticos (sharp) ===');

  const sharpImg = await renderGrayNoise(1024, 42);
  const blurImg = await sharp(sharpImg).blur(20).png().toBuffer();
  const smallImg = await renderGrayNoise(400, 7);

  const sharpResult = await validateImageQuality({ buffer: sharpImg });
  check(
    'imagem nítida passa',
    sharpResult.pass === true && sharpResult.failureKind === null,
    JSON.stringify({ score: sharpResult.score, reasons: sharpResult.reasons, metrics: sharpResult.metrics })
  );
  check('nítida: sharpness >= limiar', sharpResult.metrics.sharpness >= 100, `sharpness=${sharpResult.metrics.sharpness}`);

  const blurResult = await validateImageQuality({ buffer: blurImg });
  check(
    'imagem borrada reprova (quality)',
    blurResult.pass === false && blurResult.failureKind === 'quality' && blurResult.reasons.includes('blurred'),
    JSON.stringify({ score: blurResult.score, reasons: blurResult.reasons, sharpness: blurResult.metrics.sharpness })
  );
  check('borrada: sharpness < limiar', blurResult.metrics.sharpness < 100, `sharpness=${blurResult.metrics.sharpness}`);

  const smallResult = await validateImageQuality({ buffer: smallImg });
  check(
    'imagem < 500px reprova por resolução',
    smallResult.pass === false && smallResult.reasons.includes('resolution_too_low'),
    JSON.stringify({ width: smallResult.metrics.width, reasons: smallResult.reasons })
  );

  // ── Seção B: peças reais da campanha inaugural (condicional) ───────────
  const CAMPAIGN_PIECES: { id: string; label: string; url: string }[] = [
    { id: '17e1f2ef-e775-4478-b4e6-38cfa960eb9f', label: 'Dia 1 - Apresentacao', url: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/17e1f2ef-e775-4478-b4e6-38cfa960eb9f_dia1.png' },
    { id: '6d246b93-d6e7-466d-a2d5-b1a2efdd1324', label: 'Dia 2 - 5 erros', url: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/6d246b93-d6e7-466d-a2d5-b1a2efdd1324_dia2.png' },
    { id: '40bd46d6-12ed-41df-a41e-d6e1ec62db64', label: 'Dia 3 - O que fazer primeiro', url: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/40bd46d6-12ed-41df-a41e-d6e1ec62db64_dia3.png' },
    { id: '22bd4696-1feb-4465-a640-577fc356e9b3', label: 'Dia 4 - Mito ou verdade', url: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/22bd4696-1feb-4465-a640-577fc356e9b3_dia4.png' },
    { id: 'e8e498f4-509d-4e7c-902e-2f0aac56cbdd', label: 'Dia 5 - Checklist', url: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/e8e498f4-509d-4e7c-902e-2f0aac56cbdd_dia5.png' },
    { id: 'be623f95-af80-425b-b60a-45b0e8e76a2d', label: 'Dia 6 - 3 pontos', url: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/be623f95-af80-425b-b60a-45b0e8e76a2d_dia6.png' },
    { id: '5d26abae-fc97-418a-a8ec-ebde0ee4cae3', label: 'Dia 7 - Veja como ajudar', url: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/5d26abae-fc97-418a-a8ec-ebde0ee4cae3_dia7.png' },
  ];

  console.log('\n=== B) Peças reais da campanha inaugural ===');
  let offline = false;
  const rows: { label: string; w: number; h: number; lum: number; sharp: number; pass: boolean; reasons: string[] }[] = [];
  for (const piece of CAMPAIGN_PIECES) {
    const result = await validateImageQuality({ imageUrl: piece.url });
    if (result.failureKind === 'fetch') {
      offline = true;
      console.log(`  [SKIP] ${piece.label} — download falhou (offline?); seção B pulada`);
      break;
    }
    rows.push({
      label: piece.label,
      w: result.metrics.width,
      h: result.metrics.height,
      lum: result.metrics.luminance,
      sharp: result.metrics.sharpness,
      pass: result.pass,
      reasons: result.reasons,
    });
  }

  if (!offline) {
    console.log('  label | width | height | luminance | sharpness | pass | reasons');
    for (const r of rows) {
      console.log(`  ${r.label} | ${r.w} | ${r.h} | ${r.lum} | ${r.sharp} | ${r.pass} | ${r.reasons.join(';') || '-'}`);
    }
    // Após recalibragem minDimension 500 (review 2026-08-29): 6 peças utilizáveis passam
    // (5 de 768x768 + dia6 580x1015 retrato NÍTIDA sharpness 977); só dia3 (580x1015,
    // genuinamente borrada, sharpness ~63 < limiar 100) reprova.
    check('7 peças avaliadas', rows.length === 7, `rows=${rows.length}`);
    check('peças utilizáveis passam (6/7)', rows.filter((r) => r.pass).length === 6, JSON.stringify(rows.map((r) => ({ label: r.label, pass: r.pass, reasons: r.reasons }))));
    check('exatamente 1 reprova (dia3)', rows.filter((r) => !r.pass).length === 1, JSON.stringify(rows.filter((r) => !r.pass)));
    const dia3 = rows[2];
    check('dia3 reprova por nitidez (blurred)', dia3 ? dia3.reasons.includes('blurred') : false, JSON.stringify(dia3));
  }

  // ── Seção C: menu de falhas (failureKind) ─────────────────────────────
  console.log('\n=== C) Menu de falhas: failureKind ===');

  // fetch falho: porta fechada em localhost — conexão recusada imediata
  const fetchFail = await validateImageQuality(
    { imageUrl: 'http://127.0.0.1:1/nope.png' },
    { fetchTimeoutMs: 2000 }
  );
  check(
    'fetch falho => failureKind fetch',
    fetchFail.failureKind === 'fetch' && fetchFail.reasons.includes('fetch_failed'),
    JSON.stringify({ failureKind: fetchFail.failureKind, reasons: fetchFail.reasons })
  );

  // decode falho: buffer sem formato de imagem válido
  const decodeFail = await validateImageQuality({ buffer: Buffer.from('isto-nao-e-uma-imagem') });
  check(
    'decode falho => failureKind decode',
    decodeFail.failureKind === 'decode' && decodeFail.reasons.includes('decode_failed'),
    JSON.stringify({ failureKind: decodeFail.failureKind, reasons: decodeFail.reasons })
  );

  // sem entrada: nem url nem buffer
  const noInput = await validateImageQuality({} as any);
  check(
    'sem input => failureKind fetch (fail-open, não quality)',
    noInput.failureKind === 'fetch' && noInput.reasons.includes('no_input'),
    JSON.stringify({ failureKind: noInput.failureKind, reasons: noInput.reasons })
  );

  // ── Seção D: limiar de resolução ──────────────────────────────────────
  console.log('\n=== D) Limiar de resolução (minDimension=500) ===');

  const img499 = await renderGrayNoise(499, 21);
  const r499 = await validateImageQuality({ buffer: img499 });
  check(
    '499px reprova resolução (limiar -1)',
    r499.pass === false && r499.reasons.includes('resolution_too_low'),
    JSON.stringify({ w: r499.metrics.width, pass: r499.pass, reasons: r499.reasons })
  );

  const img500 = await renderGrayNoise(500, 22);
  const r500 = await validateImageQuality({ buffer: img500 });
  check(
    '500px passa (limiar exato: >= 500 vale)',
    r500.pass === true && !r500.reasons.includes('resolution_too_low'),
    JSON.stringify({ w: r500.metrics.width, pass: r500.pass, reasons: r500.reasons })
  );

  const img501 = await renderGrayNoise(501, 23);
  const r501 = await validateImageQuality({ buffer: img501 });
  check(
    '501px passa resolução',
    r501.pass === true,
    JSON.stringify({ w: r501.metrics.width, pass: r501.pass, reasons: r501.reasons })
  );

  // assimétrico: largura OK (500) mas altura abaixo (400) => reprova (OR)
  const imgAsym = await sharp(await renderGrayNoise(500, 24))
    .resize({ width: 500, height: 400, fit: 'fill' })
    .png()
    .toBuffer();
  const rAsym = await validateImageQuality({ buffer: imgAsym });
  check(
    '500x400 reprova (altura abaixo do limiar)',
    rAsym.pass === false && rAsym.reasons.includes('resolution_too_low'),
    JSON.stringify({ w: rAsym.metrics.width, h: rAsym.metrics.height, pass: rAsym.pass, reasons: rAsym.reasons })
  );

  // opção customizada: minDimension baixo aceita imagem 500px
  const rCustom = await validateImageQuality({ buffer: smallImg }, { minDimension: 100 });
  check(
    'minDimension customizado (100) aceita 500px',
    rCustom.pass === true && !rCustom.reasons.includes('resolution_too_low'),
    JSON.stringify({ w: rCustom.metrics.width, pass: rCustom.pass, reasons: rCustom.reasons })
  );

  // ── Seção E: contrato fail-open (fetch/decode NÃO podem bloquear) ─────
  console.log('\n=== E) Contrato fail-open ===');

  check(
    'fetch falho: failureKind !== quality (não bloqueia publicação)',
    fetchFail.failureKind !== 'quality',
    `failureKind=${fetchFail.failureKind}`
  );
  check(
    'decode falho: failureKind !== quality (não bloqueia publicação)',
    decodeFail.failureKind !== 'quality',
    `failureKind=${decodeFail.failureKind}`
  );
  check(
    'decode falho: pass=false + failureKind decode ainda distingue de quality',
    decodeFail.pass === false && decodeFail.failureKind === 'decode' && decodeFail.failureKind !== 'quality',
    JSON.stringify({ pass: decodeFail.pass, failureKind: decodeFail.failureKind })
  );

  // ── Seção F: data: URLs (avaliadas localmente, sem fetch enganoso) ────
  console.log('\n=== F) data: URLs ===');

  const dataPng = await renderGrayNoise(1024, 42);
  const dataB64 = `data:image/png;base64,${dataPng.toString('base64')}`;
  const rDataB64 = await validateImageQuality({ imageUrl: dataB64 });
  check(
    'data: URL base64 (imagem válida) é avaliada de verdade (passa)',
    rDataB64.pass === true && rDataB64.failureKind === null,
    JSON.stringify({ pass: rDataB64.pass, failureKind: rDataB64.failureKind, reasons: rDataB64.reasons, metrics: rDataB64.metrics })
  );

  const rDataSmall = await validateImageQuality({ imageUrl: `data:image/png;base64,${(await renderGrayNoise(100, 5)).toString('base64')}` });
  check(
    'data: URL base64 pequena reprova (resolution_too_low, não data_url_skipped)',
    rDataSmall.pass === false && rDataSmall.failureKind === 'quality' && rDataSmall.reasons.includes('resolution_too_low'),
    JSON.stringify({ pass: rDataSmall.pass, reasons: rDataSmall.reasons, failureKind: rDataSmall.failureKind })
  );

  const rDataMalformed = await validateImageQuality({ imageUrl: 'data:image/png;base64' });
  check(
    'data: URL malformada => skip explícito (pass:true, data_url_skipped) — sem fetch_failed enganoso',
    rDataMalformed.pass === true && rDataMalformed.failureKind === null && rDataMalformed.reasons.includes('data_url_skipped'),
    JSON.stringify({ pass: rDataMalformed.pass, failureKind: rDataMalformed.failureKind, reasons: rDataMalformed.reasons })
  );

  console.log(`\n${failures === 0 ? 'TODOS OS TESTES PASSARAM' : `${failures} ASSERT(S) FALHARAM`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('ERRO FATAL no teste:', err);
  process.exit(1);
});