import React, { useMemo, useState } from 'react';
import { ExternalLink, FileDown, ClipboardCheck, ShieldCheck, AlertTriangle } from 'lucide-react';

type Status = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_OBSERVED';
type Service = { key: string; label: string; stages: string[] };

const COMMON_STAGES = [
  'Serviço e situação — ServiceStep',
  'Fase do processo — DefenseStageStep',
  'Categoria da infração — InfractionCategoryStep',
  'Identificação da autuação — InfractionIdentificationStep',
  'Dados específicos da infração — SpecificInfractionDataStep',
  'Resultado da análise gratuita — FreeAnalysisResultStep',
  'Dados obrigatórios do documento — RequiredDataStep',
  'Revisão do documento — DocumentReviewStep',
  'Checkout e continuidade — DocumentCheckoutStep',
];

const SERVICES: Service[] = [
  { key: 'defesa_previa', label: 'Defesa prévia', stages: [...COMMON_STAGES] },
  { key: 'recurso_jari', label: 'Recurso JARI', stages: [...COMMON_STAGES] },
  { key: 'recurso_cetran', label: 'Recurso CETRAN', stages: [...COMMON_STAGES] },
  { key: 'suspensao', label: 'Suspensão da CNH', stages: [...COMMON_STAGES] },
  { key: 'cassacao', label: 'Cassação da CNH', stages: [...COMMON_STAGES] },
  { key: 'indicacao_condutor', label: 'Indicação de condutor', stages: [...COMMON_STAGES] },
  { key: 'conversao_advertencia', label: 'Conversão em advertência', stages: [...COMMON_STAGES] },
];

const DOMAINS = [
  'Produto e jornada', 'Frontend e UX', 'Backend e regras', 'Dados e isolamento',
  'Segurança e identidade', 'Inteligência jurídica', 'Pagamentos e faturamento',
  'Prospecção e marketing', 'Administração e operação', 'Infraestrutura e deploy',
  'Documentos e integridade', 'Integrações e confiabilidade', 'Operação, recuperação e evidências',
];

const STATUS_OPTIONS: Status[] = ['NOT_OBSERVED', 'PASS', 'FAIL', 'BLOCKED'];
const STORAGE_KEY = 'defesai_assisted_certification_v1';

type Assessment = { status: Status; evidence: string; finding: string };
type SavedSession = { serviceStatus: Record<string, Record<string, Assessment>>; domainStatus: Record<string, Assessment>; updatedAt: string };

const emptyAssessment = (): Assessment => ({ status: 'NOT_OBSERVED', evidence: '', finding: '' });
const initialSession = (): SavedSession => ({
  serviceStatus: Object.fromEntries(SERVICES.map((service) => [service.key, Object.fromEntries(service.stages.map((stage) => [stage, emptyAssessment()]))])),
  domainStatus: Object.fromEntries(DOMAINS.map((domain) => [domain, emptyAssessment()])),
  updatedAt: new Date().toISOString(),
});

function readSession(): SavedSession {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialSession();
    const parsed = JSON.parse(raw) as SavedSession;
    const base = initialSession();
    return {
      ...base,
      ...parsed,
      serviceStatus: { ...base.serviceStatus, ...(parsed.serviceStatus || {}) },
      domainStatus: { ...base.domainStatus, ...(parsed.domainStatus || {}) },
    };
  } catch {
    return initialSession();
  }
}

export const AdminAssistedCertificationView: React.FC = () => {
  const [session, setSession] = useState<SavedSession>(readSession);
  const [selectedService, setSelectedService] = useState(SERVICES[0].key);
  const [selectedStage, setSelectedStage] = useState(SERVICES[0].stages[0]);
  const [selectedDomain, setSelectedDomain] = useState(DOMAINS[0]);
  const service = SERVICES.find((item) => item.key === selectedService) || SERVICES[0];
  const stageAssessment = session.serviceStatus[selectedService]?.[selectedStage] || emptyAssessment();

  const counts = useMemo(() => {
    const allStages = Object.values(session.serviceStatus).flatMap((stages) => Object.values(stages));
    const allDomains = Object.values(session.domainStatus);
    const all = [...allStages, ...allDomains];
    return {
      pass: all.filter((item) => item.status === 'PASS').length,
      fail: all.filter((item) => item.status === 'FAIL').length,
      blocked: all.filter((item) => item.status === 'BLOCKED').length,
      unobserved: all.filter((item) => item.status === 'NOT_OBSERVED').length,
      total: all.length,
    };
  }, [session]);

  const persist = (next: SavedSession) => {
    const updated = { ...next, updatedAt: new Date().toISOString() };
    setSession(updated);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* Export remains available if storage is disabled. */ }
  };

  const updateStage = (patch: Partial<Assessment>) => {
    persist({
      ...session,
      serviceStatus: {
        ...session.serviceStatus,
        [selectedService]: {
          ...(session.serviceStatus[selectedService] || {}),
          [selectedStage]: { ...stageAssessment, ...patch },
        },
      },
    });
  };

  const updateDomain = (patch: Partial<Assessment>) => {
    persist({
      ...session,
      domainStatus: {
        ...session.domainStatus,
        [selectedDomain]: { ...(session.domainStatus[selectedDomain] || emptyAssessment()), ...patch },
      },
    });
  };

  const exportReport = () => {
    const lines = [
      '# Relatório de Certificação Visual Assistida — DefesAi',
      '',
      `Atualizado em: ${session.updatedAt}`,
      `Resumo: ${counts.pass} PASS · ${counts.fail} FAIL · ${counts.blocked} BLOCKED · ${counts.unobserved} NOT_OBSERVED`,
      '',
      '## Resultados por serviço e etapa',
      ...SERVICES.flatMap((item) => [
        `### ${item.label} (${item.key})`,
        ...item.stages.map((stage) => {
          const assessment = session.serviceStatus[item.key]?.[stage] || emptyAssessment();
          return `- **${stage}** — ${assessment.status}\n  - Evidência: ${assessment.evidence || 'Não registrada'}\n  - Achado: ${assessment.finding || 'Nenhum achado registrado'}`;
        }),
        '',
      ]),
      '## Síntese dos 13 domínios',
      ...DOMAINS.map((domain, index) => {
        const assessment = session.domainStatus[domain] || emptyAssessment();
        return `### ${index + 1}. ${domain}\n- Status: ${assessment.status}\n- Evidência: ${assessment.evidence || 'Não registrada'}\n- Achado/pendência: ${assessment.finding || 'Não registrado'}`;
      }),
      '',
      '## Limites da evidência',
      '- Este relatório registra observações informadas pelo avaliador; não captura automaticamente screenshots, tráfego de rede ou estado do banco.',
      '- PASS só deve ser escolhido quando houver evidência verificável suficiente.',
      '- Preenchimento de campos não comprova persistência, segurança, integridade documental ou validade jurídica.',
      '- NOT_OBSERVED e BLOCKED não são aprovações.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `defesai-certificacao-assistida-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-100">
      <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest"><ShieldCheck className="h-4 w-4" /> Certificação visual assistida</div>
        <h1 className="text-2xl font-bold">Onboarding real, etapa por etapa</h1>
        <p className="max-w-3xl text-sm text-slate-300">Abra a produção, percorra o serviço selecionado e use os botões de preenchimento que aparecem nas etapas do onboarding. Registre aqui somente o que observou. Esta central não executa Playwright em segundo plano nem cria casos automaticamente.</p>
        <div className="flex flex-wrap gap-3">
          <a href="https://adeusmulta.defesai.com.br/novo-caso" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"><ExternalLink className="h-4 w-4" /> Abrir onboarding de produção</a>
          <button onClick={exportReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-bold hover:bg-slate-800"><FileDown className="h-4 w-4" /> Exportar relatório</button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[['PASS', counts.pass], ['FAIL', counts.fail], ['BLOCKED', counts.blocked], ['Não observado', counts.unobserved], ['Registros', counts.total]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="text-xs text-slate-400">{label}</div><div className="text-xl font-bold">{value}</div></div>)}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardCheck className="h-5 w-5 text-emerald-400" /> Avaliação por serviço e etapa</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm"><span className="text-slate-300">Serviço canônico</span><select value={selectedService} onChange={(event) => { const next = SERVICES.find((item) => item.key === event.target.value) || SERVICES[0]; setSelectedService(next.key); setSelectedStage(next.stages[0]); }} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">{SERVICES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="text-slate-300">Etapa a registrar</span><select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">{service.stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
          <div className="text-sm font-bold">{service.label} — {selectedStage}</div>
          <label className="block space-y-1 text-sm"><span className="text-slate-300">Resultado observado</span><select value={stageAssessment.status} onChange={(event) => updateStage({ status: event.target.value as Status })} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white">{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span className="text-slate-300">Evidência verificável (ex.: texto exibido, URL, ID do caso; não incluir dados pessoais)</span><textarea value={stageAssessment.evidence} onChange={(event) => updateStage({ evidence: event.target.value })} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white" placeholder="Registre exatamente o que foi observado." /></label>
          <label className="block space-y-1 text-sm"><span className="text-slate-300">Falha, bloqueio ou observação</span><textarea value={stageAssessment.finding} onChange={(event) => updateStage({ finding: event.target.value })} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white" placeholder="Passos para reproduzir, impacto e comportamento esperado." /></label>
          <div className="text-xs text-slate-500">Os registros são salvos neste navegador e podem ser exportados. Não há persistência central no servidor nesta versão.</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-amber-400" /> Síntese dos 13 domínios</h2>
        <p className="text-sm text-slate-400">Os nomes abaixo são dimensões operacionais da avaliação assistida; compare-os com a matriz canônica do projeto antes de declarar certificação formal. Evidência ausente não é aprovação.</p>
        <label className="block space-y-1 text-sm"><span className="text-slate-300">Domínio</span><select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">{DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
          <div className="font-bold">{DOMAINS.indexOf(selectedDomain) + 1}. {selectedDomain}</div>
          <label className="block space-y-1 text-sm"><span className="text-slate-300">Status</span><select value={session.domainStatus[selectedDomain]?.status || 'NOT_OBSERVED'} onChange={(event) => updateDomain({ status: event.target.value as Status })} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white">{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span className="text-slate-300">Evidência</span><textarea value={session.domainStatus[selectedDomain]?.evidence || ''} onChange={(event) => updateDomain({ evidence: event.target.value })} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white" placeholder="Link, etapa, observação ou referência de evidência." /></label>
          <label className="block space-y-1 text-sm"><span className="text-slate-300">Achado / pendência</span><textarea value={session.domainStatus[selectedDomain]?.finding || ''} onChange={(event) => updateDomain({ finding: event.target.value })} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white" placeholder="Defeito, severidade, impacto, responsável ou reteste." /></label>
        </div>
        <button onClick={exportReport} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"><FileDown className="h-4 w-4" /> Gerar relatório consolidado (.md)</button>
      </section>
    </div>
  );
};
