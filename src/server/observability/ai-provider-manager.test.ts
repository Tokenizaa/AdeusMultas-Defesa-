import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configGet: vi.fn(),
  getNextKey: vi.fn(),
  recordAiRequest: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  analyzeTicketWithGemini: vi.fn(),
}));

vi.mock('../config/config-service', () => ({
  configService: { get: mocks.configGet },
}));
vi.mock('../knowledge/nvidia-key-rotator', () => ({
  nvidiaKeyRotator: { getNextKey: mocks.getNextKey },
}));
vi.mock('./logger', () => ({
  logger: { info: mocks.info, warn: mocks.warn, error: mocks.error },
}));
vi.mock('./metrics-service', () => ({
  metricsService: { recordAiRequest: mocks.recordAiRequest },
}));
vi.mock('../gemini', () => ({
  analyzeTicketWithGemini: mocks.analyzeTicketWithGemini,
}));

import { aiProviderManager } from './ai-provider-manager';

const settings: Record<string, unknown> = {
  NVIDIA_BASE_URL: 'https://nvidia.example/v1',
  NVIDIA_CHAT_MODEL: 'nvidia-chat-model',
  NVIDIA_API_KEY: '',
  NINEROUTER_KEY: 'test-nine-router-key',
  NINEROUTER_BASE_URL: 'https://9router.example/v1/',
  NINEROUTER_MODEL: 'nine-router-model',
  AI_ENABLE_FALLBACK: true,
  AI_TEMPERATURE: 0.15,
  GEMINI_API_KEY: '',
};

describe('AiProviderManager 9Router fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configGet.mockImplementation((key: string, fallback?: unknown) =>
      Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallback
    );
    mocks.getNextKey.mockReturnValue('');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the configured 9Router endpoint and records success only after a real response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        choices: [{ message: { content: 'Resposta real do provider' } }],
        usage: { total_tokens: 18 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await aiProviderManager.executeLegalReasoning('prompt de teste', { caseId: 'case-1' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('https://9router.example/v1/chat/completions');
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.method).toBe('POST');
    expect((request.headers as Record<string, string>).Authorization).toBe('Bearer test-nine-router-key');
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: 'nine-router-model',
      messages: [
        { role: 'system' },
        { role: 'user', content: expect.stringContaining('Contexto:') },
      ],
    });
    expect(result).toMatchObject({
      success: true,
      providerUsed: '9router',
      modelUsed: 'nine-router-model',
      data: 'Resposta real do provider',
      fallbackOccurred: true,
    });
    expect(mocks.recordAiRequest).toHaveBeenCalledWith(
      '9router',
      expect.any(Number),
      true,
      { isFallback: true, tokens: 18 }
    );
  });

  it('records an actual provider failure and continues to Gemini without claiming 9Router success', async () => {
    settings.GEMINI_API_KEY = 'configured-gemini-key';
    mocks.analyzeTicketWithGemini.mockResolvedValue({ summary: 'Gemini result' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Unavailable',
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await aiProviderManager.executeLegalReasoning('prompt de teste', {});

    expect(result).toMatchObject({
      success: true,
      providerUsed: 'gemini',
      data: { summary: 'Gemini result' },
      fallbackOccurred: true,
    });
    expect(mocks.recordAiRequest).toHaveBeenCalledWith(
      '9router',
      expect.any(Number),
      false,
      { isFallback: true, error: '9Router HTTP 503: Unavailable' }
    );
    expect(result.stages.find((stage) => stage.provider === '9Router')?.status).toBe('failed');
  });
});
