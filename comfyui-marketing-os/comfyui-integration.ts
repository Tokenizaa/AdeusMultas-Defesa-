/**
 * ComfyUI Marketing OS Integration
 * 
 * Este módulo integra o Criador Agent do Marketing OS com o ComfyUI
 * para geração de imagens e vídeos de conteúdo marketing.
 * 
 * Uso:
 *   import { ComfyUIMarketing } from './comfyui-integration';
 *   
 *   const comfyui = new ComfyUIMarketing({
 *     serverUrl: 'http://localhost:8188',
 *     quality: 'production'
 *   });
 *   
 *   const imagePath = await comfyui.generateImage({
 *     type: 'social-media',
 *     topic: 'defesa de multa por velocidade',
 *     platform: 'instagram'
 *   });
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
export interface ComfyUIConfig {
  serverUrl: string;
  timeout: number;
  pollInterval: number;
  outputDir: string;
  quality: 'draft' | 'production' | 'premium';
}

export interface ImageParams {
  type: 'social-media' | 'blog-header' | 'infographic' | 'quote-card' | 'carousel';
  topic: string;
  platform?: 'instagram' | 'facebook' | 'linkedin' | 'youtube';
  style?: 'professional' | 'modern' | 'minimalist';
  customPrompt?: string;
  customNegative?: string;
  count?: number;
}

export interface VideoParams {
  type: 'reel' | 'explainer' | 'talking-head' | 'animated-infographic';
  topic: string;
  duration?: '5s' | '10s' | '15s' | '30s';
  avatarReference?: string;
  customPrompt?: string;
  customNegative?: string;
}

export interface BatchParams {
  items: Array<ImageParams | VideoParams>;
  concurrency?: number;
}

export interface GenerationResult {
  success: boolean;
  promptId?: string;
  outputPath?: string;
  error?: string;
  duration?: number;
}

// Workflow mappings
const workflowMap: Record<string, string> = {
  // Images
  'social-media': 'workflows/images/social-media-post.json',
  'blog-header': 'workflows/images/blog-header.json',
  'infographic': 'workflows/images/infographic.json',
  'quote-card': 'workflows/images/quote-card.json',
  'carousel': 'workflows/images/carousel.json',
  
  // Videos
  'reel': 'workflows/videos/reel-short.json',
  'explainer': 'workflows/videos/explainer.json',
  'talking-head': 'workflows/videos/talking-head.json',
  'animated-infographic': 'workflows/videos/animated-infographic.json',
  
  // Batch
  'batch-social': 'workflows/batch/batch-social.json',
  'batch-carousel': 'workflows/batch/batch-carousel.json'
};

// Platform-specific configurations
const platformConfigs: Record<string, any> = {
  instagram: {
    post: { width: 1024, height: 1024 },
    story: { width: 614, height: 1024 },
    reel: { width: 480, height: 832, frames: 81 }
  },
  facebook: {
    post: { width: 1344, height: 704 },
    video: { width: 832, height: 480, frames: 241 }
  },
  linkedin: {
    post: { width: 1344, height: 704 },
    video: { width: 832, height: 480, frames: 241 }
  },
  youtube: {
    thumbnail: { width: 1344, height: 768 },
    shorts: { width: 480, height: 832, frames: 81 }
  }
};

// Prompt templates
const promptTemplates = {
  'social-media': {
    base: 'professional marketing image for brazilian traffic law firm, {topic}, clean modern design, blue and white color scheme, high quality, sharp details, professional lighting, corporate style, trustworthy appearance',
    negative: 'low quality, blurry, distorted, ugly, deformed, noisy, grainy, watermark, text overlay, amateur, unprofessional, dark, gloomy, violent, inappropriate content'
  },
  'blog-header': {
    base: 'professional blog header image for legal website, {topic}, modern minimalist design, blue gradient background, abstract geometric shapes, clean typography space, corporate professional, high resolution, sharp details',
    negative: 'low quality, blurry, distorted, ugly, deformed, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, cluttered, busy design'
  },
  'infographic': {
    base: 'professional infographic design for traffic law education, {topic}, clean data visualization, blue and white color scheme, icons and charts, educational content layout, modern flat design, organized information hierarchy',
    negative: 'low quality, blurry, distorted, ugly, noisy, grainy, amateur, unprofessional, cluttered, messy layout, unreadable text, poor design'
  },
  'quote-card': {
    base: 'elegant quote card design, minimalist background, soft gradient blue tones, space for text overlay, professional social media graphic, clean composition, modern typography area, subtle texture, premium quality',
    negative: 'low quality, blurry, distorted, ugly, noisy, grainy, amateur, unprofessional, cluttered, busy background, too many elements'
  },
  'carousel': {
    base: 'educational carousel slide design, consistent visual theme, blue and white color scheme, numbered steps layout, professional infographic style, clean modern design, legal education content',
    negative: 'low quality, blurry, distorted, ugly, noisy, grainy, amateur, unprofessional, inconsistent style, cluttered, busy, poor readability'
  },
  'reel': {
    base: 'professional marketing video for traffic law firm, {topic}, smooth camera movement, modern office environment, clean design, educational content, high quality, professional lighting, corporate style',
    negative: 'low quality, blurry, distorted, ugly, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, violent, inappropriate content, flickering'
  },
  'explainer': {
    base: 'educational explainer video about traffic law, {topic}, smooth transitions, professional animation style, clean modern graphics, informative content, high quality production, corporate blue color scheme',
    negative: 'low quality, blurry, distorted, ugly, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, violent, inappropriate content, flickering, jarring transitions'
  },
  'talking-head': {
    base: 'professional talking head video, person speaking to camera, clean background, professional lighting, corporate setting, educational content delivery, high quality video, smooth motion',
    negative: 'low quality, blurry, distorted, ugly, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, violent, inappropriate content, flickering, face distortion'
  },
  'animated-infographic': {
    base: 'animated infographic video, smooth data visualization animation, professional motion graphics, educational content, legal statistics, clean modern design, blue color scheme, smooth transitions',
    negative: 'low quality, blurry, distorted, ugly, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, violent, inappropriate content, flickering, jarring animations'
  }
};

export class ComfyUIMarketing {
  private config: ComfyUIConfig;
  private workflowsDir: string;

  constructor(config: Partial<ComfyUIConfig> = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:8188',
      timeout: config.timeout || 300000,
      pollInterval: config.pollInterval || 2000,
      outputDir: config.outputDir || join(__dirname, 'output'),
      quality: config.quality || 'production'
    };
    
    this.workflowsDir = join(__dirname, 'workflows');
  }

  /**
   * Gera uma imagem usando o ComfyUI
   */
  async generateImage(params: ImageParams): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Load workflow
      const workflowPath = join(this.workflowsDir, workflowMap[params.type]);
      if (!existsSync(workflowPath)) {
        throw new Error(`Workflow não encontrado: ${workflowPath}`);
      }
      
      let workflow = JSON.parse(readFileSync(workflowPath, 'utf-8'));
      
      // Apply customizations
      workflow = this.customizeWorkflow(workflow, params);
      
      // Queue prompt
      const promptId = await this.queuePrompt(workflow);
      
      // Wait for completion
      const outputs = await this.waitForCompletion(promptId);
      
      // Extract output path
      const outputPath = this.extractOutputPath(outputs, params.type);
      
      return {
        success: true,
        promptId,
        outputPath,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Gera um vídeo usando o ComfyUI
   */
  async generateVideo(params: VideoParams): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Load workflow
      const workflowPath = join(this.workflowsDir, workflowMap[params.type]);
      if (!existsSync(workflowPath)) {
        throw new Error(`Workflow não encontrado: ${workflowPath}`);
      }
      
      let workflow = JSON.parse(readFileSync(workflowPath, 'utf-8'));
      
      // Apply customizations
      workflow = this.customizeWorkflow(workflow, params);
      
      // Queue prompt
      const promptId = await this.queuePrompt(workflow);
      
      // Wait for completion
      const outputs = await this.waitForCompletion(promptId);
      
      // Extract output path
      const outputPath = this.extractOutputPath(outputs, params.type);
      
      return {
        success: true,
        promptId,
        outputPath,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Gera múltiplos itens em lote
   */
  async batchGenerate(params: BatchParams): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    const concurrency = params.concurrency || 3;
    
    // Process in batches
    for (let i = 0; i < params.items.length; i += concurrency) {
      const batch = params.items.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(item => {
          if ('type' in item && ['reel', 'explainer', 'talking-head', 'animated-infographic'].includes(item.type)) {
            return this.generateVideo(item as VideoParams);
          }
          return this.generateImage(item as ImageParams);
        })
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Verifica o status do ComfyUI server
   */
  async checkStatus(): Promise<{ online: boolean; queue?: any }> {
    try {
      const response = await fetch(`${this.config.serverUrl}/system_stats`);
      const stats = await response.json();
      
      const queueResponse = await fetch(`${this.config.serverUrl}/queue`);
      const queue = await queueResponse.json();
      
      return {
        online: true,
        queue
      };
    } catch (error) {
      return { online: false };
    }
  }

  /**
   * Cancela uma geração em andamento
   */
  async cancelGeneration(promptId: string): Promise<boolean> {
    try {
      await fetch(`${this.config.serverUrl}/interrupt`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Private methods

  private customizeWorkflow(workflow: any, params: ImageParams | VideoParams): any {
    const customized = JSON.parse(JSON.stringify(workflow));
    
    // Determine template type
    let templateType: string;
    if ('type' in params) {
      templateType = params.type;
    } else {
      templateType = 'social-media';
    }
    
    // Get prompt template
    const template = promptTemplates[templateType as keyof typeof promptTemplates];
    if (!template) {
      return customized;
    }
    
    // Build prompt
    let positivePrompt = params.customPrompt || template.base;
    const topic = params.topic || 'traffic law';
    positivePrompt = positivePrompt.replace('{topic}', topic);
    
    // Add style modifiers
    if ('style' in params && params.style) {
      const styleModifiers: Record<string, string> = {
        'professional': ', corporate, business-like',
        'modern': ', contemporary, sleek',
        'minimalist': ', simple, clean lines'
      };
      positivePrompt += styleModifiers[params.style] || '';
    }
    
    let negativePrompt = params.customNegative || template.negative;
    
    // Update workflow nodes
    for (const [nodeId, node] of Object.entries(customized)) {
      const nodeData = node as any;
      
      if (nodeData.class_type === 'CLIPTextEncode') {
        // Check if this is positive or negative prompt
        const isNegative = Object.values(nodeData.inputs).some(
          v => typeof v === 'string' && v.includes('low quality')
        );
        
        if (isNegative) {
          nodeData.inputs.text = negativePrompt;
        } else {
          nodeData.inputs.text = positivePrompt;
        }
      }
      
      // Update dimensions for platform
      if (nodeData.class_type === 'EmptyLatentImage' || 
          nodeData.class_type === 'WanImageToVideo') {
        if ('platform' in params && params.platform) {
          const platformConfig = platformConfigs[params.platform];
          if (platformConfig) {
            // Determine sub-type based on params
            let subType = 'post';
            if ('type' in params) {
              if (['reel', 'talking-head'].includes(params.type)) {
                subType = 'reel';
              } else if (params.type === 'blog-header') {
                subType = 'header';
              }
            }
            
            const dims = platformConfig[subType] || platformConfig.post;
            if (dims) {
              nodeData.inputs.width = dims.width;
              nodeData.inputs.height = dims.height;
              
              if (dims.frames && nodeData.inputs.length !== undefined) {
                nodeData.inputs.length = dims.frames;
              }
            }
          }
        }
      }
      
      // Update filename prefix
      if (nodeData.class_type === 'SaveImage' || 
          nodeData.class_type === 'VHS_VideoCombine') {
        const prefix = nodeData.inputs.filename_prefix || 'output';
        const timestamp = Date.now();
        nodeData.inputs.filename_prefix = `${prefix}_${timestamp}`;
      }
      
      // Update seed for variety
      if (nodeData.class_type === 'KSampler' && nodeData.inputs.seed) {
        nodeData.inputs.seed = Math.floor(Math.random() * 1000000000);
      }
    }
    
    return customized;
  }

  private async queuePrompt(workflow: any): Promise<string> {
    const response = await fetch(`${this.config.serverUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao enfileirar prompt: ${response.statusText}`);
    }
    
    const { prompt_id } = await response.json();
    return prompt_id;
  }

  private async waitForCompletion(promptId: string): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.timeout) {
      const history = await this.getHistory(promptId);
      
      if (history[promptId]?.outputs) {
        return history[promptId].outputs;
      }
      
      await new Promise(r => setTimeout(r, this.config.pollInterval));
    }
    
    throw new Error('Timeout aguardando geração');
  }

  private async getHistory(promptId: string): Promise<any> {
    const response = await fetch(`${this.config.serverUrl}/history/${promptId}`);
    return await response.json();
  }

  private extractOutputPath(outputs: any, type: string): string {
    // Extract first output file
    for (const [nodeId, nodeOutput] of Object.entries(outputs)) {
      const output = nodeOutput as any;
      
      if (output.images && output.images.length > 0) {
        return output.images[0].filename;
      }
      
      if (output.gifs && output.gifs.length > 0) {
        return output.gifs[0].filename;
      }
      
      if (output.videos && output.videos.length > 0) {
        return output.videos[0].filename;
      }
    }
    
    throw new Error('Nenhum output encontrado');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Uso: comfyui-integration <command> <params>');
    console.log('Comandos:');
    console.log('  image <type> <topic> [platform]');
    console.log('  video <type> <topic> [duration]');
    console.log('  status');
    process.exit(1);
  }
  
  const command = args[0];
  const comfyui = new ComfyUIMarketing();
  
  (async () => {
    switch (command) {
      case 'image': {
        const [type, topic, platform] = args.slice(1);
        const result = await comfyui.generateImage({
          type: type as any,
          topic,
          platform: platform as any
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'video': {
        const [type, topic, duration] = args.slice(1);
        const result = await comfyui.generateVideo({
          type: type as any,
          topic,
          duration: duration as any
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'status': {
        const status = await comfyui.checkStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
      }
      
      default:
        console.error(`Comando desconhecido: ${command}`);
        process.exit(1);
    }
  })();
}

export default ComfyUIMarketing;
