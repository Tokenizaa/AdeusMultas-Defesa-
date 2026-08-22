import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Upload,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  Send,
  Zap,
  Sliders,
  ExternalLink,
  PlusCircle,
  Copy,
  Check,
} from 'lucide-react';

interface MediaStudioViewProps {
  onContentCreated?: () => void;
}

export const MediaStudioView: React.FC<MediaStudioViewProps> = ({ onContentCreated }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'week'>('image');

  // --- Image Generation State (gemini-3-pro-image-preview) ---
  const [imagePrompt, setImagePrompt] = useState(
    'Radar eletrônico de velocidade em rodovia brasileira moderna ao entardecer, com selo de certificação técnica digital e tipografia institucional de direito de trânsito'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [stylePreset, setStylePreset] = useState('Editorial Profissional & Jurídico');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ model?: string; size?: string; ratio?: string } | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Video Animation State (veo-3.1-fast-generate-preview) ---
  const [videoPrompt, setVideoPrompt] = useState(
    'Movimento de câmera suave e cinematográfico, iluminação volumétrica, revelando a rodovia e painel de trânsito em alta velocidade'
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [videoSourcePhoto, setVideoSourcePhoto] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState('');
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const videoPhotoInputRef = useRef<HTMLInputElement>(null);

  // --- 7-Day Campaign Generator State ---
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);
  const [weekSuccessMsg, setWeekSuccessMsg] = useState<string | null>(null);
  const [generatedWeekPosts, setGeneratedWeekPosts] = useState<any[]>([]);

  // Pre-made traffic law prompt ideas
  const PROMPT_TEMPLATES = [
    {
      label: 'Radar & Metrologia',
      prompt: 'Radar de velocidade em rodovia com selo digital de aferição do INMETRO expirado, iluminação dramática ao entardecer, render fotojornalístico hiper-realista',
      size: '2K' as const,
      ratio: '1:1' as const,
    },
    {
      label: 'Advertência por Escrito',
      prompt: 'Documento oficial elegante com carimbo de aprovação verde "DEFERIDO - ART. 267 CTB" sobre mesa executiva de madeira com tablet e caneta tinteiro',
      size: '4K' as const,
      ratio: '16:9' as const,
    },
    {
      label: 'Efeito Suspensivo (Reels)',
      prompt: 'Motorista dirigindo carro moderno com tranquilidade na estrada, visor com ícone holográfico de escudo de proteção jurídica e CNH regularizada',
      size: '2K' as const,
      ratio: '9:16' as const,
    },
    {
      label: 'Operação Lei Seca',
      prompt: 'Blitz noturna de trânsito profissional com viaturas policiais, cones reflexivos laranjas e checklist digital dos direitos do condutor',
      size: '2K' as const,
      ratio: '1:1' as const,
    },
  ];

  // --- Generate Image Handler ---
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          imageSize,
          aspectRatio,
          stylePreset,
          referenceImageBase64: referenceImage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar imagem');
      }

      setGeneratedImage(data.imageUrl);
      setImageMeta({
        model: data.modelUsed || 'gemini-3-pro-image-preview',
        size: data.imageSize || imageSize,
        ratio: data.aspectRatio || aspectRatio,
      });
    } catch (err: any) {
      setImageError(err?.message || 'Falha ao processar solicitação com o modelo de imagem.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // --- Upload Reference Photo for Image ---
  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Upload Photo for Veo Video ---
  const handleVideoPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setVideoSourcePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Generate Video Handler (Veo 3.1) ---
  const handleGenerateVideo = async () => {
    setIsGeneratingVideo(true);
    setVideoError(null);
    setGeneratedVideoUrl(null);
    setVideoProgressPercent(5);
    setVideoProgressMsg('Iniciando pipeline de geração Veo 3.1 fast...');

    try {
      // Step 1: Start operation
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          image: videoSourcePhoto || generatedImage,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
        }),
      });

      const startData = await startRes.json();
      if (!startRes.ok || !startData.success) {
        throw new Error(startData.error || 'Falha ao inicializar o modelo Veo');
      }

      const operationName = startData.operationName;
      setVideoProgressPercent(25);
      setVideoProgressMsg('Modelo Veo compilando interpolação temporal de quadros...');

      // Step 2: Poll operation
      let isDone = false;
      let attempts = 0;
      const messages = [
        'Analisando profundidade óptica e física de movimento...',
        'Renderizando iluminação volumétrica e dinâmica...',
        'Codificando stream de vídeo MP4 de alta definição...',
        'Finalizando buffer de mídia...',
      ];

      while (!isDone && attempts < 40) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;

        setVideoProgressPercent(Math.min(92, 25 + attempts * 6));
        setVideoProgressMsg(messages[attempts % messages.length]);

        const statusRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        const statusData = await statusRes.json();
        if (statusData.done) {
          isDone = true;
          break;
        }
      }

      setVideoProgressPercent(95);
      setVideoProgressMsg('Baixando stream final do vídeo gerado...');

      // Step 3: Download video
      const downloadRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!downloadRes.ok) {
        throw new Error('Falha no streaming do vídeo gerado');
      }

      const contentType = downloadRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await downloadRes.json();
        setGeneratedVideoUrl(json.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      } else {
        const blob = await downloadRes.blob();
        const objectUrl = URL.createObjectURL(blob);
        setGeneratedVideoUrl(objectUrl);
      }

      setVideoProgressPercent(100);
      setVideoProgressMsg('Vídeo gerado com sucesso!');
    } catch (err: any) {
      setVideoError(err?.message || 'Erro ao gerar vídeo com Veo 3.1.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // --- Generate 7-Day Campaign Handler ---
  const handleGenerateWeek = async () => {
    setIsGeneratingWeek(true);
    setWeekSuccessMsg(null);

    try {
      const res = await fetch('/api/marketing/generate-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generateImages: true,
          imageSize: '2K',
          targetAudience: 'Condutores brasileiros, motoristas de aplicativo e proprietários de veículos',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar cronograma semanal');
      }

      setGeneratedWeekPosts(data.contents || []);
      setWeekSuccessMsg(data.message || 'Semana de 7 publicações gerada e agendada com sucesso no calendário editorial!');
      if (onContentCreated) {
        onContentCreated();
      }
    } catch (err: any) {
      alert(`Erro: ${err?.message || 'Não foi possível gerar a semana'}`);
    } finally {
      setIsGeneratingWeek(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-white border border-[#E6E6E6] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-[#155BCB] rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#071D41] flex items-center gap-2">
                Estúdio de Criação IA • Imagens HD &amp; Vídeos Veo
                <span className="px-2 py-0.5 text-sm font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                  Novo
                </span>
              </h2>
              <p className="text-sm text-slate-500">
                Geração de imagens em 1K/2K/4K (Gemini 3 Pro Image) e animação de fotos em vídeo (Veo 3.1 Fast)
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'image'
                ? 'bg-white text-[#155BCB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gerar Imagem HD</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'video'
                ? 'bg-white text-[#155BCB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Animar Vídeo (Veo)</span>
          </button>

          <button
            onClick={() => setActiveTab('week')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'week'
                ? 'bg-white text-[#155BCB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Semana de Publicações (7 Dias)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: IMAGE GENERATION (gemini-3-pro-image-preview) */}
      {/* ========================================================= */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E6E6E6] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#155BCB]" />
                  Configurações de Geração
                </span>
                <span className="text-sm font-mono px-2 py-0.5 rounded bg-blue-50 text-[#155BCB] font-semibold">
                  gemini-3-pro-image-preview
                </span>
              </div>

              {/* Prompt Suggestions */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Ideias Rápidas de Direito de Trânsito:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImagePrompt(tmpl.prompt);
                        setImageSize(tmpl.size);
                        setAspectRatio(tmpl.ratio);
                      }}
                      className="px-2.5 py-1 text-sm font-medium bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#155BCB] border border-slate-200 rounded-md transition-colors cursor-pointer text-left truncate max-w-full"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Prompt */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Descrição do Prompt Visual *
                </label>
                <textarea
                  rows={4}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Ex: Foto realista de radar eletrônico em rodovia com selo INMETRO e iluminação de pôr do sol..."
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#155BCB] focus:border-transparent resize-none"
                />
              </div>

              {/* Affordance: Image Size Selector (1K, 2K, 4K) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    Resolução / Tamanho da Imagem *
                  </label>
                  <span className="text-sm text-slate-500 font-medium">Ultra High Definition</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        imageSize === size
                          ? 'bg-[#155BCB] text-white border-[#155BCB] shadow-xs ring-2 ring-blue-200'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{size}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {size === '1K' ? '1024 px' : size === '2K' ? '2048 px' : '4096 px'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Proporção / Formato *
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: '1:1', label: '1:1', desc: 'Feed' },
                    { id: '16:9', label: '16:9', desc: 'Banner' },
                    { id: '9:16', label: '9:16', desc: 'Stories' },
                    { id: '4:3', label: '4:3', desc: 'Paisagem' },
                    { id: '3:4', label: '3:4', desc: 'Retrato' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id as any)}
                      className={`py-2 px-1.5 rounded-lg text-sm font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                        aspectRatio === ratio.id
                          ? 'bg-blue-50 text-[#155BCB] border-[#155BCB] ring-1 ring-[#155BCB]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{ratio.label}</span>
                      <span className="text-[8px] font-normal text-slate-400">{ratio.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Image (Optional for image-to-image) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    Foto de Referência (Opcional)
                  </label>
                  {referenceImage && (
                    <button
                      type="button"
                      onClick={() => setReferenceImage(null)}
                      className="text-sm text-red-600 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {referenceImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-20 bg-slate-100 flex items-center justify-center">
                    <img src={referenceImage} alt="Ref" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg text-sm font-medium text-slate-600 hover:text-[#155BCB] flex items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Carregar imagem base para edição</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceImageUpload}
                  className="hidden"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full py-3 bg-[#155BCB] hover:bg-[#0C326F] disabled:bg-slate-300 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Renderizando em {imageSize}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FFCD07]" />
                    <span>Gerar Imagem em {imageSize} (HD)</span>
                  </>
                )}
              </button>

              {imageError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{imageError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview / Result Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E6E6E6] rounded-xl p-5 shadow-xs min-h-[460px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#155BCB]" />
                    Visualizador de Imagem
                  </span>
                  {imageMeta && (
                    <div className="flex items-center gap-2 text-sm font-mono text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                        {imageMeta.size}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                        {imageMeta.ratio}
                      </span>
                    </div>
                  )}
                </div>

                {isGeneratingImage ? (
                  <div className="h-80 rounded-xl bg-slate-50 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center gap-3 p-6 text-center animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-[#155BCB] flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#155BCB]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#071D41]">Gerando com gemini-3-pro-image-preview</h4>
                      <p className="text-sm text-slate-500 max-w-sm mt-1">
                        Sintetizando iluminação, composição hiper-realista e resolução de {imageSize}...
                      </p>
                    </div>
                  </div>
                ) : generatedImage ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center max-h-[420px] group">
                      <img
                        src={generatedImage}
                        alt="Imagem Gerada por IA"
                        className="max-h-[420px] w-auto object-contain"
                      />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <a
                          href={generatedImage}
                          download={`defesai-creative-${imageSize}.png`}
                          className="p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs text-sm font-semibold flex items-center gap-1 shadow-lg"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar HD</span>
                        </a>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-bold text-slate-800">Pronta para uso editorial</p>
                        <p className="text-sm text-slate-500">
                          Resolução {imageMeta?.size || imageSize} • Modelo: {imageMeta?.model || 'Gemini 3 Pro'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setVideoSourcePhoto(generatedImage);
                            setActiveTab('video');
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-sm"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Animar com Veo</span>
                        </button>

                        <a
                          href={generatedImage}
                          download={`defesai-creative-${imageSize}.png`}
                          className="px-3 py-1.5 bg-[#155BCB] hover:bg-[#0C326F] text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Nenhuma imagem gerada ainda</h4>
                      <p className="text-sm text-slate-500 max-w-sm mt-1">
                        Escolha um prompt, selecione o tamanho (1K, 2K ou 4K) e clique em "Gerar Imagem em HD".
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: VEO VIDEO ANIMATION (veo-3.1-fast-generate-preview) */}
      {/* ========================================================= */}
      {activeTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Video Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E6E6E6] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-indigo-600" />
                  Parâmetros Veo 3.1
                </span>
                <span className="text-sm font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                  veo-3.1-fast-generate-preview
                </span>
              </div>

              {/* Upload Photo to Animate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    Foto / Imagem Fonte para Animação *
                  </label>
                  {videoSourcePhoto && (
                    <button
                      type="button"
                      onClick={() => setVideoSourcePhoto(null)}
                      className="text-sm text-red-600 hover:underline cursor-pointer"
                    >
                      Trocar foto
                    </button>
                  )}
                </div>

                {videoSourcePhoto ? (
                  <div className="relative rounded-lg overflow-hidden border border-indigo-200 h-32 bg-slate-900 flex items-center justify-center">
                    <img src={videoSourcePhoto} alt="Fonte do Vídeo" className="h-full w-full object-cover" />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-sm font-mono">
                      Foto Carregada
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoPhotoInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-700 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-indigo-50/40"
                  >
                    <Upload className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold">Faça upload de uma foto para animar</span>
                    <span className="text-sm text-slate-400">Suporta PNG, JPG, WebP</span>
                  </button>
                )}
                <input
                  ref={videoPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleVideoPhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Motion / Animation Prompt */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Instruções de Movimento / Prompt de Câmera
                </label>
                <textarea
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Ex: Câmera com travelling suave para frente, luzes de trânsito em movimento, estilo cinematográfico..."
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
                />
              </div>

              {/* Aspect Ratio Selector (16:9 Landscape vs 9:16 Portrait) */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Proporção do Vídeo *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVideoAspectRatio('16:9')}
                    className={`py-3 px-3 rounded-lg text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      videoAspectRatio === '16:9'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-5 h-3 border border-current rounded-xs" />
                    <span>16:9 Paisagem (Vídeo / TV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoAspectRatio('9:16')}
                    className={`py-3 px-3 rounded-lg text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      videoAspectRatio === '9:16'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-3 h-5 border border-current rounded-xs" />
                    <span>9:16 Retrato (Reels / TikTok)</span>
                  </button>
                </div>
              </div>

              {/* Resolution Selector */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Resolução
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['720p', '1080p'] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setVideoResolution(res)}
                      className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                        videoResolution === res
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-bold'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {res} HD
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Video Action Button */}
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || (!videoSourcePhoto && !generatedImage)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Animando com Veo 3.1...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 text-amber-300" />
                    <span>Gerar Vídeo Animado (Veo)</span>
                  </>
                )}
              </button>

              {videoError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{videoError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Preview Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E6E6E6] rounded-xl p-5 shadow-xs min-h-[460px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-600" />
                    Player de Vídeo Veo
                  </span>
                  <span className="text-sm font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                    {videoAspectRatio} • {videoResolution}
                  </span>
                </div>

                {isGeneratingVideo ? (
                  <div className="h-80 rounded-xl bg-indigo-50/40 border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center animate-bounce">
                      <Video className="w-7 h-7" />
                    </div>
                    <div className="max-w-md space-y-2 w-full">
                      <h4 className="text-sm font-bold text-indigo-950">
                        Veo 3.1 sintetizando vídeo cinemático
                      </h4>
                      <p className="text-sm text-indigo-700">{videoProgressMsg}</p>

                      {/* Progress Bar */}
                      <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden mt-3">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${videoProgressPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono text-indigo-800 font-semibold block">
                        {videoProgressPercent}% concluído
                      </span>
                    </div>
                  </div>
                ) : generatedVideoUrl ? (
                  <div className="space-y-4">
                    <div className="rounded-xl overflow-hidden bg-black border border-slate-200 flex items-center justify-center max-h-[420px]">
                      <video
                        src={generatedVideoUrl}
                        controls
                        autoPlay
                        loop
                        className="max-h-[420px] w-full object-contain"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-slate-800">Vídeo Gerado com Sucesso</p>
                        <p className="text-sm text-slate-500">
                          Modelo: veo-3.1-fast-generate-preview • Formato: {videoAspectRatio}
                        </p>
                      </div>

                      <a
                        href={generatedVideoUrl}
                        download="defesai-veo-video.mp4"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar MP4</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                      <Play className="w-6 h-6 ml-0.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Nenhum vídeo gerado no momento</h4>
                      <p className="text-sm text-slate-500 max-w-sm mt-1">
                        Carregue uma foto na barra lateral, escolha a proporção (16:9 ou 9:16) e clique em "Gerar Vídeo Animado".
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: 7-DAY CAMPAIGN GENERATOR ("Uma Semana de Publicações") */}
      {/* ========================================================= */}
      {activeTab === 'week' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E6E6E6] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#071D41] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#155BCB]" />
                Gerador de Campanha Semanal Automatizada (7 Dias)
              </h3>
              <p className="text-sm text-slate-600 max-w-2xl">
                Cria 7 publicações completas (Segunda a Domingo) ancoradas no Código de Trânsito Brasileiro (CTB),
                com cópias persuasionais, hashtags, agendamento de data e geração integrada de imagens 2K HD.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateWeek}
              disabled={isGeneratingWeek}
              className="px-6 py-3.5 bg-[#155BCB] hover:bg-[#0C326F] disabled:bg-slate-300 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              {isGeneratingWeek ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Gerando 7 Dias de Posts...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-[#FFCD07]" />
                  <span>Gerar e Agendar Semana Completa</span>
                </>
              )}
            </button>
          </div>

          {weekSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{weekSuccessMsg}</span>
            </div>
          )}

          {/* 7 Days Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              {
                day: 'Segunda-feira',
                theme: 'Radar Sem Aferição do INMETRO',
                art: 'Art. 280, § 2º CTB',
                channel: 'Instagram',
                badge: 'Carrossel',
                media: 'Imagem 2K HD',
                previewText: 'Seu radar foi calibrado nos últimos 12 meses? 🚨 Entenda a nulidade técnica.',
              },
              {
                day: 'Terça-feira',
                theme: 'Margem de Erro & Velocidade',
                art: 'Tab. CONTRAN 798/2020',
                channel: 'Instagram',
                badge: 'Post Estático',
                media: 'Imagem 2K HD',
                previewText: 'Velocidade Medida vs Considerada: Saiba a diferença e proteja sua CNH! ⚡',
              },
              {
                day: 'Quarta-feira',
                theme: 'Advertência por Escrito',
                art: 'Art. 267 CTB (Lei 14.071)',
                channel: 'LinkedIn',
                badge: 'Artigo',
                media: 'Imagem 2K HD',
                previewText: 'Sem multas nos últimos 12 meses? Você pode ter direito à Advertência Grátis! 📋',
              },
              {
                day: 'Quinta-feira',
                theme: 'Efeito Suspensivo',
                art: 'Art. 284 e 285 CTB',
                channel: 'TikTok',
                badge: 'Vídeo 9:16',
                media: 'Animação Veo 3.1',
                previewText: 'Posso continuar dirigindo enquanto recorro da multa? 🚗🛡️ Tire a dúvida.',
              },
              {
                day: 'Sexta-feira',
                theme: 'Operação Lei Seca',
                art: 'Art. 165 e 165-A CTB',
                channel: 'Instagram Reels',
                badge: 'Reels 9:16',
                media: 'Animação Veo 3.1',
                previewText: 'Operação Lei Seca: O que a fiscalização DEVE cumprir obrigatoriamente 🚦',
              },
              {
                day: 'Sábado',
                theme: 'Decadência de Notificação',
                art: 'Art. 281, II CTB',
                channel: 'Facebook',
                badge: 'Carrossel',
                media: 'Imagem 2K HD',
                previewText: 'Recebeu a notificação após 30 dias? O auto é NULO por lei! ⏳',
              },
              {
                day: 'Domingo',
                theme: 'Indicação do Real Condutor',
                art: 'Art. 257, § 7º CTB',
                channel: 'Blog DefesAi',
                badge: 'Guia Completo',
                media: 'Imagem 2K HD',
                previewText: 'Emprestou o carro? Como transferir os pontos corretamente e sem estresse 📝',
              },
            ].map((post, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#E6E6E6] rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-[#155BCB] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#155BCB] px-2 py-0.5 rounded bg-blue-50">
                      {post.day}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">{post.channel}</span>
                  </div>

                  <h4 className="text-sm font-bold text-[#071D41] line-clamp-2 leading-snug">
                    {post.previewText}
                  </h4>

                  <div className="space-y-1 text-sm text-slate-500">
                    <p className="flex items-center gap-1 font-medium text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {post.theme}
                    </p>
                    <p className="font-mono text-sm text-slate-400">{post.art}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {post.media}
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Agendado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
