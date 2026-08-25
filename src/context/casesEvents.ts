/**
 * casesEvents — canal mínimo de invalidação de cache de casos (sem libs novas).
 *
 * Problema resolvido (FIX 2): `App.tsx` carrega `/api/cases` uma única vez no
 * mount; após o wizard criar/atualizar um caso (POST /api/cases), dashboard e
 * listagem continuavam exibindo o estado stale ("0 processos") até reload.
 *
 * Contrato:
 *  - PRODUTORES: qualquer componente que persistir/mutar caso no servidor
 *    dispara `emitCasesChanged()` após o sucesso da operação;
 *  - CONSUMIDOR: `App.tsx` escuta o evento e refaz o fetch canônico
 *    (`loadCases`), refletindo imediatamente em /dashboard, /cases e /admin/*.
 */
export const CASES_CHANGED_EVENT = 'defesai:cases-changed';

export function emitCasesChanged(): void {
  window.dispatchEvent(new CustomEvent(CASES_CHANGED_EVENT));
}
