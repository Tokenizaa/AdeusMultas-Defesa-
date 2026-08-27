import React from 'react';
import { Shield, Lock, Scale, ExternalLink, FileCheck, CheckCircle2 } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { AdeusMultasLogo } from '../brand/AdeusMultasLogo';

export const PrivateFooter: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <footer id="footer" className="bg-[#071D41] text-white border-t-4 border-orange-500 pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-sm">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Grid de 4 Colunas do Mapa do Site */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-orange-500/60">
          {/* Coluna 1: Identidade do Serviço */}
          <div className="space-y-3">
            <AdeusMultasLogo variant="compact" theme="dark" iconSize="md" />
            <p className="text-[#C2D9FF] text-sm leading-relaxed">
              Plataforma de inteligência jurídica para geração determinística de defesas e recursos de trânsito em conformidade com o Código de Trânsito Brasileiro (CTB) e Resoluções do CONTRAN.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[#C2D9FF] font-semibold">
              <Shield className="w-4 h-4 text-orange-500" />
              <span>Sistema de Defesa Autônoma</span>
            </div>
          </div>

          {/* Coluna 2: Serviços de Trânsito */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
              Serviços ao Usuário
            </h3>
            <ul className="space-y-2 text-sm text-[#C2D9FF]">
              <li>
                <button onClick={() => navigate('/novo-caso')} className="hover:underline hover:text-white cursor-pointer text-left">
                  Análise Preliminar Gratuita de Multa
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/novo-caso')} className="hover:underline hover:text-white cursor-pointer text-left">
                  Defesa Prévia (Notificação de Autuação)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/novo-caso')} className="hover:underline hover:text-white cursor-pointer text-left">
                  Recurso à JARI (1ª Instância)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/novo-caso')} className="hover:underline hover:text-white cursor-pointer text-left">
                  Recurso ao CETRAN (2ª Instância)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/novo-caso')} className="hover:underline hover:text-white cursor-pointer text-left">
                  Conversão em Advertência (Art. 267 CTB)
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Legislação e Transparência */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
              Legislação & Normas
            </h3>
            <ul className="space-y-2 text-sm text-[#C2D9FF]">
              <li>
                <a
                  href="https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  <span>Lei nº 9.503/1997 (CTB)</span>
                  <ExternalLink className="w-3 h-3 text-[#C2D9FF]" />
                </a>
              </li>
              <li>
                  <span className="text-[#C2D9FF]">Resoluções CONTRAN (798, 909, 918)</span>
                </li>
                <li>
                  <span className="text-[#C2D9FF]">Súmula 312 do STJ (Notificação Dupla)</span>
                </li>
                <li>
                  <span className="text-[#C2D9FF]">Tema 1.097 do STJ</span>
              </li>
              <li>
                <a
                  href="https://www.gov.br/transportes/pt-br/assuntos/transito/senatran"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1 text-slate-300"
                >
                  <span>SENATRAN — Secretaria Nacional</span>
                  <ExternalLink className="w-3 h-3 text-[#C2D9FF]" />
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Acessibilidade & Privacidade LGPD */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
              Acessibilidade & LGPD
            </h3>
            <p className="text-sm text-[#C2D9FF] leading-relaxed">
              Tratamento de dados realizado estritamente segundo as diretrizes da Lei nº 13.709/2018 (LGPD), garantindo sigilo e minimização de coleta.
            </p>
            <div className="p-3 bg-[#0C326F] rounded-lg border border-orange-500 text-sm space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#C2D9FF] font-semibold">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Criptografia de Ponta a Ponta</span>
              </div>
              <p className="text-[#C2D9FF] text-sm">
                Em conformidade com o eMAG e WCAG 2.1 / 2.2 AA.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé Institucional Inferior */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#C2D9FF]">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="font-extrabold text-lg tracking-wider text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              BRASIL
            </div>
            <p>© {new Date().getFullYear()} DefesAi • Tecnologia Jurídica Autônoma • Todos os direitos reservados.</p>
          </div>

          <div className="flex items-center gap-4 text-sm text-[#C2D9FF]">
            <span>Padrão DefesAi</span>
            <span>•</span>
            <span>Versão 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

