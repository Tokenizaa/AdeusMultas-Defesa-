import { createApp } from './src/server/app';

const app = createApp();
app.listen(5000, () => {
  console.log('[test] http://localhost:5000');
});
