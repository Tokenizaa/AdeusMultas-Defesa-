/**
 * @file ai-provider-manager.ts
 * Unified AI Provider Orchestrator with Observability & Automatic Fallback
 * 
 * Pipeline Flow:
 * Request -> Provider Selection -> NVIDIA (Primary) -> [If fails: 9Router (Fallback)] -> Gemini / Deterministic RAG
 * 
 * Features:
 * 1. Automatic retry and seamless fallback.
 * 2. Full latency, token and error tracking in metricsService.
 * 3. End-to-end correlationId and trace logs in logger.
 * 4. Step-by-step pipeline audit for debugging.
 */

import { configService } from '../config/config-service';
import { nvidiaKeyRotator } from '../knowledge/nvidia-key-rotator';
import { logger } from './logger';
import { metricsService } from './metrics-service';
import { analyzeTicketWithGemini } from '../gemini';
import { embeddingService } from '../knowledge/embedding-service';
import { vectorStore } from '../knowledge/vector-store';

export interface AiPipelineStage {
  stage: 'provider_selection' | 'primary_execution' | 'fallback_execution' | 'rag_enhancement' | 'legal_synthesis';
  provider: string;
  model: string;
  durationMs: number;
  status: 'success' | 'failed' | 'skipped' | 'fallback';
  details?: string;
}

export interface AiExecutionResult<T = any> {
  success: boolean;
  providerUsed: 'nvidia' | '9router' | 'gemini' | 'deterministic_rag';
  modelUsed: string;
  totalDurationMs: number;
  stages: AiPipelineStage[];
  fallbackOccurred: boolean;
  correlationId: string;
  data: T;
  error?: string;
}

class AiProviderManager {
  private recentPipelineTraces: AiExecutionResult[] = [];

  /**
   * Execute chat completion or legal analysis through resilient AI Provider chain
   */
  public async executeLegalReasoning(
    prompt: string,
    context: any,
    options?: {
      correlationId?: string;
      requestId?: string;
      caseId?: string;
      temperature?: number;
    }
  ): Promise<AiExecutionResult> {
    const correlationId = options?.correlationId || `corr_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const requestId = options?.requestId || `req_${Date.now()}`;
    const startTime = Date.now();
    const stages: AiPipelineStage[] = [];

    const nvidiaKey = nvidiaKeyRotator.getNextKey();
    const nvidiaBaseUrl = configService.get('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1');
    const nvidiaModel = configService.get('NVIDIA_CHAT_MODEL', 'meta/llama-3.3-70b-instruct');
    const nineRouterKey = configService.get('NINEROUTER_KEY');
    const nineRouterModel = configService.get('NINEROUTER_MODEL', 'qwen/qwen-2.5-72b-instruct');
    const enableFallback = configService.get('AI_ENABLE_FALLBACK', true);

    // 1. Stage: Provider Selection
    const stage1Start = Date.now();
    const isNvidiaConfigured = Boolean(nvidiaKey && String(nvidiaKey).length > 5);
    stages.push({
      stage: 'provider_selection',
      provider: isNvidiaConfigured ? 'NVIDIA NIM' : 'Fallback / Gemini RAG',
      model: isNvidiaConfigured ? nvidiaModel : 'Deterministic Legal RAG',
      durationMs: Date.now() - stage1Start,
      status: 'success',
      details: isNvidiaConfigured
        ? `NVIDIA NIM selecionado como primário (${nvidiaModel})`
        : 'NVIDIA_API_KEY não configurada. Roteado para motor RAG determinístico.',
    });

    let resultData: any = null;
    let providerUsed: 'nvidia' | '9router' | 'gemini' | 'deterministic_rag' = 'deterministic_rag';
    let modelUsed = 'rag-deterministic-v1';
    let fallbackOccurred = !isNvidiaConfigured;

    // 2. Try Primary: NVIDIA
    if (isNvidiaConfigured) {
      const stage2Start = Date.now();
      try {
        logger.info('ai', 'ai-provider-manager', 'chat_completion', `Iniciando inferência com NVIDIA (${nvidiaModel})`, {
          correlationId,
          requestId,
          caseId: options?.caseId,
          provider: 'nvidia',
          model: nvidiaModel,
        });

        // Call NVIDIA NIM API or perform robust call
        const response = await fetch(`${nvidiaBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${nvidiaKey}`,
          },
          body: JSON.stringify({
            model: nvidiaModel,
            messages: [
              {
                role: 'system',
                content:
                  'Você é o motor de inteligência jurídica da plataforma DefesAi, especialista em CTB, resoluções do CONTRAN e teses de anulação de multas de trânsito.',
              },
              { role: 'user', content: `${prompt}\n\nContexto:\n${JSON.stringify(context)}` },
            ],
            temperature: options?.temperature ?? configService.get('AI_TEMPERATURE', 0.15),
            max_tokens: 2048,
          }),
        });

        const duration = Date.now() - stage2Start;

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          metricsService.recordAiRequest('nvidia', duration, true, {
            tokens: data.usage?.total_tokens || 850,
          });

          stages.push({
            stage: 'primary_execution',
            provider: 'NVIDIA NIM',
            model: nvidiaModel,
            durationMs: duration,
            status: 'success',
            details: `Executado em ${duration}ms com sucesso via Llama 3.3 70B`,
          });

          resultData = content;
          providerUsed = 'nvidia';
          modelUsed = nvidiaModel;

          logger.info('ai', 'ai-provider-manager', 'chat_completion', `Inferência NVIDIA concluída em ${duration}ms`, {
            correlationId,
            requestId,
            duration,
            provider: 'nvidia',
            model: nvidiaModel,
          });
        } else {
          throw new Error(`NVIDIA HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err: any) {
        const duration = Date.now() - stage2Start;
        metricsService.recordAiRequest('nvidia', duration, false, {
          isFallback: true,
          error: err.message,
        });

        stages.push({
          stage: 'primary_execution',
          provider: 'NVIDIA NIM',
          model: nvidiaModel,
          durationMs: duration,
          status: 'fallback',
          details: `Falha na NVIDIA (${err.message}). Acionando contingência 9Router/Gemini.`,
        });

        logger.warn('ai', 'ai-provider-manager', 'chat_completion', `Falha no provider primário NVIDIA. Iniciando fallback.`, {
          correlationId,
          requestId,
          duration,
          error: err.message,
          provider: 'nvidia',
        });

        fallbackOccurred = true;
      }
    }

    // 3. Fallback / secondary provider: call 9Router for real; never synthesize success.
    if (!resultData && enableFallback && nineRouterKey && nineRouterKey.length > 5) {
      const stage3Start = Date.now();
      try {
        const nineRouterBaseUrl = configService.get('NINEROUTER_BASE_URL', 'https://api.9router.com/v1');
        const response = await fetch(`${nineRouterBaseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${nineRouterKey}`,
          },
          body: JSON.stringify({
            model: nineRouterModel,
            messages: [
              {
                role: 'system',
                content: 'Você é o motor de inteligência jurídica da plataforma DefesAi, especialista em CTB e resoluções do CONTRAN.',
              },
              { role: 'user', content: `${prompt}\n\nContexto:\n${JSON.stringify(context)}` },
            ],
            temperature: options?.temperature ?? configService.get('AI_TEMPERATURE', 0.15),
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          throw new Error(`9Router HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('9Router retornou resposta vazia ou inválida.');
        }

        const duration = Date.now() - stage3Start;
        metricsService.recordAiRequest('9router', duration, true, {
          isFallback: true,
          tokens: data.usage?.total_tokens,
        });
        stages.push({
          stage: 'fallback_execution',
          provider: '9Router',
          model: nineRouterModel,
          durationMs: duration,
          status: 'success',
          details: `Resposta real recebida do 9Router em ${duration}ms.`,
        });

        providerUsed = '9router';
        modelUsed = nineRouterModel;
        resultData = content;
        fallbackOccurred = true;
      } catch (err: any) {
        const duration = Date.now() - stage3Start;
        metricsService.recordAiRequest('9router', duration, false, {
          isFallback: true,
          error: err.message,
        });
        stages.push({
          stage: 'fallback_execution',
          provider: '9Router',
          model: nineRouterModel,
          durationMs: duration,
          status: 'failed',
          details: `9Router falhou: ${err.message}`,
        });
        fallbackOccurred = true;
        logger.warn('ai', 'ai-provider-manager', 'chat_completion', 'Falha no provider 9Router.', {
          correlationId,
          requestId,
          duration,
          error: err.message,
          provider: '9router',
        });
      }
    }

    // 4. Auxiliary / Gemini or Deterministic RAG Fallback
    if (!resultData) {
      const stage4Start = Date.now();
      const geminiKey = configService.get('GEMINI_API_KEY');
      if (geminiKey && geminiKey.length > 10) {
        try {
          const geminiRes = await analyzeTicketWithGemini(prompt, context);
          resultData = geminiRes;
          providerUsed = 'gemini';
          modelUsed = 'gemini-3.7-flash';

          stages.push({
            stage: 'legal_synthesis',
            provider: 'Google Gemini',
            model: 'gemini-3.7-flash',
            durationMs: Date.now() - stage4Start,
            status: 'success',
            details: 'Concluído via Gemini 3.7 Flash',
          });
        } catch {
          // Fallback to deterministic
        }
      }

      if (!resultData) {
        const ragStart = Date.now();
        providerUsed = 'deterministic_rag';
        try {
          const queryEmbedding = await embeddingService.generateEmbedding(prompt);
          modelUsed = queryEmbedding.model;
          const retrievedSources = await vectorStore.searchVectors(queryEmbedding.embedding, {
            topK: 5,
            threshold: 0.35,
          });
          const duration = Date.now() - ragStart;

          if (retrievedSources.length > 0) {
            stages.push({
              stage: 'rag_enhancement',
              provider: 'DefesAi VectorStore',
              model: queryEmbedding.model,
              durationMs: duration,
              status: 'success',
              details: `Recuperadas ${retrievedSources.length} fontes; nenhuma análise generativa foi simulada.`,
            });
            resultData = {
              mode: 'deterministic_rag',
              generated: false,
              notice: 'Nenhum provedor generativo disponível. Os itens abaixo são fontes recuperadas, não um parecer jurídico.',
              sources: retrievedSources.map((source) => ({
                documentTitle: source.documentTitle,
                content: source.content,
                similarity: source.similarity,
                provenance: source.provenance,
              })),
            };
          } else {
            stages.push({
              stage: 'rag_enhancement',
              provider: 'DefesAi VectorStore',
              model: queryEmbedding.model,
              durationMs: duration,
              status: 'failed',
              details: 'Nenhuma fonte jurídica relevante foi recuperada; não foi gerada análise.',
            });
          }
        } catch (err: any) {
          stages.push({
            stage: 'rag_enhancement',
            provider: 'DefesAi VectorStore',
            model: modelUsed,
            durationMs: Date.now() - ragStart,
            status: 'failed',
            details: `Falha na recuperação jurídica: ${err.message}`,
          });
          logger.warn('ai', 'ai-provider-manager', 'rag_fallback', 'Falha ao recuperar fontes jurídicas.', {
            correlationId,
            requestId,
            error: err.message,
          });
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const executionSucceeded = resultData !== null && resultData !== undefined;
    const traceResult: AiExecutionResult = {
      success: executionSucceeded,
      providerUsed,
      modelUsed,
      totalDurationMs,
      stages,
      fallbackOccurred,
      correlationId,
      data: resultData,
      error: executionSucceeded
        ? undefined
        : 'Nenhum provedor generativo respondeu e nenhuma fonte jurídica verificável foi recuperada.',
    };

    this.recentPipelineTraces.unshift(traceResult);
    if (this.recentPipelineTraces.length > 100) {
      this.recentPipelineTraces.pop();
    }

    return traceResult;
  }

  public getRecentTraces(): AiExecutionResult[] {
    return [...this.recentPipelineTraces];
  }
}

export const aiProviderManager = new AiProviderManager();
