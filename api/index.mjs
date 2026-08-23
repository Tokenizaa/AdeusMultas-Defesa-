export default async function handler() {
  return new Response(
    JSON.stringify({
      error: 'API_NOT_BUNDLED',
      message: 'This static stub was replaced during build by scripts/build-api.mjs. If you see this, the build step did not run.',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
