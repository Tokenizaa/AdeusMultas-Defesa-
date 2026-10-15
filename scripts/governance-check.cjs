#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const planFeaturesPath = path.join(projectRoot, 'plan', 'features.json');
const requiredFiles = [
  path.join(projectRoot, 'loop', 'CHECKPOINT.md'),
  path.join(projectRoot, 'loop', 'loop.config.json'),
  path.join(projectRoot, 'plan', 'progress.md'),
  path.join(projectRoot, 'loop', 'inbox.items.md')
];

// Check plan/features.json exists and is valid JSON
if (!fs.existsSync(planFeaturesPath)) {
  console.error('plan/features.json does not exist');
  process.exit(1);
}

let features;
try {
  features = JSON.parse(fs.readFileSync(planFeaturesPath, 'utf8'));
} catch (e) {
  console.error('plan/features.json is not valid JSON');
  process.exit(1);
}

// Check that G0 is PASS (has at least one feature with passes: true)
const g0FeaturesWithPass = features.features.filter(f => f.phase === 'G0' && f.passes);
if (g0FeaturesWithPass.length === 0) {
  console.error('G0 is not PASS - no features with passes: true found');
  process.exit(1);
}

// Check that G1 is not active when G0 is PASS
const g0IsPass = g0FeaturesWithPass.length > 0;
const g1FeaturesWithPass = features.features.filter(f => f.phase === 'G1' && f.passes);
if (!g0IsPass && g1FeaturesWithPass.length > 0) {
  console.error('G1 feature has passes: true, but G0 is not PASS');
  process.exit(1);
}

// Check that all required files exist
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`${file} does not exist`);
    process.exit(1);
  }
});

console.log('All governance checks passed');
process.exit(0);
