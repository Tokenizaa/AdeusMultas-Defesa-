// Quick test of quality gate procedure compatibility
const PROCEDURE_FAMILY_COMPATIBILITY = {
  excesso_velocidade: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  alcoolemia: ['defesa_previa', 'recurso_jari', 'recurso_cetran', 'suspensao_cnh'],
  semaforo: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  celular: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  estacionamento: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  cinto: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  documentos: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  circulacao: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  capacidade: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  lotacao: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  desconhecida: [],
};

// Test: suspensao_cnh with excesso_velocidade family
const family = 'excesso_velocidade';
const procedure = 'suspensao_cnh';
const allowed = new Set([
  ...(PROCEDURE_FAMILY_COMPATIBILITY[family] ?? []),
  ...(procedure ? [procedure] : []),
]);
console.log('Family:', family);
console.log('Procedure:', procedure);
console.log('Allowed set:', [...allowed]);
console.log('Procedure compatible:', allowed.has(procedure));

// Test: conversao_advertencia with desconhecida family
const family2 = 'desconhecida';
const procedure2 = 'conversao_advertencia';
const allowed2 = new Set([
  ...(PROCEDURE_FAMILY_COMPATIBILITY[family2] ?? []),
  ...(procedure2 ? [procedure2] : []),
]);
console.log('\nFamily:', family2);
console.log('Procedure:', procedure2);
console.log('Allowed set:', [...allowed2]);
console.log('Procedure compatible:', allowed2.has(procedure2));

// Test: conversao_advertencia with excesso_velocidade family
const allowed3 = new Set(['recurso_jari', 'recurso_cetran', 'defesa_previa']);
console.log('\nConversao advertised in excesso_velocidade?', allowed3.has('conversao_advertencia'));