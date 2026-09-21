import fetch from 'node-fetch';
import 'dotenv/config';

const projectRef = 'llmxnpgjpxcvyrqjkfwb';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cases'
    ORDER BY ordinal_position;
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ query: sql })
});

const text = await res.text();
console.log('Status:', res.status);
console.log('Response:', text);
