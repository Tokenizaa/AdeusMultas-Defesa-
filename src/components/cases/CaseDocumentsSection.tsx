import React from 'react';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StoredDocument {
  id: string;
  case_id: string;
  service_type: string;
  status: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string | null;
}

async function getToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CaseDocumentsSection: React.FC<{ caseId: string }> = ({ caseId }) => {
  const [docs, setDocs] = React.useState<StoredDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [configured, setConfigured] = React.useState(true);

  const load = React.useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setConfigured(false);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/cases/${caseId}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha ao listar documentos');
      const { documents } = await res.json();
      setDocs(documents || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Erro ao listar documentos');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (file: File) => {
    if (!file) return;
    const token = await getToken();
    if (!token) {
      setError('Sessão indisponível. Faça login novamente.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/cases/${caseId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', content: base64 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha no upload');
      await load();
    } catch (e: any) {
      setError(e.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: StoredDocument) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha no download');
      const { signedUrl } = await res.json();
      window.open(signedUrl, '_blank');
    } catch (e: any) {
      setError(e.message || 'Erro ao baixar arquivo');
    }
  };

  const handleDelete = async (doc: StoredDocument) => {
    if (!window.confirm(`Remover ${doc.storage_path?.split('/').pop() || doc.id}?`)) return;
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha ao remover');
      await load();
    } catch (e: any) {
      setError(e.message || 'Erro ao remover arquivo');
    }
  };

  if (!configured) {
    return (
      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500">
          Armazenamento de anexos não configurado neste servidor. Anexos ficam disponíveis após configuração do Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 pt-4 mt-4">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2 font-mono">
        <FileText className="w-3.5 h-3.5 text-slate-700" />
        Anexos do Caso (evidências)
      </h3>

      <label className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-orange-400 cursor-pointer text-sm text-slate-600 transition-colors">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Enviando...' : 'Enviar anexo (foto / PDF da multa)'}
        <input
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && void handleUpload(e.target.files[0])}
        />
      </label>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="mt-3 space-y-1.5">
        {loading ? (
          <p className="text-xs text-slate-400">Carregando anexos...</p>
        ) : docs.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum anexo enviado ainda.</p>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate text-slate-800 font-medium">
                  {doc.storage_path?.split('/').pop()}
                </span>
                <span className="text-slate-400 text-xs shrink-0">{formatSize(doc.size_bytes)}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => void handleDownload(doc)}
                  title="Baixar"
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => void handleDelete(doc)}
                  title="Remover"
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};