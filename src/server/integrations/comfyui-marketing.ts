/**
 * ComfyUI Marketing Integration
 * Integra o ComfyUI com o Marketing OS para geração de imagens e vídeos
 */

import { logger } from '../observability/logger';

export interface ComfyUIMarketingConfig {
  serverUrl: string;
  quality: 'draft' | 'production';
  defaultTimeout: number;
}

export interface ImageGenerationRequest {
  type: 'social-media' | 'blog-header' | 'infographic' | 'quote-card' | 'carousel';
  topic: string;
  platform?: 'instagram' | 'facebook' | 'linkedin' | 'tiktok';
  brandColors?: {
    primary: string;
    secondary: string;
  };
  style?: 'professional' | 'educational' | 'engaging';
  batchSize?: number;
}

export interface VideoGenerationRequest {
  type: 'reel' | 'explainer' | 'talking-head' | 'animated-infographic';
  topic: string;
  duration?: '5s' | '10s' | '15s' | '30s';
  avatarImage?: string;
  voiceId?: string;
}

export interface ComfyUIWorkflow {
  [nodeId: string]: {
    class_type: string;
    inputs: Record<string, any>;
  };
}

export class ComfyUIMarketing {
  private config: ComfyUIMarketingConfig;
  private isConnected = false;

  constructor(config: Partial<ComfyUIMarketingConfig> = {}) {
    this.config = {
      serverUrl: config.serverUrl || process.env.COMFYUI_SERVER_URL || 'http://localhost:8188',
      quality: config.quality || 'production',
      defaultTimeout: config.defaultTimeout || 120000, // 2 minutes
    };
  }

  /**
   * Test connection to ComfyUI server
   */
  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${this.config.serverUrl}/system_stats`, {
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (response && response.ok) {
        const stats = await response.json();
        logger.info('marketing', 'comfyui', 'connection', 'ComfyUI connected', {
          version: stats.system?.comfyui_version,
          devices: stats.devices?.length || 0
        });
        this.isConnected = true;
        return true;
      }
      this.isConnected = false;
      return false;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Generate image using ComfyUI
   */
  async generateImage(request: ImageGenerationRequest): Promise<string[]> {
    logger.info('marketing', 'comfyui', 'generateImage', 'Starting image generation', {
      type: request.type,
      topic: request.topic,
      platform: request.platform
    });

    const workflow = this.buildImageWorkflow(request);
    const result = await this.queueWorkflow(workflow);
    
    return result.outputImages || [];
  }

  /**
   * Generate video using ComfyUI
   */
  async generateVideo(request: VideoGenerationRequest): Promise<string[]> {
    // Convert duration string to number for logging (e.g., '15s' -> 15)
    const durationSeconds = request.duration ? parseInt(request.duration.replace('s', '')) : 0;
    
    logger.info('marketing', 'comfyui', 'generateVideo', 'Starting video generation', {
      type: request.type,
      topic: request.topic,
      duration: durationSeconds
    });

    const workflow = this.buildVideoWorkflow(request);
    const result = await this.queueWorkflow(workflow);
    
    return result.outputVideos || [];
  }

  /**
   * Build image workflow based on request type
   */
  private buildImageWorkflow(request: ImageGenerationRequest): ComfyUIWorkflow {
    const baseWorkflow: ComfyUIWorkflow = {
      "1": {
        "class_type": "LoadCheckpoint",
        "inputs": {
          "ckpt_name": "flux1-dev.safetensors"
        }
      },
      "2": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": this.buildImagePrompt(request),
          "clip": ["1", 1]
        }
      },
      "3": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "low quality, blurry, distorted, ugly, bad anatomy",
          "clip": ["1", 1]
        }
      },
      "4": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": this.getImageWidth(request),
          "height": this.getImageHeight(request),
          "batch_size": request.batchSize || 1
        }
      },
      "5": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": this.config.quality === 'production' ? 25 : 15,
          "cfg": 3.5,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0,
          "model": ["1", 0],
          "positive": ["2", 0],
          "negative": ["3", 0],
          "latent_image": ["4", 0]
        }
      },
      "6": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["5", 0],
          "vae": ["1", 2]
        }
      },
      "7": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": `marketing_${request.type}_${Date.now()}`,
          "images": ["6", 0]
        }
      }
    };

    return baseWorkflow;
  }

  /**
   * Build video workflow based on request type
   */
  private buildVideoWorkflow(request: VideoGenerationRequest): ComfyUIWorkflow {
    // Video workflows are more complex, using Wan I2V or AnimateDiff
    const baseWorkflow: ComfyUIWorkflow = {
      "1": {
        "class_type": "LoadDiffusionModel",
        "inputs": {
          "unet_name": "wan2.2_i2v_480p_14B_bf16.safetensors"
        }
      },
      "2": {
        "class_type": "LoadCLIP",
        "inputs": {
          "clip_name": "umt5-xxl-enc-fp8_e4m3fn.safetensors"
        }
      },
      "3": {
        "class_type": "LoadVAE",
        "inputs": {
          "vae_name": "wan_2.2_vae.safetensors"
        }
      },
      "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": this.buildVideoPrompt(request),
          "clip": ["2", 0]
        }
      },
      "5": {
        "class_type": "EmptySD3LatentImage",
        "inputs": {
          "width": 832,
          "height": 480,
          "batch_size": this.getFrameCount(request.duration || '5s')
        }
      },
      "6": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 30,
          "cfg": 6.0,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0,
          "model": ["1", 0],
          "positive": ["4", 0],
          "negative": ["4", 0], // Using same for negative in this example
          "latent_image": ["5", 0]
        }
      },
      "7": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["6", 0],
          "vae": ["3", 0]
        }
      },
      "8": {
        "class_type": "VHS_VideoCombine",
        "inputs": {
          "frame_rate": 16,
          "loop_count": 0,
          "filename_prefix": `marketing_video_${request.type}_${Date.now()}`,
          "format": "video/h264-mp4",
          "pingpong": false,
          "save_output": true,
          "images": ["7", 0]
        }
      }
    };

    return baseWorkflow;
  }

  /**
   * Build image prompt based on request
   */
  private buildImagePrompt(request: ImageGenerationRequest): string {
    const topicPrompts: Record<string, string> = {
      'defesa de multa': 'Professional legal defense against traffic fines, Brazilian law, justice symbol, scales of justice',
      'CNH': 'Brazilian driver license (CNH), driving authorization, traffic document',
      'multas de trânsito': 'Traffic fines, penalty notifications, Brazilian traffic law',
      'direito de trânsito': 'Traffic law, legal consultation, attorney at law',
      'recurso de multa': 'Traffic fine appeal, legal document, justice'
    };

    const topicKey = Object.keys(topicPrompts).find(key => 
      request.topic.toLowerCase().includes(key)
    ) || request.topic;

    const basePrompt = topicPrompts[topicKey] || request.topic;

    const styleModifiers = {
      professional: 'professional, clean, modern design, corporate',
      educational: 'educational, informative, clear, teaching material',
      engaging: 'engaging, eye-catching, vibrant, social media style'
    };

    const platformModifiers: Record<string, string> = {
      instagram: 'Instagram post style, square format, bold text area',
      facebook: 'Facebook post style, news feed optimized',
      linkedin: 'LinkedIn professional style, business appropriate',
      tiktok: 'TikTok style, vertical format, dynamic'
    };

    return `${basePrompt}, ${styleModifiers[request.style || 'professional']}, ${platformModifiers[request.platform || 'instagram']}, Brazilian Portuguese text space, high quality, detailed`;
  }

  /**
   * Build video prompt based on request
   */
  private buildVideoPrompt(request: VideoGenerationRequest): string {
    const topicPrompts: Record<string, string> = {
      'defesa de multa': 'Animated explanation of traffic fine defense process, legal steps, justice',
      '5 dicas': 'Educational listicle video, tips for drivers, Brazilian traffic law',
      'direito de trânsito': 'Traffic law explanation, legal consultation, attorney advice'
    };

    const topicKey = Object.keys(topicPrompts).find(key => 
      request.topic.toLowerCase().includes(key)
    ) || request.topic;

    const basePrompt = topicPrompts[topicKey] || request.topic;

    const typeModifiers: Record<string, string> = {
      'reel': 'short-form vertical video, Instagram Reel style, dynamic cuts',
      'explainer': 'educational explainer video, clear narration, step-by-step',
      'talking-head': 'talking head video, professional speaker, direct address',
      'animated-infographic': 'animated infographic, data visualization, motion graphics'
    };

    return `${basePrompt}, ${typeModifiers[request.type]}, smooth animation, professional quality, Brazilian Portuguese`;
  }

  /**
   * Get image dimensions based on request type and platform
   */
  private getImageWidth(request: ImageGenerationRequest): number {
    // Handle social-media type with platform-specific dimensions
    if (request.type === 'social-media' && request.platform) {
      const socialMediaDimensions: Record<string, number> = {
        instagram: 1024,
        facebook: 1344,
        linkedin: 1344,
        tiktok: 576
      };
      return socialMediaDimensions[request.platform] || 1024;
    }

    // Handle other content types
    const dimensions: Record<string, number> = {
      'blog-header': 1344,
      'infographic': 1024,
      'quote-card': 1024,
      'carousel': 1024
    };

    return dimensions[request.type] || 1024;
  }

  private getImageHeight(request: ImageGenerationRequest): number {
    // Handle social-media type with platform-specific dimensions
    if (request.type === 'social-media' && request.platform) {
      const socialMediaDimensions: Record<string, number> = {
        instagram: 1024,
        facebook: 672,
        linkedin: 672,
        tiktok: 1024
      };
      return socialMediaDimensions[request.platform] || 1024;
    }

    // Handle other content types
    const dimensions: Record<string, number> = {
      'blog-header': 768,
      'infographic': 1360,
      'quote-card': 1024,
      'carousel': 1024
    };

    return dimensions[request.type] || 1024;
  }

  /**
   * Get frame count based on duration
   */
  private getFrameCount(duration: string): number {
    const frameCounts: Record<string, number> = {
      '5s': 81,
      '10s': 161,
      '15s': 241,
      '30s': 481
    };

    return frameCounts[duration] || 81;
  }

  /**
   * Queue workflow for execution
   */
  private async queueWorkflow(workflow: ComfyUIWorkflow): Promise<{ outputImages?: string[], outputVideos?: string[] }> {
    try {
      // Create prompt
      const promptResponse = await fetch(`${this.config.serverUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow })
      });

      if (!promptResponse.ok) {
        throw new Error(`Failed to queue workflow: ${promptResponse.statusText}`);
      }

      const { prompt_id } = await promptResponse.json();
      logger.info('marketing', 'comfyui', 'queue', 'Workflow queued', { promptId: prompt_id });

      // Wait for completion
      const result = await this.waitForCompletion(prompt_id);
      
      return result;
    } catch (error) {
      logger.error('marketing', 'comfyui', 'queue', 'Failed to queue workflow', { error });
      throw error;
    }
  }

  /**
   * Wait for workflow completion
   */
  private async waitForCompletion(promptId: string): Promise<{ outputImages?: string[], outputVideos?: string[] }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.defaultTimeout) {
      try {
        const historyResponse = await fetch(`${this.config.serverUrl}/history/${promptId}`);
        const history = await historyResponse.json();

        if (history[promptId]) {
          const outputs = history[promptId].outputs;
          const outputImages: string[] = [];
          const outputVideos: string[] = [];

          // Extract outputs from all nodes
          Object.values(outputs).forEach((nodeOutput: any) => {
            if (nodeOutput.images) {
              outputImages.push(...nodeOutput.images.map((img: any) => img.filename));
            }
            if (nodeOutput.gifs) {
              outputVideos.push(...nodeOutput.gifs.map((gif: any) => gif.filename));
            }
          });

          return { outputImages, outputVideos };
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.warn('marketing', 'comfyui', 'wait', 'Error checking history', { error });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Workflow execution timed out');
  }

  /**
   * Get available models from ComfyUI
   */
  async getAvailableModels(): Promise<{ checkpoints: string[], vae: string[], clip: string[] }> {
    try {
      const response = await fetch(`${this.config.serverUrl}/object_info`);
      const objectInfo = await response.json();

      const checkpoints: string[] = [];
      const vae: string[] = [];
      const clip: string[] = [];

      // Extract model lists from object_info
      if (objectInfo.CheckpointLoaderSimple) {
        checkpoints.push(...objectInfo.CheckpointLoaderSimple.input.required.ckpt_name[0]);
      }
      if (objectInfo.VAELoader) {
        vae.push(...objectInfo.VAELoader.input.required.vae_name[0]);
      }
      if (objectInfo.CLIPLoader) {
        clip.push(...objectInfo.CLIPLoader.input.required.clip_name[0]);
      }

      return { checkpoints, vae, clip };
    } catch (error) {
      logger.error('marketing', 'comfyui', 'models', 'Failed to get available models', { error });
      return { checkpoints: [], vae: [], clip: [] };
    }
  }
}

// Export singleton instance
export const comfyuiMarketing = new ComfyUIMarketing({
  serverUrl: 'http://localhost:8188',
  quality: 'production'
});