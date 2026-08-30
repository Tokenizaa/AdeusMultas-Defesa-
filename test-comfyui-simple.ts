#!/usr/bin/env node

/**
 * Simple test script for ComfyUI Marketing Integration
 * Run this to verify the integration is working
 * 
 * Usage: npx tsx test-comfyui-simple.ts
 */

import http from 'http';

const COMFYUI_URL = 'http://localhost:8188';

async function testConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    http.get(`${COMFYUI_URL}/system_stats`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const stats = JSON.parse(data);
          console.log('✅ ComfyUI connected successfully!');
          console.log(`   Version: ${stats.system?.comfyui_version}`);
          console.log(`   RAM: ${Math.round(stats.system?.ram_total / 1024 / 1024 / 1024)}GB`);
          resolve(true);
        } catch (e) {
          console.log('❌ Failed to parse ComfyUI response');
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log('❌ Cannot connect to ComfyUI');
      console.log(`   Make sure ComfyUI is running on ${COMFYUI_URL}`);
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function getAvailableModels(): Promise<void> {
  return new Promise((resolve) => {
    http.get(`${COMFYUI_URL}/object_info`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const objectInfo = JSON.parse(data);
          
          console.log('\n📦 Available Models:');
          
          if (objectInfo.CheckpointLoaderSimple) {
            const checkpoints = objectInfo.CheckpointLoaderSimple.input.required.ckpt_name[0];
            console.log(`   Checkpoints: ${checkpoints.length} available`);
            if (checkpoints.length > 0) {
              console.log(`   First checkpoint: ${checkpoints[0]}`);
            }
          }
          
          if (objectInfo.VAELoader) {
            const vae = objectInfo.VAELoader.input.required.vae_name[0];
            console.log(`   VAE: ${vae.length} available`);
          }
          
          if (objectInfo.CLIPLoader) {
            const clip = objectInfo.CLIPLoader.input.required.clip_name[0];
            console.log(`   CLIP: ${clip.length} available`);
          }
          
          resolve();
        } catch (e) {
          console.log('❌ Failed to parse models');
          resolve();
        }
      });
    }).on('error', (err) => {
      console.log('❌ Failed to get models');
      resolve();
    });
  });
}

async function queueTestWorkflow(): Promise<void> {
  console.log('\n🧪 Queuing test workflow...');
  
  const workflow = {
    "1": {
      "class_type": "LoadCheckpoint",
      "inputs": {
        "ckpt_name": "flux1-dev.safetensors"
      }
    },
    "2": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": "A professional Brazilian lawyer in a modern office, traffic law, justice, scales of justice",
        "clip": ["1", 1]
      }
    },
    "3": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": "low quality, blurry",
        "clip": ["1", 1]
      }
    },
    "4": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": 512,
        "height": 512,
        "batch_size": 1
      }
    },
    "5": {
      "class_type": "KSampler",
      "inputs": {
        "seed": 42,
        "steps": 10,
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
        "filename_prefix": "marketing_test",
        "images": ["6", 0]
      }
    }
  };

  return new Promise((resolve) => {
    const postData = JSON.stringify({ prompt: workflow });
    
    const options = {
      hostname: 'localhost',
      port: 8188,
      path: '/prompt',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Workflow queued successfully!');
          console.log(`   Prompt ID: ${result.prompt_id}`);
          console.log('\n💡 Check ComfyUI interface at http://localhost:8188');
          console.log('   Look for "marketing_test" in the output folder');
          resolve();
        } catch (e) {
          console.log('❌ Failed to queue workflow');
          console.log(`   Response: ${data}`);
          resolve();
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Failed to queue workflow');
      console.log(`   Error: ${err.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🚀 ComfyUI Marketing Integration Test\n');
  
  // Test 1: Connection
  const connected = await testConnection();
  if (!connected) {
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure ComfyUI is running');
    console.log('   2. Start with: comfyui --listen --port 8188');
    console.log('   3. Check if port 8188 is accessible');
    return;
  }
  
  // Test 2: Get models
  await getAvailableModels();
  
  // Test 3: Queue test workflow
  await queueTestWorkflow();
  
  console.log('\n✨ Test completed!');
  console.log('\n📚 Next steps:');
  console.log('   1. Check ComfyUI interface for generated image');
  console.log('   2. Integrate with Marketing OS');
  console.log('   3. See COMFYUI-INTEGRATION.md for details');
}

main().catch(console.error);