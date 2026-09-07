import { useCallback } from 'react';
import { authFetch } from '../lib/authFetch';

/**
 * useAuthFetch — hook React que retorna o wrapper `authFetch` (ver
 * src/lib/authFetch.ts) com identidade da sessão injetada.
 *
 * Comportamento anônimo PRESERVADO: sem sessão, nenhum header é adicionado
 * e a chamada é idêntica a um fetch normal (sem retry/timeout extras).
 */
export function useAuthFetch() {
  return useCallback(authFetch, []);
}