import { register } from 'tsconfig-paths';

export async function globalSetup() {
  console.log('Registering path aliases');
  // Register path aliases for TypeScript imports
  register({
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*']
    }
  });
}