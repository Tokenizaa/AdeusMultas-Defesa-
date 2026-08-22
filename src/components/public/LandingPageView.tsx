import React from 'react';
import {
  Shield,
  Sparkles,
  CheckCircle2,
  FileText,
  Scale,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Zap,
  Lock,
  Award,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';

export const LandingPageView: React.FC = () => {
  const { navigate } = useRouter();

  const handleStartAnalysis = () => {
    navigate('/novo-caso');
  };

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section GOV.BR */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-50 text-[#071D41] rounded-full border border-blue-200 text-sm font-bold font-mono tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-[#155BCB]" />
          <span>MOTOR DE INTELIGÊNCIA JURÍDICA CTB & CONTRAN</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#071D41] tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Descubra se o seu auto de infração de trânsito possui{' '}
          <span className="text-[#155BCB] underline decoration-blue-300">vícios formais de anulação</span>.
        </h1>

        <p className="text-base sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
          Diagnóstico preliminar gratuito fundamentado nas resoluções vigentes do CONTRAN, prazos decadenciais do Art. 281 do CTB e jurisprudência dos tribunais superiores.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            id="hero-start-cta"
            onClick={handleStartAnalysis}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#155BCB] hover:bg-[#0C326F] text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FFCD07]" />
            <span>Analisar Minha Multa Gratuitamente</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-[#071D41] border border-[#CCCCCC] rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            Acessar Minha Conta
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#168821]" />
            <span>Diagnóstico Preliminar em 30 segundos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#168821]" />
            <span>52 teses jurídicas canônicas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#168821]" />
            <span>100% determinístico e auditável</span>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E6E6E6]">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-sm font-bold text-[#155BCB] uppercase tracking-wider font-mono">
            FLUXO TRANSPARENTE E ACESSÍVEL
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#071D41] tracking-tight">
            Como funciona a análise e defesa de trânsito
          </h2>
          <p className="text-sm sm:text-sm text-slate-600">
            A primeira fase é 100% gratuita para identificação de teses. A segunda fase gera a petição formal com todos os requisitos legais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-[#CCCCCC] rounded-xl shadow-2xs space-y-3 relative">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#155BCB] font-extrabold font-mono text-sm flex items-center justify-center border border-blue-200">
              01
            </div>
            <h3 className="text-base font-bold text-[#071D41]">Informe os Dados da Infração</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Digite o número do auto (AIT), código do enquadramento ou envie a foto da notificação para auxílio de preenchimento.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#CCCCCC] rounded-xl shadow-2xs space-y-3 relative">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#168821] font-extrabold font-mono text-sm flex items-center justify-center border border-emerald-200">
              02
            </div>
            <h3 className="text-base font-bold text-[#071D41]">Diagnóstico Jurídico Gratuito</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              O sistema cruza as informações com o CTB, resoluções do CONTRAN e normas do INMETRO, calculando a probabilidade real de êxito.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#CCCCCC] rounded-xl shadow-2xs space-y-3 relative">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#071D41] font-extrabold font-mono text-sm flex items-center justify-center border border-blue-200">
              03
            </div>
            <h3 className="text-base font-bold text-[#071D41]">Geração da Petição Formal</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ao optar pela emissão, receba a minuta completa diagramada no padrão oficial em A4 com passo a passo para protocolo no órgão autuador.
            </p>
          </div>
        </div>
      </section>

      {/* Teses Jurídicas Section */}
      <section id="teses-juridicas" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E6E6E6]">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-sm font-bold text-[#155BCB] uppercase tracking-wider font-mono">
            BASE JURÍDICA ESTRUTURADA
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#071D41] tracking-tight">
            Principais Teses de Anulação no Sistema de Trânsito
          </h2>
          <p className="text-sm sm:text-sm text-slate-600">
            Fundamentos previstos expressamente na Lei Federal nº 9.503/1997 e Resoluções Normativas do CONTRAN.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-2">
            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-[#155BCB] border border-blue-200">
              Art. 281 do CTB
            </span>
            <h4 className="font-bold text-[#071D41] text-sm">Decadência de Notificação de Autuação</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Expedição da notificação que ultrapassa 30 dias contados da data da infração enseja o arquivamento sumário do auto.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-2">
            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-[#155BCB] border border-blue-200">
              Resolução 798 CONTRAN
            </span>
            <h4 className="font-bold text-[#071D41] text-sm">Aferição Metrológica do Radar</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Medidores eletrônicos de velocidade exigem verificação anual obrigatória pelo INMETRO para validade do registro.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-2">
            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-emerald-50 text-[#168821] border border-emerald-200">
              Art. 267 do CTB
            </span>
            <h4 className="font-bold text-[#071D41] text-sm">Conversão em Advertência por Escrito</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Direito subjetivo do condutor sem reincidência nos últimos 12 meses em infrações leves ou médias (Lei 14.071/20).
            </p>
          </div>

          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-2">
            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-[#155BCB] border border-blue-200">
              Resolução 909 CONTRAN
            </span>
            <h4 className="font-bold text-[#071D41] text-sm">Sinalização de Videomonitoramento</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Autuações por câmeras exigem placa informativa de fiscalização ostensiva na via sob pena de nulidade material.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-2">
            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-[#155BCB] border border-blue-200">
              Súmula 312 do STJ
            </span>
            <h4 className="font-bold text-[#071D41] text-sm">Garantia da Dupla Notificação</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Obrigatória a expedição individualizada da Notificação de Autuação (NA) e da Notificação de Imposição de Penalidade (NIP).
            </p>
          </div>

          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-2">
            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-[#155BCB] border border-blue-200">
              Resolução 432 CONTRAN
            </span>
            <h4 className="font-bold text-[#071D41] text-sm">Margem de Erro do Etilômetro</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Observância estrita da tabela de erro máximo admissível e termos de constatação regulamentares.
            </p>
          </div>
        </div>
      </section>

      {/* Dúvidas Frequentes Section */}
      <section id="perguntas-frequentes" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E6E6E6]">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-sm font-bold text-[#155BCB] uppercase tracking-wider font-mono">
            PERGUNTAS FREQUENTES
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#071D41] tracking-tight">
            Tire suas dúvidas sobre o processo
          </h2>
        </div>

        <div className="space-y-4 text-sm">
          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-1.5">
            <h4 className="font-bold text-sm text-[#071D41]">A análise preliminar é realmente gratuita?</h4>
            <p className="text-slate-600 leading-relaxed">
              Sim, 100% gratuita. Você descobre as teses aplicáveis, probabilidade de êxito e prazos sem pagar nada e sem precisar informar dados bancários.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-1.5">
            <h4 className="font-bold text-sm text-[#071D41]">O que acontece após protocolar a defesa?</h4>
            <p className="text-slate-600 leading-relaxed">
              A defesa tempestiva suspende a exigibilidade da multa e os pontos na CNH até o julgamento pelo órgão autuador ou pela JARI.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#CCCCCC] rounded-xl space-y-1.5">
            <h4 className="font-bold text-sm text-[#071D41]">Posso protocolar a defesa pela internet?</h4>
            <p className="text-slate-600 leading-relaxed">
              Sim. A petição gerada pelo DefesAi segue a estrutura formal exigida para protocolo presencial, envio postal ou protocolo digital nos portais do DETRAN, PRF, DNIT e prefeituras municipais.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
