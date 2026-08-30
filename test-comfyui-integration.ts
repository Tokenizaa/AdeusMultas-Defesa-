/**
 * Test script for ComfyUI Marketing Integration
 * Run this script to verify the integration is working
 */

import { comfyuiMarketing } from './src/server/integrations/comfyui-marketing';
import { comfyuiWorker } from './src/server/workers/comfyui-worker';

async function testComfyUIIntegration() {
  console.log('🧪 Testing ComfyUI Marketing Integration...\n');

  // Test 1: Connection
  console.log('1️⃣ Testing connection to ComfyUI server...');
  const isConnected = await comfyuiMarketing.testConnection();
  console.log(`   Connection: ${isConnected ? '✅ Connected' : '❌ Failed'}`);

  if (!isConnected) {
    console.log('\n❌ Cannot continue without ComfyUI connection');
    console.log('   Make sure ComfyUI is running on http://localhost:8188');
    return;
  }

  // Test 2: Get available models
  console.log('\n2️⃣ Getting available models...');
  const models = await comfyuiMarketing.getAvailableModels();
  console.log(`   Checkpoints: ${models.checkpoints.length} available`);
  console.log(`   VAE: ${models.vae.length} available`);
  console.log(`   CLIP: ${models.clip.length} available`);

  // Test 3: Generate test image
  console.log('\n3️⃣ Generating test image...');
  try {
    const testImageRequest = {
      type: 'social-media' as const,
      topic: 'defesa de multa',
      platform: 'instagram' as const,
      style: 'professional' as const
    };

    const startTime = Date.now();
    const images = await comfyuiMarketing.generateImage(testImageRequest);
    const duration = Date.now() - startTime;

    console.log(`   Generated ${images.length} image(s) in ${duration}ms`);
    if (images.length > 0) {
      console.log(`   Output files: ${images.join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Image generation failed: ${error}`);
  }

  // Test 4: Test worker integration
  console.log('\n4️⃣ Testing worker integration...');
  const workerStatus = comfyuiWorker.getStatus();
  console.log(`   Worker available: ${workerStatus.isAvailable ? '✅ Yes' : '❌ No'}`);
  console.log(`   Worker running: ${workerStatus.isRunning ? '🔄 Yes' : '⏸️ No'}`);

  // Test 5: Generate content for Criador Agent
  console.log('\n5️⃣ Testing Criador Agent integration...');
  try {
    const contentResult = await comfyuiWorker.generateContentForCriadorAgent(
      'social-media',
      'defesa de multa',
      ['instagram', 'facebook']
    );

    console.log(`   Generated images for ${contentResult.images.size} platforms`);
    console.log(`   Generated videos: ${contentResult.videos.size}`);
  } catch (error) {
    console.log(`   ❌ Criador Agent integration failed: ${error}`);
  }

  console.log('\n✅ Integration test completed!');
  console.log('\nNext steps:');
  console.log('1. Verify images were generated in ComfyUI output folder');
  console.log('2. Check Marketing OS logs for generation details');
  console.log('3. Test with different content types and platforms');
}

// Run the test
testComfyUIIntegration().catch(console.error);