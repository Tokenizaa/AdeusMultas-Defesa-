import { SearchConfig } from './types';
import { runScrape } from './persister';
import { logger } from './logger';

function parseArgs(): { command: string; config: SearchConfig } {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  const config: SearchConfig = {
    queries: [],
    cities: [],
    states: [],
    limitPerQuery: 10,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--query' || arg === '-q') && args[i + 1]) {
      config.queries.push(args[i + 1]);
      i += 1;
    } else if ((arg === '--city' || arg === '-c') && args[i + 1]) {
      config.cities.push(args[i + 1]);
      i += 1;
    } else if ((arg === '--state' || arg === '-s') && args[i + 1]) {
      config.states.push(args[i + 1]);
      i += 1;
    } else if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      config.limitPerQuery = Math.max(1, Math.min(50, parseInt(args[i + 1] || '10', 10) || 10));
      i += 1;
    }
  }

  if (config.queries.length === 0) {
    config.queries = ['despachante de trânsito', 'advogado direito de trânsito'];
  }

  return { command, config };
}

async function main() {
  const { command, config } = parseArgs();

  if (command !== 'run') {
    console.log('Uso: npx tsx src/scraper-prospecting/cli.ts run [--query "texto"] [--city "Cidade"] [--state "UF"] [--limit 10]');
    process.exit(0);
  }

  logger.info('Iniciando coleta de prospecção B2B', { config });
  const result = await runScrape(config);

  logger.info('Coleta finalizada', {
    totalFound: result.totalFound,
    inserted: result.inserted,
    duplicates: result.duplicates,
    rejected: result.rejected,
    errors: result.errors,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  logger.error('Falha fatal no scraper', { error: err instanceof Error ? err.message : err });
  process.exit(1);
});