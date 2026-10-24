import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { AdeusMultasLogo } from '../brand/AdeusMultasLogo';

export const TermsOfUseView: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-[#071D41] text-white flex flex-col">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:px-8 lg:py-16 flex-1">
        {/* Cabeçalho */}
        <div className="mb-10 border-b border-orange-500/30 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase mb-4">
            <span>DefesAi • Termos de Uso</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Termos de Uso
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Última atualização: <span className="text-orange-400 font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
          </p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 1. Aceitação dos Termos
            </h2>
            <p className="mb-4">
              Ao acessar ou utilizar a plataforma <strong>DefesAi</strong> (disponível em
              https://www.defesai.shop e subdomínios), você concorda com estes Termos de Uso,
              com a Política de Privacidade (LGPD) e com todas as leis e regulamentos aplicáveis.
              Se não concordar com qualquer parte destes termos, não utilize a plataforma.
            </p>
            <p className="mb-4">
              A DefesAi é uma plataforma de inteligência jurídica para geração determinística de
              defesas e recursos de trânsito, fundamentada no Código de Trânsito Brasileiro (CTB -
              Lei nº 9.503/1997), Resoluções do CONTRAN e jurisprudência do STJ. Não somos um
              escritório de advocacia e não prestamos serviços jurídicos personalizados nem
              representação em processos administrativos ou judiciais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 2. Escopo do Serviço
            </h2>
            <p className="mb-4">
              A plataforma oferece: (i) análise preliminar gratuita de autuações de trânsito com
              base em regras determinísticas do CTB; (ii) geração de minutas de defesa, recursos à
              JARI, recurso ao CETRAN, defesa prévia, indicação de condutor e conversão em
              advertência por escrito; (iii) ferramentas de marketing e prospecção para
              profissionais do setor de trânsito.
            </p>
            <p className="mb-4">
              <strong>Isenção de responsabilidade:</strong> As minutas geradas são modelos
              determinísticos baseados em legislação pública. A decisão final sobre qualquer
              autuação, multa ou processo administrativo é de competência exclusiva do órgão
              autuador, da JARI, do CETRAN ou do poder judiciário. A DefesAi não garante
              resultados específicos, anulações, isenções ou prazos de julgamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 3. Propriedade Intelectual
            </h2>
            <p className="mb-4">
              Todo o conteúdo original da plataforma — incluindo código-fonte, layouts, logos,
              ícones, ilustrações, textos de interface, templates de documentos e a base de
              conhecimentos organizada — é de titularidade da DefesAi ou de seus licenciantes,
              protegido por direitos autorais e demais leis de propriedade intelectual.
            </p>
            <p className="mb-4">
              Os textos normativos reproduzidos (CTB, Resoluções CONTRAN, Súmulas do STJ,
              Portarias do INMETRO/SENATRAN) são atos normativos oficiais de domínio público nos
              termos do Artigo 8º da Lei nº 9.610/98 (Lei de Direitos Autorais) e são reproduzidos
              meramente para consulta e fundamentação de defesas, com indicação de fonte oficial.
            </p>
            <p className="mb-4">
              É proibido copiar, modificar, distribuir, vender ou criar obras derivadas de qualquer
              parte da plataforma sem autorização prévia por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 4. Uso da IA e Conteúdo Gerado
            </h2>
            <p className="mb-4">
              Alguns recursos da plataforma utilizam modelos de inteligência artificial de
              terceiros (Google GenAI / Gemini) para enriquecimento de texto e geração de imagens.
              O conteúdo gerado por IA é fornecido "como está", sem garantia de precisão
              jurídica, e deve ser revisado por um profissional qualificado antes de ser
              protocolado perante qualquer órgão público.
            </p>
            <p className="mb-4">
              O usuário é integralmente responsável pelo conteúdo que insere na plataforma,
              incluindo dados pessoais de terceiros (condutores, proprietários de veículos) e
              documentos de autuação, declarando ter autorização para tal tratamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 5. Pagamentos e Comércio
            </h2>
            <p className="mb-4">
              Os pagamentos são processados por gateway de terceiros (VenoPag / PagBank) para
              transações PIX. A DefesAi não armazena dados de cartão de crédito. A liberação de
              minutas pagas ocorre após confirmação de pagamento pelo gateway. Reembolsos seguem
              a política comercial publicada na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 6. Links e Conteúdos de Terceiros
            </h2>
            <p className="mb-4">
              A plataforma pode conter links para sites externos (Planalto, CONTRAN, STJ, DETRANs,
              SENATRAN, INMETRO, Meta, Google, Supabase, Cloudflare). A DefesAi não controla o
              conteúdo desses sites e não se responsabiliza por eles. O uso de serviços de
              terceiros está sujeito aos respectivos termos de uso e políticas de privacidade de
              cada provedor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 7. Limitação de Responsabilidade
            </h2>
            <p className="mb-4">
              Na extensão máxima permitida por lei, a DefesAi não se responsabiliza por danos
              diretos ou indiretos decorrentes do uso ou impossibilidade de uso da plataforma,
              incluindo perda de oportunidades, prazos processuais, ou decisões de órgãos de
              trânsito. O uso da plataforma é por conta e risco exclusivo do usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 8. Alterações nos Termos
            </h2>
            <p className="mb-4">
              A DefesAi poderá atualizar estes Termos de Uso a qualquer momento. As alterações
              entrarão em vigor na data de publicação na plataforma. O uso contínuo da plataforma
              após as alterações constituirá aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 9. Contato
            </h2>
            <p className="mb-4">
              Para dúvidas sobre estes Termos de Uso, entre em contato através do canal oficial
              disponível na plataforma ou pelo e-mail de contato informado no rodapé do site.
            </p>
          </section>
        </div>

        {/* Rodapé da página */}
        <div className="mt-12 pt-8 border-t border-orange-500/20 text-slate-400 text-xs text-center">
          <p>
            © {new Date().getFullYear()} DefesAi • Tecnologia Jurídica Autônoma • Todos os
            direitos reservados.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <button
              onClick={() => navigate('/')}
              className="text-orange-400 hover:text-orange-300 underline"
            >
              Voltar ao início
            </button>
            <a
              href="/politica-de-privacidade"
              className="text-orange-400 hover:text-orange-300 underline"
            >
              Política de Privacidade (LGPD)
            </a>
            <a
              href="https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 underline flex items-center gap-1"
            >
              CTB (Lei 9.503/97) <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
