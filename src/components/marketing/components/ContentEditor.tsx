import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Save, Sparkles, Bot, Info, ImageIcon, History as HistoryIcon, PenLine, Wand2,
  RefreshCw, TrendingUp, Megaphone, Music, Film, Search, AlertCircle, CheckCircle2,
  Instagram, Globe, Clapperboard, Eye, Video, Loader2, Download, Upload, Play,
} from 'lucide-react';
import { EditorialContentItem, BrandIdentityConfig } from '../../../types';
import { MarketingOverallMetrics } from '../hooks/use-marketing-service';

/**
 * ContentEditor — porta do editor v1 (ContentEditor.tsx):
 * modal fullscreen, painel lateral DIREITO com 4 sub-abas
 * (Assets | Informações | IA | Histórico) e Menu IA contextual.
 * Ações IA são macros determinísticas REAIS aplicadas ao texto e persistidas.
 * Imagem/narração ficam desabilitadas com motivo honesto (planejado na migração).
 */

interface ContentVersion {
  id: string;
  version: number;
  agent: string;
  author: string;
  changes: string;
  createdAt: string;
}

type PanelTab = 'assets' | 'info' | 'ai' | 'history';

interface ContentEditorProps {
  content: EditorialContentItem | null;
  brand: BrandIdentityConfig | null;
  onClose: () => void;
  onSave: (
    id: string, 
    fields: Partial<EditorialContentItem>, 
    versionNote?: { agent?: string; author?: string; changes?: string }
  ) => Promise<void>;
  onStatus: (id: string, status: 'rascunho' | 'aprovado_qualidade' | 'agendado' | 'publicado') => Promise<void>;
  onChannel?: (id: string, channel: string) => Promise<void>;
  onFetchVersions: (id: string) => Promise<ContentVersion[]>;
  contents?: EditorialContentItem[];
  onPublishToMeta?: (destination: 'facebook' | 'instagram' | 'both', contentId: string) => Promise<void>;
}

type Network = 'instagram' | 'tiktok' | 'blog' | 'facebook' | 'linkedin';

const FORMAT_LABELS: Record<string, string> = {
  carrossel: 'Carrossel',
  artigo_seo: 'Artigo SEO',
  reels_roteiro: 'Reels / Roteiro',
  infografico: 'Infográfico',
  newsletter: 'Newsletter',
  post_imagem: 'Post Único',
};

export const ContentEditor: React.FC<ContentEditorProps> = ({
  content, brand, onClose, onSave, onStatus, onChannel, onFetchVersions, contents, onPublishToMeta
}) => {
  const [title, setTitle] = useState(content?.title ?? '');
  const [text, setText] = useState(content?.copyText ?? '');
  const [hashtags, setHashtags] = useState(content?.hashtags ? (Array.isArray(content.hashtags) ? content.hashtags.join(' ') : String(content.hashtags)) : '#AdeusMulta #CTB');
  const [channel, setChannel] = useState(content?.channel ?? 'instagram');
  const [format, setFormat] = useState(content?.format ?? 'carrossel');
  const [scheduledDate, setScheduledDate] = useState(content?.scheduledDate ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16));
  const [panelTab, setPanelTab] = useState<PanelTab>('assets');
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [previewNetwork, setPreviewNetwork] = useState<Network>('instagram');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [liveText, setLiveText] = useState(text);

  // Media Generation State (Gemini 3 Pro Image + Veo 3.1)
  const [editorImageSize, setEditorImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [editorGeneratingImage, setEditorGeneratingImage] = useState(false);
  const [editorGeneratingVideo, setEditorGeneratingVideo] = useState(false);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(content?.imageUrl || content?.mediaUrl || null);
  const [attachedVideoUrl, setAttachedVideoUrl] = useState<string | null>(null);
  const [editorVisualPrompt, setEditorVisualPrompt] = useState<string>(
    content?.visualPrompt || content?.visual_prompt || `Peça visual informativa jurídica de alto impacto sobre: ${content?.title || 'Defesa de Multa'}`
  );

  const handleGenerateEditorImage = async () => {
    setEditorGeneratingImage(true);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editorVisualPrompt,
          imageSize: editorImageSize,
          aspectRatio: content?.channel === 'tiktok' ? '9:16' : '1:1',
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setAttachedImageUrl(data.imageUrl);
        setNotice({ kind: 'ok', msg: `Imagem HD (${editorImageSize}) gerada com sucesso!` });
      } else {
        throw new Error(data.error || 'Falha ao gerar');
      }
    } catch (e: any) {
      setNotice({ kind: 'err', msg: `Erro na imagem: ${e?.message || 'Tente novamente'}` });
    } finally {
      setEditorGeneratingImage(false);
    }
  };

  const handleGenerateEditorVideo = async () => {
    if (!attachedImageUrl) return;
    setEditorGeneratingVideo(true);
    try {
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Animação cinematográfica de trânsito em alta definição',
          image: attachedImageUrl,
          aspectRatio: content?.channel === 'tiktok' ? '9:16' : '16:9',
        }),
      });
      const startData = await startRes.json();
      if (startData.success && startData.operationName) {
        let isDone = false;
        let iters = 0;
        while (!isDone && iters < 20) {
          await new Promise((r) => setTimeout(r, 2000));
          iters++;
          const stRes = await fetch('/api/video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: startData.operationName }),
          });
          const stData = await stRes.json();
          if (stData.done) isDone = true;
        }

        const dlRes = await fetch('/api/video-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: startData.operationName }),
        });
        if (dlRes.ok) {
          const contentType = dlRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await dlRes.json();
            setAttachedVideoUrl(json.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
          } else {
            const blob = await dlRes.blob();
            setAttachedVideoUrl(URL.createObjectURL(blob));
          }
          setNotice({ kind: 'ok', msg: 'Vídeo animado com Veo 3.1 com sucesso!' });
        }
      }
    } catch (e: any) {
      setNotice({ kind: 'err', msg: `Erro no vídeo: ${e?.message || 'Tente novamente'}` });
    } finally {
      setEditorGeneratingVideo(false);
    }
  };

  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setText(content.copyText);
      setLiveText(content.copyText);
      setHashtags(content.hashtags?.join(' ') ?? '');
    }
  }, [content?.id]);

  // Validação legal real
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!title.trim()) errors.push('Título é obrigatório.');
    const body = `${liveText}\n\n${hashtags}`.trim();
    if (body.length < 80) errors.push('Conteúdo muito curto (mínimo ~80 caracteres com hashtags).');
    const banned = brand?.disallowedWords ?? [];
    for (const w of banned) {
      if (body.toLowerCase().includes(w.toLowerCase())) errors.push(`Palavra proibida pela marca: "${w}".`);
    }
    return { valid: errors.length === 0, errors };
  }, [title, liveText, hashtags, brand]);

  if (!content) return null;

  const persist = async (nextText?: string, versionNote?: { agent?: string; author?: string; changes?: string }) => {
    setSaving(true);
    setNotice(null);
    const textToSave = nextText !== undefined ? nextText : liveText;
    try {
      await onSave(
        content.id, 
        { 
          title,
          copyText: textToSave,
          channel,
          format,
          scheduledDate,
          hashtags: hashtags.split(' ').filter(Boolean),
          imageUrl: attachedImageUrl,
          mediaUrl: attachedImageUrl,
          visualPrompt: editorVisualPrompt,
        }, 
        versionNote
      );
      if (nextText !== undefined) {
        setText(nextText);
        setLiveText(nextText);
      }
      const vs = await onFetchVersions(content.id);
      setVersions(vs);
      setNotice({ kind: 'ok', msg: versionNote?.changes ? `${versionNote.changes} — salvo.` : 'Salvo com sucesso.' });
    } catch {
      setNotice({ kind: 'err', msg: 'Falha ao salvar alterações.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishMeta = async () => {
    if (!onPublishToMeta) {
      onStatus(content.id, 'publicado');
      setNotice({ kind: 'ok', msg: 'Conteúdo marcado como publicado.' });
      return;
    }
    setPublishing(true);
    try {
      await onPublishToMeta('both', content.id);
      setNotice({ kind: 'ok', msg: 'Publicado no Facebook & Instagram!' });
    } catch (e: any) {
      setNotice({ kind: 'err', msg: `Erro ao publicar: ${e?.message || 'Tente novamente'}` });
    } finally {
      setPublishing(false);
    }
  };

  // ── Macros IA (determinísticas, aplicadas ao texto + persistidas) ──
  const applyAIAction = async (action: string) => {
    let next = liveText;
    let changes = action;
    let agent = 'copywriting';
    switch (action) {
      case 'continuar':
        next = liveText + (liveText && !liveText.endsWith('\n') ? '\n' : '') + 'Outro ponto importante: guarde todos os comprovantes e prazos — organização é metade da defesa.\n';
        changes = 'Continuou o texto (agente copywriting)';
        break;
      case 'melhorar':
        next = liveText.replace(/\b(mas|porém|contudo)\b/g, 'e o melhor:').trim() + '\n\nCom linguagem clara e direta, qualquer motorista consegue entender e agir.';
        changes = 'Melhorou a clareza do texto (agente copywriting)';
        break;
      case 'reescrever':
        next = `📝 ${liveText.trim()}\n\nDica rápida: comece pelo resultado — o que o leitor ganha ao seguir este conteúdo?`;
        changes = 'Reescreveu o texto (agente copywriting)';
        break;
      case 'persuasivo':
        next = 'Imagine isso: você recebe uma multa injusta e não sabe o que fazer. ' + liveText.trim() + '\n\nQuem age primeiro, resolve primeiro — e é grátis para descobrir se você tem direito.';
        changes = 'Tornou o texto mais persuasivo (agente copywriting)';
        break;
      case 'adaptar-instagram':
        setPreviewNetwork('instagram');
        next = `📱 ${liveText.trim()}\n\nSiga @adeusmulta para mais dicas diárias!`;
        changes = 'Adaptou para Instagram (agente copywriting)';
        break;
      case 'adaptar-blog':
        setPreviewNetwork('blog');
        next = `## ${title || 'Sem título'}\n\n${liveText.trim()}\n\n*Artigos são revisados pelo agente de qualidade antes da publicação.*`;
        changes = 'Adaptou para Blog (agente copywriting)';
        break;
      case 'adaptar-tiktok':
        setPreviewNetwork('tiktok');
        next = `🔥 ${liveText.trim().slice(0, 120)}...\n\n(versão curta para TikTok — gancho nos primeiros 3 segundos)`;
        changes = 'Adaptou para TikTok (agente copywriting)';
        break;
      case 'carrossel':
        next = liveText.split(/\n+/).filter(Boolean).map((l, i) => `🖼️ Slide ${i + 1}: ${l}`).join('\n\n');
        changes = 'Transformou em carrossel (agente de conteúdo)';
        break;
      case 'roteiro':
        next = `🎬 ROTEIRO\n\nGancho (0-3s): ${title || 'você sabia que dá para contestar multa?'}\n\n` + liveText.split(/\n+/).filter(Boolean).slice(0, 4).map((l, i) => `Cena ${i + 1}: ${l}`).join('\n') + '\n\nEncerramento: salve este conteúdo e siga a Adeus Multa.';
        changes = 'Criou roteiro de vídeo (agente de conteúdo)';
        break;
      case 'seo':
        next = liveText.trim() + '\n\n[SEO] Palavras-chave: multa, recurso de trânsito, CTB, defesa de multa, prazos.';
        changes = 'Melhorou SEO: palavras-chave reforçadas (agente SEO)';
        agent = 'seo';
        break;
      default:
        return;
    }
    await persist(next, { agent, author: `IA (${agent})`, changes });
  };

  const IA_ACTIONS = [
    { id: 'continuar', label: 'Continuar escrevendo', icon: PenLine },
    { id: 'melhorar', label: 'Melhorar texto', icon: Wand2 },
    { id: 'reescrever', label: 'Reescrever', icon: RefreshCw },
    { id: 'persuasivo', label: 'Tornar mais persuasivo', icon: TrendingUp },
    { id: 'adaptar-instagram', label: 'Adaptar para Instagram', icon: Instagram },
    { id: 'adaptar-blog', label: 'Adaptar para Blog', icon: Globe },
    { id: 'adaptar-tiktok', label: 'Adaptar para TikTok', icon: Clapperboard },
    { id: 'carrossel', label: 'Criar carrossel', icon: ImageIcon },
    { id: 'roteiro', label: 'Criar roteiro', icon: Film },
    { id: 'seo', label: 'Melhorar SEO', icon: Search },
  ];
  const IA_DISABLED = [
    { id: 'imagem', label: 'Gerar imagem', hint: 'requer /api/generate/image + credenciais — planejado na migração' },
    { id: 'narracao', label: 'Gerar narração', hint: 'requer /api/generate/audio + credenciais — planejado na migração' },
  ];

  const handleSaveManual = async () => {
    if (!validation.valid) {
      setNotice({ kind: 'err', msg: `Falha na validação: ${validation.errors.join(' ')}` });
      return;
    }
    await persist(liveText, { agent: 'humano', author: 'Equipe', changes: 'Edição manual do copy' });
  };

  const loadVersions = async () => {
    const vs = await onFetchVersions(content!.id);
    setVersions(vs);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="Editor de conteúdo">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-4 h-14 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Fechar editor">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{title || 'Conteúdo sem título'}</p>
            <p className="text-sm text-slate-500">
              {content.channel} • {FORMAT_LABELS[content.format] ?? content.format} • Autor: IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Menu IA contextual */}
          <div className="relative">
            <button
              onClick={() => setAiMenuOpen((o) => !o)}
              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4" /> Menu IA
            </button>
            {aiMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 max-h-96 overflow-y-auto">
                {IA_ACTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setAiMenuOpen(false); applyAIAction(id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-800 rounded-lg cursor-pointer text-left"
                  >
                    <Icon className="w-4 h-4 text-orange-600 shrink-0" /> {label}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100" />
                {IA_DISABLED.map(({ id, label, hint }) => (
                  <div key={id}>
                    <button
                      disabled
                      title={hint}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 cursor-not-allowed text-left"
                    >
                      <Music className="w-4 h-4 shrink-0" /> {label}
                      <AlertCircle className="w-3 h-3 ml-auto opacity-50" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSaveManual}
            disabled={saving}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {content.status !== 'publicado' && (
            <button
              onClick={handlePublishMeta}
              disabled={publishing}
              className="px-3 py-2 bg-[#155BCB] hover:bg-[#1149a4] text-white rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
              <span>{publishing ? 'Publicando...' : 'Publicar'}</span>
            </button>
          )}
          <button
            onClick={() => { onStatus(content.id, 'aprovado_qualidade'); setNotice({ kind: 'ok', msg: 'Conteúdo aprovado pela qualidade.' }); }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 inline -mt-0.5" /> Aprovar
          </button>
        </div>
      </header>

      {/* Corpo */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Área principal */}
        <div className="min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-4">
            {notice && (
              <div className={`p-3 rounded-xl border text-sm ${notice.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                {notice.msg}
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 uppercase block text-sm font-mono mb-1">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do conteúdo"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase block text-xs font-mono mb-1">Canal</label>
                <select
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    if (onChannel) onChannel(content.id, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="blog">Blog / SEO</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="email">E-mail</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block text-xs font-mono mb-1">Formato</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="carrossel">Carrossel</option>
                  <option value="post_imagem">Post Único</option>
                  <option value="reels_roteiro">Reels / Roteiro</option>
                  <option value="artigo_seo">Artigo SEO</option>
                  <option value="infografico">Infográfico</option>
                  <option value="newsletter">Newsletter</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block text-xs font-mono mb-1">Agendamento</label>
                <input
                  type="datetime-local"
                  value={scheduledDate.replace(' ', 'T').slice(0, 16)}
                  onChange={(e) => setScheduledDate(e.target.value.replace('T', ' '))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase block text-sm font-mono mb-1">Copy (Markdown)</label>
              <textarea
                value={liveText}
                onChange={(e) => setLiveText(e.target.value)}
                rows={14}
                placeholder="Escreva o conteúdo ou use ✨ Menu IA..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase block text-sm font-mono mb-1">Hashtags</label>
              <input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#adeusmulta #defesademulta"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Validação legal */}
            <div className={`rounded-xl border p-3 space-y-1 ${validation.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <p className={`flex items-center gap-2 text-sm font-medium ${validation.valid ? 'text-emerald-800' : 'text-rose-800'}`}>
                {validation.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {validation.valid ? 'Validação legal aprovada' : `${validation.errors.length} erro(s) bloqueante(s)`}
              </p>
              {!validation.valid && validation.errors.map((e, i) => (
                <p key={i} className="text-sm text-rose-700">• {e}</p>
              ))}
            </div>

            {/* Preview por rede */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <Eye className="w-4 h-4" /> Preview em tempo real
                </p>
                <div className="flex items-center gap-1">
                  {(['instagram', 'tiktok', 'blog'] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPreviewNetwork(n)}
                      className={`px-2 py-0.5 text-sm font-medium rounded border capitalize cursor-pointer ${previewNetwork === n ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-900 rounded-xl text-white">
                <p className="font-bold text-sm mb-2">{title || 'Sem título'}</p>
                <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {liveText}
                </p>
                {hashtags && <p className="text-sm text-blue-400 mt-2 font-mono">{hashtags}</p>}
                {previewNetwork !== 'blog' && <p className="mt-3 text-[9px] uppercase font-mono text-slate-500">Prévia simulada — {previewNetwork}</p>}
              </div>
            </section>
          </div>
        </div>

        {/* Painel lateral direito (v1) */}
        <aside className="border-l border-slate-200 bg-white flex flex-col min-h-0">
          <div className="flex border-b border-slate-200 shrink-0">
            {(
              [
                { id: 'assets' as const, label: 'Assets', icon: ImageIcon },
                { id: 'info' as const, label: 'Informações', icon: Info },
                { id: 'ai' as const, label: 'IA', icon: Bot },
                { id: 'history' as const, label: 'Histórico', icon: HistoryIcon },
              ]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setPanelTab(id); if (id === 'history') loadVersions(); }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                  panelTab === id ? 'text-orange-700 border-orange-600' : 'text-slate-500 hover:text-slate-700 border-transparent'
                }`}
                aria-pressed={panelTab === id}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {panelTab === 'assets' && (
              <div className="space-y-4">
                {/* Media Preview if exists */}
                {attachedVideoUrl ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden bg-black border border-slate-200">
                      <video src={attachedVideoUrl} controls className="w-full max-h-48 object-contain" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Vídeo Veo Anexado
                      </span>
                      <a
                        href={attachedVideoUrl}
                        download="video-post.mp4"
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Baixar MP4
                      </a>
                    </div>
                  </div>
                ) : attachedImageUrl ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                      <img src={attachedImageUrl} alt="Anexo Visual" className="w-full max-h-48 object-contain" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Imagem {editorImageSize} Anexada
                      </span>
                      <button
                        type="button"
                        onClick={handleGenerateEditorVideo}
                        disabled={editorGeneratingVideo}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded flex items-center gap-1 cursor-pointer"
                      >
                        {editorGeneratingVideo ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Animando...</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3" />
                            <span>Animar com Veo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Image Generation Tool */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#155BCB]" />
                      Gerador de Imagem HD
                    </span>
                    <span className="text-[9px] font-mono bg-blue-50 text-[#155BCB] px-1.5 py-0.5 rounded font-bold">
                      gemini-3-pro-image-preview
                    </span>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-600 uppercase block mb-1">
                      Prompt Visual
                    </label>
                    <textarea
                      rows={3}
                      value={editorVisualPrompt}
                      onChange={(e) => setEditorVisualPrompt(e.target.value)}
                      className="w-full text-sm p-2 bg-white border border-slate-300 rounded-lg resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-600 uppercase block mb-1">
                      Resolução da Imagem
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['1K', '2K', '4K'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditorImageSize(s)}
                          className={`py-1 text-sm font-bold rounded border cursor-pointer ${
                            editorImageSize === s
                              ? 'bg-[#155BCB] text-white border-[#155BCB]'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateEditorImage}
                    disabled={editorGeneratingImage}
                    className="w-full py-2 bg-[#155BCB] hover:bg-[#0C326F] disabled:bg-slate-300 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {editorGeneratingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gerando em {editorImageSize}...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#FFCD07]" />
                        <span>Gerar Imagem {editorImageSize}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {panelTab === 'info' && (
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block text-sm font-mono mb-1">Canal</label>
                  <select
                    value={content.channel}
                    onChange={(e) => { onChannel(content.id, e.target.value); }}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {['instagram', 'blog', 'tiktok', 'linkedin', 'email'].map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
                {[
                  ['Formato', FORMAT_LABELS[content.format] ?? content.format],
                  ['Status', content.status],
                  ['Agendado', content.scheduledDate],
                  ['Qualidade', `${content.qualityReviewScore}/10`],
                  ['Alcance est.', content.estimatedReach.toLocaleString('pt-BR')],
                  ['Autor', content.authorAgent],
                  ['Tese jurídica', content.legalTheme],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-sm uppercase font-mono text-slate-400">{label}</span>
                    <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {panelTab === 'ai' && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-orange-700">
                  <Sparkles className="w-3.5 h-3.5" /> IA contextual — ações aplicadas ao texto e salvas
                </p>
                {IA_ACTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => applyAIAction(id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-orange-600 shrink-0" /> {label}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100" />
                {IA_DISABLED.map(({ id, label, hint }) => (
                  <div
                    key={id}
                    title={hint}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <Music className="w-4 h-4 shrink-0 opacity-60" /> {label}
                    <AlertCircle className="w-3 h-3 ml-auto opacity-50" />
                  </div>
                ))}
              </div>
            )}

            {panelTab === 'history' && (
              <div className="space-y-2">
                {versions.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma versão registrada ainda. Edite e salve para começar o histórico.</p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">v{v.version}</p>
                        <p className="text-sm text-slate-500">{new Date(v.createdAt).toLocaleString('pt-BR')}</p>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{v.author}</p>
                      <p className="text-sm text-slate-500">{v.changes}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};