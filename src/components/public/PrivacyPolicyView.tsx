import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';

export const PrivacyPolicyView: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-[#071D41] text-white flex flex-col">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:px-8 lg:py-16 flex-1">
        {/* Cabeçalho */}
        <div className="mb-10 border-b border-orange-500/30 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase mb-4">
            <span>DefesAi • Política de Privacidade (LGPD)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Política de Privacidade
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Lei Geral de Proteção de Dados Pessoais — Lei Federal nº 13.709/2018<br />
            Última atualização: <span className="text-orange-400 font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
          </p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 1. Quem Somos
            </h2>
            <p className="mb-4">
              A <strong>DefesAi</strong> (plataforma disponível em https://www.defesai.shop) é a
              controladora dos dados pessoais coletados por meio de seu site, aplicativo web e
              serviços relacionados, incluindo a geração de defesas e recursos de trânsito.
            </p>
            <p className="mb-4">
              DPO (Encarregado de Proteção de Dados): dpo@defesai.com.br
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 2. Dados Coletados
            </h2>
            <p className="mb-4">
              Coletamos dados necessários para prestação dos serviços, incluindo:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Dados de identificação: nome, CPF, CNH, RG, e-mail, telefone, endereço;</li>
              <li>Dados do veículo: placa, RENAVAM, marca, modelo, ano;</li>
              <li>Dados da autuação: número do AIT, órgão autuador, data, local, enquadramento legal;</li>
              <li>Dados de pagamento: informações de transação PIX processadas por gateway terceirizado (não armazenamos dados de cartão);</li>
              <li>Dados de navegação: cookies estritamente essenciais para funcionamento da sessão;</li>
              <li>Dados de autenticação: credenciais de acesso gerenciadas por Supabase Auth e Firebase Auth.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 3. Finalidades do Tratamento
            </h2>
            <p className="mb-4">
              Os dados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Gerar minutas de defesa e recursos de trânsito fundamentados no CTB;</li>
              <li>Protocolar e acompanhar processos administrativos perante órgãos de trânsito;</li>
              <li>Enviar notificações sobre prazos e status de casos;</li>
              <li>Processar pagamentos de serviços pagos;</li>
              <li>Autenticar usuários e proteger a plataforma contra fraudes;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 4. Compartilhamento de Dados
            </h2>
            <p className="mb-4">
              Seus dados não são vendidos a terceiros. Podem ser compartilhados com:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li><strong>Gateways de pagamento (VenoPag / PagBank):</strong> para processamento de PIX;</li>
              <li><strong>Provedores de infraestrutura (Supabase, Firebase, Cloudflare):</strong> hospedagem, banco de dados e autenticação;</li>
              <li><strong>Provedores de IA (Google GenAI):</strong> para enriquecimento de texto e geração de imagens, quando o usuário optar por utilizar tais recursos;</li>
              <li><strong>Órgãos públicos (DETRAN, JARI, CETRAN, SENATRAN):</strong> exclusivamente quando o usuário solicitar protocolo de defesas e recursos;</li>
              <li><strong>Autoridades judiciais e administrativas:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 5. Direitos do Titular (LGPD Art. 18)
            </h2>
            <p className="mb-4">
              Você pode, a qualquer momento, requerer:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
              <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
              <li>Eliminação dos dados tratados com base no consentimento;</li>
              <li>Informação sobre entidades com as quais seus dados foram compartilhados;</li>
              <li>Revogação do consentimento, sem prejuízo do tratamento baseado em outra hipótese legal.</li>
            </ul>
            <p className="mb-4">
              Para exercer seus direitos, entre em contato pelo e-mail:
              <strong>dpo@defesai.com.br</strong>. Responderemos em até 15 dias, nos termos do
              art. 19 da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 6. Segurança e Retenção
            </h2>
            <p className="mb-4">
              Adotamos medidas técnicas e administrativas adequadas para proteger seus dados,
              incluindo criptografia em trânsito (TLS) e em repouso, controle de acessos,
              mascaramento de dados sensíveis em logs e auditoria de acessos. Os dados são
              retidos pelo período necessário para cumprimento das finalidades e obrigações
              legais, incluindo prazos prescricionais aplicáveis a processos de trânsito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 7. Transferência Internacional
            </h2>
            <p className="mb-4">
              Alguns provedores de infraestrutura e IA podem estar localizados fora do Brasil.
              Nesses casos, exigimos cláusulas contratuais padrão e garantias de proteção de
              dados equivalentes à LGPD, nos termos do art. 33 e seguintes da Lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 8. Cookies
            </h2>
            <p className="mb-4">
              Utilizamos cookies estritamente essenciais para funcionamento da sessão, segurança
              e acessibilidade. Não utilizamos cookies de rastreamento ou publicidade sem seu
              consentimento explícito. Você pode gerenciar suas preferências por meio do banner
              de cookies exibido na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 9. Alterações nesta Política
            </h2>
            <p className="mb-4">
              Esta política poderá ser atualizada a qualquer momento. As alterações serão
              publicadas nesta página com a data de revisão. Recomendamos a consulta periódica.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full" /> 10. Contato
            </h2>
            <p className="mb-4">
              Para qualquer dúvida, solicitação ou reclamação relacionada à proteção de dados
              pessoais, entre em contato com nosso Encarregado (DPO):
            </p>
            <p className="mb-4">
              <strong>E-mail:</strong> dpo@defesai.com.br<br />
              <strong>Plataforma:</strong> https://www.defesai.shop
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
              href="/termos-de-uso"
              className="text-orange-400 hover:text-orange-300 underline"
            >
              Termos de Uso
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
