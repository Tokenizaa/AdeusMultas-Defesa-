import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://llmxnpgjpxcvyrqjkfwb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbXhucGdqcHhjdnlycWprZndiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE0OTUyMCwiZXhwIjoyMDk5NzI1NTIwfQ.T8lXnaY50othF1JIo2isO6x25ONAWQIjM23VffzakdA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('editorial_content')
    .select('*')
    .in('id', [
      '17e1f2ef-e775-4478-b4e6-38cfa960eb9f',
      '6d246b93-d6e7-466d-a2d5-b1a2efdd1324',
      '40bd46d6-12ed-41df-a41e-d6e1ec62db64',
      '22bd4696-1feb-4465-a640-577fc356e9b3',
      'e8e498f4-509d-4e7c-902e-2f0aac56cbdd',
      'be623f95-af80-425b-b60a-45b0e8e76a2d',
      '5d26abae-fc97-418a-a8ec-ebde0ee4cae3',
    ]);

  if (error) {
    console.error('Erro ao buscar:', error);
    return;
  }

  console.log(`Encontrados: ${data.length} conteúdos\n`);

  for (const item of data) {
    const imageUrl = item.image_url || item.mediaUrl;
    const hashtags = Array.isArray(item.hashtags) ? item.hashtags.join(' ') : '';
    const caption = `${item.copyText || item.title}\n\n${hashtags}`.trim();

    console.log(`Publicando: ${item.title}`);
    console.log(`  Image: ${imageUrl ? 'SIM' : 'NAO'}`);

    if (!imageUrl) {
      console.log(`  [SKIP] Sem imagem\n`);
      continue;
    }

    // Atualizar status para agendado
    await supabase
      .from('editorial_content')
      .update({ status: 'agendado' })
      .eq('id', item.id);

    console.log(`  [OK] Marcado como agendado\n`);
  }

  console.log('Concluído!');
}

main().catch(console.error);