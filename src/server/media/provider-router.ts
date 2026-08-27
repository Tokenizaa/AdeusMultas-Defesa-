/**
 * @file provider-router.ts
 * Mecanismo inteligente de roteamento e fallback de provedores de mídia.
 */

import { HardwareDetector } from './hardware-detector';
import { DevMockMediaProvider } from './providers/dev-mock-provider';
import { LocalMediaProvider } from './providers/local-provider';
import { RemoteMediaProvider } from './providers/remote-provider';
import { MediaProviderInterface, MediaType } from './types';

export class ProviderRouter {
  private localProvider: LocalMediaProvider;
  private remoteProvider: RemoteMediaProvider;
  private mockProvider: DevMockMediaProvider;

  constructor() {
    this.localProvider = new LocalMediaProvider();
    this.remoteProvider = new RemoteMediaProvider();
    this.mockProvider = new DevMockMediaProvider();
  }

  /**
   * Decide e retorna o melhor provedor para a solicitação atual.
   */
  public async resolveProvider(type: MediaType, explicitProviderPreference?: string): Promise<MediaProviderInterface> {
    // 1. Respeitar preferência explícita se solicitada
    if (explicitProviderPreference === 'local') {
      if (await this.localProvider.isAvailable()) return this.localProvider;
    } else if (explicitProviderPreference === 'remote') {
      if (await this.remoteProvider.isAvailable()) return this.remoteProvider;
    } else if (explicitProviderPreference === 'dev_mock') {
      return this.mockProvider;
    }

    // 2. Checar variável global MEDIA_PROVIDER
    const globalSetting = (process.env.MEDIA_PROVIDER || 'auto').toLowerCase();
    if (globalSetting === 'dev_mock') {
      return this.mockProvider;
    }

    // 3. Checar variável específica por tipo de mídia
    let typeSetting = 'auto';
    if (type === 'image') {
      typeSetting = (process.env.MEDIA_IMAGE_PROVIDER || globalSetting).toLowerCase();
    } else if (type === 'video' || type === 'image_to_video') {
      typeSetting = (process.env.MEDIA_VIDEO_PROVIDER || globalSetting).toLowerCase();
    }

    if (typeSetting === 'local' && (await this.localProvider.isAvailable())) {
      return this.localProvider;
    }
    if (typeSetting === 'remote' && (await this.remoteProvider.isAvailable())) {
      return this.remoteProvider;
    }

    // 4. Modo AUTO: Decisão baseada em hardware e disponibilidade
    const hw = HardwareDetector.getHardwareInfo();

    // Se o hardware for GPU Ready e local estiver habilitado
    if (process.env.MEDIA_LOCAL_ENABLED === 'true' && hw.classification === 'LOCAL_GPU_READY') {
      if (await this.localProvider.isAvailable()) {
        return this.localProvider;
      }
    }

    // Provedor Remoto (Padrão de produção para ambientes Cloud/CPU)
    if (process.env.MEDIA_REMOTE_ENABLED !== 'false' && (await this.remoteProvider.isAvailable())) {
      return this.remoteProvider;
    }

    // Se o provedor local estiver ativo mesmo sem GPU
    if (await this.localProvider.isAvailable()) {
      return this.localProvider;
    }

    // Fallback final para ambiente de desenvolvimento se nenhuma API estiver configurada
    return this.mockProvider;
  }

  public getAvailableProviders() {
    return [
      { id: this.remoteProvider.id, name: this.remoteProvider.name, kind: this.remoteProvider.kind },
      { id: this.localProvider.id, name: this.localProvider.name, kind: this.localProvider.kind },
      { id: this.mockProvider.id, name: this.mockProvider.name, kind: this.mockProvider.kind },
    ];
  }
}
