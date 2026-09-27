import 'dotenv/config';
import { createSupabaseAdminClient } from '../cloudflare/supabase';
const supabase = createSupabaseAdminClient({ SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY } as any);
(async () => {
  const { data } = await supabase.from('knowledge_chunks').select('id,source_id,document_id,document_version_id,jurisdiction,article_number,heading,content').limit(100);
  console.log('chunks:', data?.length);
  const arts = ['90','218','165','252','208','167','280','281','267','306','5º'];
  for (const a of arts) {
    const hits = (data||[]).filter((c:any) => new RegExp(`(?:art(?:igo)?\\.?\\s*${a}\\b|Art\\.\\s*${a}\\b)`,'i').test(c.content||''));
    console.log(`  Art.${a}: ${hits.length} chunks ->`, hits.map((h:any)=>`${h.id}(${h.jurisdiction},art=${h.article_number})`).slice(0,4).join(' '));
  }
  console.log('\narticle_number distribution:', JSON.stringify((data||[]).reduce((m:any,c:any)=>{m[String(c.article_number)]=(m[String(c.article_number)]||0)+1;return m;},{})));
  const { data: v } = await supabase.from('knowledge_document_versions').select('document_id,source_url').limit(100);
  console.log('\nversions com source_url:', (v||[]).filter((x:any)=>x.source_url).length, '/', v?.length);
  console.log('exemplos url:', (v||[]).slice(0,3).map((x:any)=>x.source_url));
  const { data: s } = await supabase.from('knowledge_sources').select('id,name,authority,jurisdiction,url').limit(50);
  console.log('\nsources com url:', (s||[]).filter((x:any)=>x.url).length, '/', s?.length);
})();
