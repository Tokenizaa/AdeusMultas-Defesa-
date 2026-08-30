/**
 * Example usage of ComfyUI Marketing Integration
 * Shows how to generate images and videos for marketing content
 */

import { comfyuiMarketing } from './src/server/integrations/comfyui-marketing';
import { comfyuiWorker } from './src/server/workers/comfyui-worker';

// Example 1: Generate a social media post image
async function generateInstagramPost() {
  console.log('📱 Generating Instagram post image...');
  
  const request = {
    type: 'social-media' as const,
    topic: 'defesa de multa de trânsito',
    platform: 'instagram' as const,
    style: 'professional' as const,
    brandColors: {
      primary: '#1E40AF', // Blue
      secondary: '#F59E0B' // Yellow
    }
  };

  const images = await comfyuiMarketing.generateImage(request);
  console.log(`Generated ${images.length} image(s)`);
  
  return images;
}

// Example 2: Generate a blog header
async function generateBlogHeader() {
  console.log('📝 Generating blog header image...');
  
  const request = {
    type: 'blog-header' as const,
    topic: 'recurso de multa eletrônica',
    style: 'educational' as const
  };

  const images = await comfyuiMarketing.generateImage(request);
  console.log(`Generated ${images.length} header image(s)`);
  
  return images;
}

// Example 3: Generate an infographic
async function generateInfographic() {
  console.log('📊 Generating infographic...');
  
  const request = {
    type: 'infographic' as const,
    topic: 'pontos na CNH',
    style: 'educational' as const
  };

  const images = await comfyuiMarketing.generateImage(request);
  console.log(`Generated ${images.length} infographic(s)`);
  
  return images;
}

// Example 4: Generate a Reel video
async function generateReelVideo() {
  console.log('🎬 Generating Reel video...');
  
  const request = {
    type: 'reel' as const,
    topic: '5 dicas para motoristas',
    duration: '15s' as const
  };

  const videos = await comfyuiWorker.generateVideo(request);
  console.log(`Generated ${videos.length} video(s)`);
  
  return videos;
}

// Example 5: Batch generate for multiple platforms
async function batchGenerateForPlatforms() {
  console.log('🔄 Batch generating for multiple platforms...');
  
  const platforms = ['instagram', 'facebook', 'linkedin'] as const;
  const results: Record<string, string[]> = {};

  for (const platform of platforms) {
    const request = {
      type: 'social-media' as const,
      topic: 'direito de trânsito',
      platform,
      style: 'professional' as const
    };

    const images = await comfyuiMarketing.generateImage(request);
    results[platform] = images;
    console.log(`  ${platform}: ${images.length} image(s)`);
  }

  return results;
}

// Example 6: Generate content calendar visuals
async function generateContentCalendarVisuals() {
  console.log('📅 Generating content calendar visuals...');
  
  const topics = [
    'defesa de multa',
    'recurso de multa',
    'CNH digital',
    'pontos na CNH',
    'direito de trânsito'
  ];

  const calendarVisuals: Record<string, { images: string[], videos: string[] }> = {};

  for (const topic of topics) {
    console.log(`  Generating for topic: ${topic}`);
    
    // Generate image
    const imageRequest = {
      type: 'social-media' as const,
      topic,
      platform: 'instagram' as const,
      style: 'educational' as const
    };

    const images = await comfyuiMarketing.generateImage(imageRequest);
    
    // Generate video
    const videoRequest = {
      type: 'reel' as const,
      topic,
      duration: '10s' as const
    };

    const videos = await comfyuiWorker.generateVideo(videoRequest);
    
    calendarVisuals[topic] = { images, videos };
  }

  return calendarVisuals;
}

// Main function
async function main() {
  console.log('🚀 ComfyUI Marketing Integration Examples\n');

  try {
    // Test connection first
    const isConnected = await comfyuiMarketing.testConnection();
    if (!isConnected) {
      console.log('❌ ComfyUI not connected. Please start ComfyUI on http://localhost:8188');
      return;
    }

    console.log('✅ ComfyUI connected successfully\n');

    // Run examples
    await generateInstagramPost();
    console.log('');

    await generateBlogHeader();
    console.log('');

    await generateInfographic();
    console.log('');

    await generateReelVideo();
    console.log('');

    await batchGenerateForPlatforms();
    console.log('');

    await generateContentCalendarVisuals();
    console.log('');

    console.log('🎉 All examples completed successfully!');
    console.log('\nCheck the ComfyUI output folder for generated files.');

  } catch (error) {
    console.error('❌ Error during examples:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export {
  generateInstagramPost,
  generateBlogHeader,
  generateInfographic,
  generateReelVideo,
  batchGenerateForPlatforms,
  generateContentCalendarVisuals
};