/**
 * Verificação executável das 3 correções do scraper-prospecting.
 * Rodar: npx tsx src/scraper-prospecting/scraper-prospecting.test.ts
 * Obs.: arquivo de teste excluído do tsc --noEmit pelo tsconfig.
 */
import assert from 'node:assert/strict';
import { normalizePhone, extractCleanPhone, cleanPhoneFromTel } from './normalizer';
import { buildSeenKeys, isSeen, stillNeedsScroll } from './seen-filter';

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${name}`);
    console.log(`     ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// BUG 1 — normalizePhone: +55/55 e zero inicial de DDD removidos; formato canônico único
// ---------------------------------------------------------------------------
{
  // 11 formatos do MESMO número devem convergir para o canônico "11999999999" (dedup confiável)
  const canonical = '11999999999';
  const formats = [
    '11999999999',
    '(11) 99999-9999',
    '11 99999-9999',
    '+55 11 99999-9999',
    '+55(11)99999-9999',
    '5511999999999',
    '55 11 99999-9999',
    '011999999999', // zero inicial de DDD + celular 9 dígitos
    '0 11 99999-9999',
    '(011) 99999-9999',
    '+55 011 99999-9999', // 0 + 55 + DDD + número
  ];
  for (const f of formats) {
    check(`BUG1 [${f}] -> ${canonical}`, () => {
      assert.equal(normalizePhone(f), canonical);
    });
  }

  // Casos do relatório de auditoria, verbatim
  check('BUG1 auditoria: normalizePhone("5511999999999")', () => {
    assert.equal(normalizePhone('5511999999999'), '11999999999');
  });
  check('BUG1 auditoria: normalizePhone("+55 11 99999-9999")', () => {
    assert.equal(normalizePhone('+55 11 99999-9999'), '11999999999');
  });
  check('BUG1 auditoria: normalizePhone("(11) 99999-9999")', () => {
    assert.equal(normalizePhone('(11) 99999-9999'), '11999999999');
  });

  // Guard: NÃO remover o DDD real 55 (RS/Oeste-SC) quando não é código do país
  check('BUG1 guard: DDD 55 fixo (55 4066-6564) preservado', () => {
    assert.equal(normalizePhone('(55) 4066-6564'), '5540666564');
  });
  check('BUG1 guard: DDD 55 celular preservado', () => {
    assert.equal(normalizePhone('(55) 99999-9999'), '55999999999');
  });
  check('BUG1 guard: +55 + DDD 55 + celular -> DDD 55 puro', () => {
    assert.equal(normalizePhone('+55 (55) 99999-9999'), '55999999999');
  });
}

// ---------------------------------------------------------------------------
// BUG 2 — telefone NUNCA contém texto de horários; apenas dígitos 10-11 ou null
// ---------------------------------------------------------------------------
{
  const leak = 'Aberto · Fecha 18:00 · (51) 4066-6564';
  check(`BUG2 extractCleanPhone("${leak}") === "5140666564"`, () => {
    assert.equal(extractCleanPhone(leak), '5140666564');
  });
  check(`BUG2 resultado não contém "Aberto"/"Fecha"`, () => {
    const out = extractCleanPhone(leak);
    assert.ok(out === null || /^\d{10,11}$/.test(out), `esperado dígitos ou null, veio: ${JSON.stringify(out)}`);
  });
  check('BUG2 cleanPhoneFromTel("tel:+555140666564") === "5140666564"', () => {
    assert.equal(cleanPhoneFromTel('tel:+555140666564'), '5140666564');
  });
  check('BUG2 texto só de horários -> null', () => {
    assert.equal(extractCleanPhone('Aberto · Fecha 18:00 · Fecha sáb 14:00'), null);
  });
  check('BUG2 texto sem telefone -> null', () => {
    assert.equal(extractCleanPhone('Loja de despachante, sem telefone listado'), null);
  });
  check('BUG2 label com horário + 11 dígitos limpo', () => {
    assert.equal(extractCleanPhone('Aberto · Fecha 18:00 · (11) 99999-9999'), '11999999999');
  });
  check('BUG2 href tel com +55 e espaço pode conter horário vizinho -> só dígitos', () => {
    const out = cleanPhoneFromTel('tel:+55 51 4066-6564');
    assert.ok(out === null || /^\d{10,11}$/.test(out));
  });
}

// ---------------------------------------------------------------------------
// BUG 3 — skip de já-coletados (formato canônico) + decisão de avanço de scroll
// ---------------------------------------------------------------------------
{
  // Formato das chaves: idêntico ao carregado do banco (loadExistingScrapedKeys/persister)
  check('BUG3 chave composta casa com chave carregada do banco', () => {
    // banco: phone_normalized já canônico "11999999999", website "exemplo.com"
    const dbLoaded = new Set<string>();
    for (const k of buildSeenKeys('https://maps.google.com/place/A', '11999999999', 'exemplo.com', null)) {
      dbLoaded.add(k);
    }
    // scraper: phone cru "+55 11 99999-9999" -> normaliza para a MESMA chave
    assert.ok(isSeen(dbLoaded, 'https://maps.google.com/place/A', '+55 11 99999-9999', 'Exemplo.com', undefined));
  });

  check('BUG3 URL vista -> skip (isSeen true)', () => {
    const seen = new Set<string>(['url:https://maps.google.com/place/ja-visto']);
    assert.equal(isSeen(seen, 'https://maps.google.com/place/ja-visto'), true);
  });

  check('BUG3 URL nova -> não skip (isSeen false)', () => {
    const seen = new Set<string>(['url:https://maps.google.com/place/ja-visto']);
    assert.equal(isSeen(seen, 'https://maps.google.com/place/novo-negocio'), false);
  });

  check('BUG3 lead novo dentro da mesma run não é marcado como visto antes de coletar', () => {
    const seen = new Set<string>();
    assert.equal(isSeen(seen, 'https://maps.google.com/place/novo'), false);
  });

  check('BUG3 stillNeedsScroll: faltam leads novos -> continuar scrollando', () => {
    assert.equal(stillNeedsScroll(0, 5, 0, 3), true);
    assert.equal(stillNeedsScroll(3, 5, 0, 3), true);
  });
  check('BUG3 stillNeedsScroll: atingiu o alvo -> parar', () => {
    assert.equal(stillNeedsScroll(5, 5, 0, 3), false);
  });
  check('BUG3 stillNeedsScroll: rounds extras esgotados -> parar', () => {
    assert.equal(stillNeedsScroll(0, 5, 3, 3), false);
    assert.equal(stillNeedsScroll(0, 5, 5, 3), false);
  });
  check('BUG3 stillNeedsScroll: requiredNew <= 0 -> nunca scrollar', () => {
    assert.equal(stillNeedsScroll(0, 0, 0, 3), false);
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);