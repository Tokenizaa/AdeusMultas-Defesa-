/**
 * Cliente NVIDIA NIM — ÚNICA fonte de IA do worker.
 * Endpoint: https://integrate.api.nvidia.com/v1 (OpenAI-compatível API da NIM).
 * Chaves somente via secrets do Cloudflare (nunca vars/config).
 */

export interface NvidiaEnv {
  NVIDIA_API_KEY?: string;
  NVIDIA_API_KEY_2?: string;
  NVIDIA_API_KEY_3?: string;
  NVIDIA_BASE_URL?: string;
}

const BASE = 'https://integrate.api.nvidia.com/v1';

/** 3 chaves round-robin (padrão do projeto). */
function pickKey(env: NvidiaEnv): string {
  const keys = [env.NVIDIA_API_KEY, env.NVIDIA_API_KEY_2, env.NVIDIA_API_KEY_3].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error('NVIDIA_API_KEY não configurada. Configure o secret no Cloudflare.');
  return keys[Math.floor(Math.random() * keys.length)];
}

export interface NvidiaChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

/** Chat completion via NIM (texto). */
export async function nvidiaChat(
  env: NvidiaEnv,
  opts: { model?: string; messages: NvidiaChatMessage[]; temperature?: number; maxTokens?: number },
): Promise<string> {
  const key = pickKey(env);
  const base = env.NVIDIA_BASE_URL || BASE;
  const model = opts.model || 'nvidia/llama-3.1-nemotron-70b-instruct';

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 800,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`NVIDIA NIM ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}