import { metaAdapter } from './integrations/meta/adapters/meta-adapter';

async function main() {
  try {
    const result = await metaAdapter.publishContent({
      destination: 'instagram',
      message: '🚦 Apresentamos o Adeus Multas! Defesa de multas com IA em minutos. defesai.shop',
      mediaUrl: 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/17e1f2ef-e775-4478-b4e6-38cfa960eb9f_dia1.png',
      linkUrl: 'https://www.defesai.shop',
      contentId: '17e1f2ef-e775-4478-b4e6-38cfa960eb9f',
      pageId: '1199235773284220',
      instagramAccountId: '17841400928374829'
    });
    console.log('SUCCESS:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('ERROR:', err.message);
    console.error('CODE:', err.code);
  }
}

main();
