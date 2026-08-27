/**
 * @file types.ts
 * Contratos unificados e universais para a camada MediaGenerationService.
 */

export type MediaType = 'image' | 'video' | 'image_to_video';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ProviderKind = 'local' | 'remote' | 'dev_mock';

export type HardwareClassification =
  | 'LOCAL_GPU_READY'
  | 'LOCAL_GPU_LIMITED'
  | 'LOCAL_CPU_ONLY'
  | 'REMOTE_REQUIRED';

export interface HardwareInfo {
  os: string;
  arch: string;
  cpuCount: number;
  cpuModel: string;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  hasGpu: boolean;
  gpuName?: string;
  vramBytes?: number;
  hasCuda: boolean;
  hasRocm: boolean;
  hasDocker: boolean;
  pythonVersion?: string;
  nodeVersion: string;
  classification: HardwareClassification;
}

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:5' | '3:4' | '4:3';
  imageSize?: '1K' | '2K' | '4K';
  stylePreset?: string;
  negativePrompt?: string;
  seed?: number;
  allowFallback?: boolean;
}

export interface VideoGenerationOptions {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  fps?: number;
  resolution?: '720p' | '1080p';
  quality?: 'fast' | 'high';
  negativePrompt?: string;
  seed?: number;
  allowFallback?: boolean;
}

export interface ImageToVideoOptions extends VideoGenerationOptions {
  referenceImageBase64?: string;
  referenceImageUrl?: string;
  referenceMimeType?: string;
  motionBucketId?: number;
}

export interface MediaOutput {
  url?: string;
  base64?: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  isFallback?: boolean;
  metadata?: Record<string, any>;
}

export interface MediaJob {
  id: string;
  type: MediaType;
  provider: string;
  providerKind: ProviderKind;
  model: string;
  prompt: string;
  options: Record<string, any>;
  inputMedia?: {
    imageUrl?: string;
    imageBase64Preview?: string;
    mimeType?: string;
  };
  status: JobStatus;
  progress: number;
  output?: MediaOutput;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MediaProviderInterface {
  readonly id: string;
  readonly name: string;
  readonly kind: ProviderKind;
  isAvailable(): Promise<boolean>;
  generateImage(options: ImageGenerationOptions): Promise<MediaOutput>;
  generateVideo(options: VideoGenerationOptions, onProgress?: (progress: number) => void): Promise<MediaOutput>;
  generateImageToVideo(options: ImageToVideoOptions, onProgress?: (progress: number) => void): Promise<MediaOutput>;
}
