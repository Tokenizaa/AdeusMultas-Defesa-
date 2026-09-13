import express from 'express';
console.log('STEP 1 - express loaded');
import { createApp } from './src/server/app.ts';
console.log('STEP 2 - createApp imported');
const app = createApp();
console.log('STEP 3 - createApp() called');
app.get('/test', (req, res) => res.json({ ok: true }));
app.listen(5000, () => console.log('STEP 4 - LISTENING on 5000'));
