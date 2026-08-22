import { Router } from 'express';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { getGeminiClient } from '../gemini';
import { DefenseBlock } from '../../types';

const router = Router();

/**
 * POST /api/ai/analyze-infraction
 * AI Infraction Analysis using Gemini API or RAG fallback.
 */
router.post('/ai/analyze-infraction', async (req, res) => {
  try {
    const infraction: any = req.body;
    const ragContext = RagPipeline.retrieveContext(infraction);

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Você é o perito jurídico sênior do sistema Adeus Multa, especialista absoluto em Código de Trânsito Brasileiro (CTB), Resoluções do CONTRAN (especialmente 798/2020 e 918/2022) e Manual Brasileiro de Fiscalização de Trânsito (Resolução 985/2022).
Analise com rigor técnico os seguintes dados da Notificação de Autuação:
- Auto de Infração: ${infraction.autoInfracao || 'N/A'}
- Código da Infração: ${infraction.codigoInfracao} - ${infraction.descricaoInfracao}
- Enquadramento: ${infraction.enquadramentoLegal}
- Gravidade: ${infraction.gravidade}
- Órgão Autuador: ${infraction.orgaoAutuador}
- Data/Hora: ${infraction.dataHoraInfracao}
- Local: ${infraction.localInfracao}, ${infraction.municipioUf}
- Velocidade Permitida: ${infraction.velocidadePermitida || 'N/A'} km/h
- Velocidade Medida: ${infraction.velocidadeMedida || 'N/A'} km/h
- Velocidade Considerada: ${infraction.velocidadeConsiderada || 'N/A'} km/h
- Equipamento/INMETRO: ${infraction.numeroEquipamentoInmetro || 'N/A'} (Aferição: ${infraction.dataAfericaoInmetro || 'N/A'})
- Prazo de Defesa: ${infraction.prazoDefesa}

Contexto RAG de Teses Jurídicas:
${ragContext.matchedTeses.map((t) => `- ${t.titulo}: ${t.baseLegal}`).join('\n')}

Responda em formato JSON estrito com o seguinte schema:
{
  "scoreDeferimento": number (0 a 100, baseado na solidez das teses),
  "nivelConfianca": "ALTO" | "MEDIO" | "MODERADO",
  "diagnosticoGeral": string (parecer pericial conciso e técnico em português),
  "nulidadesDetectadas": [
    {
      "id": string,
      "titulo": string,
      "tipo": "FORMAL" | "MATERIAL" | "TEMPORAL" | "TECNICA",
      "descricao": string,
      "fundamentoLegal": string,
      "impacto": "CRITICO" | "ALTO" | "MEDIO",
      "probabilidadeExito": number
    }
  ],
  "argumentosRecomendados": string[],
  "tesesCabiveis": string[],
  "recomendacaoFinal": string
}`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        if (aiResponse.text) {
          const parsed = JSON.parse(aiResponse.text);
          const fullResult = {
            ...parsed,
            prazosAvaliacao: {
              prazoLimite:
                infraction.prazoDefesa || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              diasRestantes: 18,
              alertaUrgencia: false,
            },
            orgaoJulgadorInfo: {
              nome: ragContext.organInfo?.nome || infraction.orgaoAutuador,
              instanciaAtual: 'Defesa Prévia (Notificação de Autuação)',
              portalProtocoloOnlineUrl: ragContext.organInfo?.portalUrl,
              enderecoEnvioCorreios: ragContext.organInfo?.enderecoFisico,
              documentosExigidos: [
                'Cópia da Notificação de Autuação',
                'Cópia da CNH do Condutor',
                'Cópia do CRLV (Documento do Veículo)',
                'Defesa Técnica Assinada com Fundamentação CONTRAN',
              ],
            },
          };
          return res.json(fullResult);
        }
      } catch (geminiError) {
        console.error('Gemini call failed, using RAG Pipeline result', geminiError);
        if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({
            error: 'Serviço de análise indisponível',
            message: 'Tente novamente em alguns minutos.',
          });
        }
      }
    }

    // High-grade RAG fallback
    const score = Math.min(95, 75 + ragContext.potentialNullities.length * 7);
    const fallbackResult = {
      scoreDeferimento: score,
      nivelConfianca: score > 85 ? 'ALTO' : 'MEDIO',
      diagnosticoGeral: `Detectadas ${ragContext.potentialNullities.length} incongruências com potencial de nulidade material/formal no auto ${infraction.autoInfracao}, com ênfase nas diretrizes do CONTRAN e jurisprudência consolidada.`,
      nulidadesDetectadas: ragContext.potentialNullities,
      argumentosRecomendados: ragContext.matchedTeses.map((t) => t.titulo),
      tesesCabiveis: ragContext.matchedTeses.map((t) => t.categoria),
      prazosAvaliacao: {
        prazoLimite:
          infraction.prazoDefesa || new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
        diasRestantes: 21,
        alertaUrgencia: false,
      },
      orgaoJulgadorInfo: {
        nome: ragContext.organInfo?.nome || infraction.orgaoAutuador,
        instanciaAtual: 'Defesa Prévia (Notificação de Autuação)',
        portalProtocoloOnlineUrl: ragContext.organInfo?.portalUrl,
        enderecoEnvioCorreios: ragContext.organInfo?.enderecoFisico,
        documentosExigidos: [
          'Cópia da Notificação de Autuação',
          'Cópia da CNH do Condutor',
          'Cópia do CRLV do Veículo',
          'Peça de Defesa Assinada',
        ],
      },
      recomendacaoFinal:
        'Protocolar imediatamente o requerimento de cancelamento por vício formal e ausência de comprovação técnica dos requisitos vinculantes da autoridade de trânsito.',
    };

    res.json(fallbackResult);
  } catch (err: any) {
    console.error('Error in /api/ai/analyze-infraction:', err);
    res.status(500).json({ error: 'Erro ao processar análise jurídica', details: err.message });
  }
});

/**
 * POST /api/ai/generate-defense
 * AI Generate Complete Defense Document
 */
router.post('/ai/generate-defense', async (req, res) => {
  try {
    const { caseData, customInstructions } = req.body;
    const infraction = caseData.dadosInfracao || caseData.infraction || {};
    const ragContext = RagPipeline.retrieveContext(infraction);

    const ai = getGeminiClient();
    let generatedText = '';

    if (ai) {
      try {
        const prompt = `Você é o mais prestigiado especialista em Direito de Trânsito Administrativo do Brasil.
Elabore uma peça jurídica de DEFESA PRÉVIA / RECURSO ADMINISTRATIVO impecável, formal e técnica contra o auto de infração nº ${infraction.autoInfracao || infraction.aitNumber}.

DADOS DO PROCESSO:
- Requerente: ${infraction.nomeCondutor || 'Condutor / Proprietário'}
- CPF: ${infraction.cpfCondutor || '000.000.000-00'} | CNH: ${infraction.cnhNumero || '00000000000'}
- Veículo: Placa ${infraction.placa} / ${infraction.ufVeiculo} (${infraction.marcaModelo || 'Veículo Automotor'})
- Órgão Autuador: ${infraction.orgaoAutuador}
- Infração: ${infraction.codigoInfracao || infraction.infractionCode} - ${infraction.descricaoInfracao || infraction.description}
- Enquadramento: ${infraction.enquadramentoLegal || infraction.ctbArticle}
- Data/Hora: ${infraction.dataHoraInfracao || infraction.dateTime} | Local: ${infraction.localInfracao || infraction.location}
- Medições Técnicas: Permitida ${infraction.velocidadePermitida || infraction.speedLimit || 'N/A'} km/h, Medida ${infraction.velocidadeMedida || infraction.measuredSpeed || 'N/A'} km/h, Considerada ${infraction.velocidadeConsiderada || infraction.consideredSpeed || 'N/A'} km/h
- Equipamento: ${infraction.numeroEquipamentoInmetro || infraction.radarEquipmentId || 'Eletrônico'} (Aferição: ${infraction.dataAfericaoInmetro || infraction.inmetroAferitionDate || 'Não informada'})

TESES E NULIDADES A INCLUIR:
${ragContext.potentialNullities.map((n) => `- ${n.titulo}: ${n.fundamentoLegal} - ${n.descricao}`).join('\n')}

ESTRUTURA OBRIGATÓRIA DA PEÇA:
1. ENDEREÇAMENTO AO ILUSTRÍSSIMO DIRETOR DO ÓRGÃO AUTUADOR
2. QUALIFICAÇÃO COMPLETA DO REQUERENTE E DO VEÍCULO
3. DOS FATOS
4. DAS PRELIMINARES DE NULIDADE (Decadência do Art. 281, Falta de Tipicidade, Aferição do INMETRO expirada conforme Resolução 798/2020)
5. DO MÉRITO TÉCNICO E JURÍDICO (Violação ao devido processo legal, Art. 5º, LIV e LV da CF/88, Resoluções CONTRAN 798 e 918)
6. DO PEDIDO SUBSIDIÁRIO DE CONVERSÃO EM ADVERTÊNCIA POR ESCRITO (Art. 267 CTB)
7. DOS PEDIDOS E REQUERIMENTOS FINAIS (Arquivamento, cancelamento de pontuação e efeito suspensivo)
8. FECHO E LOCAL/DATA

Redija em português jurídico formal culto, com excelente fundamentação doutrinária e jurisprudencial.`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            temperature: 0.3,
          },
        });

        if (aiResponse.text) {
          generatedText = aiResponse.text;
        }
      } catch (e) {
        console.error('Error generating defense with Gemini:', e);
        if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({
            error: 'Serviço de geração de defesa indisponível',
            message: 'Tente novamente em alguns minutos.',
          });
        }
      }
    }

    // If Gemini didn't return text, build high-quality structured default piece
    if (!generatedText) {
      generatedText = `ILUSTRÍSSIMO SENHOR PRESIDENTE DA JUNTA ADMINISTRATIVA DE RECURSOS DE INFRAÇÕES - JARI DO ${(infraction.orgaoAutuador || 'DETRAN').toUpperCase()}

REFERÊNCIA: AUTO DE INFRAÇÃO Nº ${infraction.autoInfracao || infraction.aitNumber || 'N/A'}
PLACA DO VEÍCULO: ${infraction.placa || 'N/A'} / ${infraction.ufVeiculo || ''}
ENQUADRAMENTO: ${infraction.enquadramentoLegal || infraction.ctbArticle || 'N/A'} (${infraction.codigoInfracao || infraction.infractionCode || 'N/A'})

${(infraction.nomeCondutor || 'REQUERENTE').toUpperCase()}, brasileiro(a), inscrito(a) no CPF/MF sob o nº ${infraction.cpfCondutor || 'XXX.XXX.XXX-XX'}, portador(a) da CNH nº ${infraction.cnhNumero || 'XXXXXXXXXXX'}, proprietário(a)/condutor(a) do veículo marca/modelo ${infraction.marcaModelo || 'automotor'}, placa ${infraction.placa || 'N/A'}, vem, tempestivamente, com fulcro nos Artigos 5º, incisos LIV e LV da Constituição Federal de 1988, e nos Artigos 280 e seguintes do Código de Trânsito Brasileiro (Lei nº 9.503/1997), apresentar a presente:

DEFESA ADMINISTRATIVA DE AUTUAÇÃO

em face do Auto de Infração supra epigrafado, lavrado em ${infraction.dataHoraInfracao ? new Date(infraction.dataHoraInfracao).toLocaleDateString('pt-BR') : 'data recente'}, pelos substratos fáticos e jurídicos a seguir delineados:

1. DOS FATOS
Consta no referido Auto de Infração que o veículo supostamente transitava no local '${infraction.localInfracao || 'Via Pública'}' em desacordo com a velocidade regulamentada. Ocorre que o presente ato administrativo encontra-se maculado por vícios insanáveis de forma e de mérito técnico, não podendo subsistir no ordenamento jurídico pátrio.

2. DAS PRELIMINARES DE NULIDADE ABSOLUTA DO AUTO
2.1. Da Inobservância aos Requisitos Metrológicos Vinculantes (Resolução CONTRAN nº 798/2020 e Portaria INMETRO nº 158/2022)
O Artigo 280, § 2º do CTB e o Artigo 4º da Resolução CONTRAN nº 798/2020 exigem expressamente que o medidor de velocidade comprove validade de verificação metrológica periódica anual (12 meses) pelo INMETRO. No caso em tela, o equipamento ${infraction.numeroEquipamentoInmetro || infraction.radarEquipmentId || 'utilizado'} operava sem o laudo de aferição regular e tempestivo, tornando insubsistente o registro fotográfico e documental.

2.2. Da Falta de Sinalização Ostensiva Regulamentadora (Artigo 90 do CTB)
Não restou comprovada a existência de placa de sinalização vertical R-19 previamente ao equipamento de fiscalização eletrônica no trecho regulamentado, desrespeitando o princípio da legalidade estrita e da segurança viária.

3. DO PEDIDO SUBSIDIÁRIO: CONVERSÃO EM ADVERTÊNCIA POR ESCRITO (Art. 267 do CTB)
Subsidiariamente, caso superadas as nulidades formais (o que não se espera), requer a aplicação do Artigo 267 do CTB (com redação alterada pela Lei Federal nº 14.071/2020), convertendo-se a penalidade de multa em ADVERTÊNCIA POR ESCRITO, tratando-se de direito público subjetivo do condutor que não possui reincidência específica no período de 12 meses.

4. DOS PEDIDOS
Ante o exposto, REQUER a Vossa Senhoria:
a) O RECEBIMENTO da presente Defesa Prévia com a concessão de EFEITO SUSPENSIVO;
b) No mérito, o TOTAL DEFERIMENTO e o consequente ARQUIVAMENTO do Auto de Infração nº ${infraction.autoInfracao || 'N/A'} por manifesta insubsistência formal e metrológica;
c) Subsidiariamente, a conversão em Advertência por Escrito nos termos do Art. 267 do CTB;
d) A anulação de quaisquer pontos lançados no prontuário do Requerente.

Termos em que,
Pede e Espera Deferimento.

${infraction.municipioUf || 'São Paulo - SP'}, ${new Date().toLocaleDateString('pt-BR')}.

________________________________________________
${(infraction.nomeCondutor || 'REQUERENTE').toUpperCase()}
CPF: ${infraction.cpfCondutor || '000.000.000-00'}`;
    }

    // Construct defense blocks
    const blocks: DefenseBlock[] = [
      {
        id: 'blk_1',
        titulo: 'Endereçamento e Cabeçalho',
        categoria: 'cabecalho',
        conteudo: `ILUSTRÍSSIMO SENHOR DIRETOR / PRESIDENTE DA JARI DO ${(infraction.orgaoAutuador || 'DETRAN').toUpperCase()}`,
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_2',
        titulo: 'Qualificação do Condutor e Veículo',
        categoria: 'cabecalho',
        conteudo: `${(infraction.nomeCondutor || 'CONDUTOR / PROPRIETÁRIO').toUpperCase()}, CPF: ${infraction.cpfCondutor || '000.000.000-00'}, CNH: ${infraction.cnhNumero || '00000000000'}, proprietário do veículo Placa ${infraction.placa || 'N/A'}, vem apresentar DEFESA ADMINISTRATIVA.`,
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_3',
        titulo: 'Síntese dos Fatos',
        categoria: 'fatos',
        conteudo: `Em ${infraction.dataHoraInfracao ? new Date(infraction.dataHoraInfracao).toLocaleDateString('pt-BR') : 'data da autuação'}, foi lavrado o Auto de Infração ${infraction.autoInfracao || infraction.aitNumber || 'N/A'} referente a ${infraction.descricaoInfracao || infraction.description || 'infração de trânsito'} no local ${infraction.localInfracao || infraction.location || 'Via Pública'}.`,
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_4',
        titulo: 'Preliminares de Nulidade & Decadência',
        categoria: 'preliminares',
        conteudo:
          'Com base no Artigo 281 do CTB e Súmula 312 do STJ, suscita-se a nulidade insanável da autuação por descumprimento de prazos e requisitos legais de tipificação.',
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_5',
        titulo: 'Mérito Técnico: Resolução CONTRAN 798/2020 & INMETRO',
        categoria: 'merito',
        conteudo:
          'Demonstra-se a ausência de comprovação de calibração metrológica periódica nos termos da Resolução CONTRAN 798/2020 e Portaria INMETRO 158/2022.',
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_6',
        titulo: 'Pedido de Advertência por Escrito (Art. 267 CTB)',
        categoria: 'resolucoes',
        conteudo:
          'Preenchidos os requisitos da Lei Federal nº 14.071/2020 para conversão obrigatória da multa em advertência educativa sem perda de pontuação.',
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_7',
        titulo: 'Requerimentos e Pedidos Finais',
        categoria: 'pedidos',
        conteudo:
          'Requer o deferimento e arquivamento definitivo do auto, com cancelamento de quaisquer penalidades e pontuação.',
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_8',
        titulo: 'Fecho e Assinatura',
        categoria: 'fecho',
        conteudo: `Pede Deferimento.\n${infraction.municipioUf || 'Brasil'}, ${new Date().toLocaleDateString('pt-BR')}.\n\n_____________________________________\nAssinatura do Requerente`,
        ativo: true,
        editavel: true,
      },
    ];

    const defenseDoc = {
      id: 'doc_' + Math.random().toString(36).substring(2, 9),
      caseId: caseData.id,
      tipoDefesa: caseData.tipoServico || caseData.serviceType || 'defesa_previa',
      titulo: `Defesa Administrativa - Auto ${infraction.autoInfracao || infraction.aitNumber || 'N/A'}`,
      orgaoDestinatario: infraction.orgaoAutuador || infraction.autuadorBody,
      autorNome: infraction.nomeCondutor || 'Condutor / Requerente',
      autorCpf: infraction.cpfCondutor || '',
      autorCnh: infraction.cnhNumero || '',
      autorEndereco: infraction.municipioUf || 'São Paulo - SP',
      textoCompleto: generatedText,
      blocos: blocks,
      geradoEm: new Date().toISOString(),
      ultimaEdicao: new Date().toISOString(),
      versao: 1,
      anexosRecomendados: [
        'Cópia da Notificação de Autuação / Multa',
        'Cópia da CNH do Condutor',
        'Cópia do CRLV (Documento do Veículo)',
        'Comprovante de residência atualizado',
      ],
    };

    res.json(defenseDoc);
  } catch (err: any) {
    console.error('Error in /api/ai/generate-defense:', err);
    res.status(500).json({ error: 'Erro ao gerar minuta da defesa', details: err.message });
  }
});

/**
 * POST /api/ai/chat-consultant
 * Chat with Traffic Specialist Consultant
 */
router.post(['/ai/chat-consultant', '/ai/consult-traffic'], async (req, res) => {
  try {
    const { message, prompt, caseContext, context } = req.body;
    const userMessage = message || prompt || '';
    const ai = getGeminiClient();

    if (ai) {
      const systemPrompt = `Você é o Consultor Jurídico Virtual do 'Adeus Multa', o especialista digital número 1 do Brasil em direito de trânsito administrativo, CTB, resoluções do CONTRAN e defesas administrativas.
Seu objetivo é orientar cidadãos de forma clara, empática, didática e 100% embasada nas leis brasileiras vigentes.
Instruções:
- Seja prestativo, objetivo e use formatação Markdown com tópicos.
- Esclareça que o Adeus Multa fornece suporte técnico na elaboração da defesa administrativa e não presta consultoria advocatícia judicial.
- Sempre cite artigos pertinentes do CTB (ex: Art. 218, 280, 281, 267) ou resoluções CONTRAN quando relevante.`;

      const chat = ai.chats.create({
        model: 'gemini-3.7-flash',
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const promptWithContext =
        caseContext || context
          ? `Contexto: ${typeof (caseContext || context) === 'object' ? JSON.stringify(caseContext || context) : caseContext || context}.\n\nPergunta do usuário: ${userMessage}`
          : userMessage;

      const response = await chat.sendMessage({ message: promptWithContext });
      return res.json({ reply: response.text });
    }

    // Fallback
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        error: 'Consultor jurídico indisponível',
        message: 'Tente novamente em alguns minutos.',
      });
    }
    res.json({
      reply: `Como especialista pericial do **Adeus Multa**, oriento que: toda autuação de velocidade exige que o equipamento medidor comprove verificação periódica anual válida pelo INMETRO (Resolução CONTRAN 798/2020). Além disso, pela Lei 14.071/2020 (Art. 267 CTB), infrações médias ou leves de condutores sem reincidência nos últimos 12 meses devem ser convertidas em advertência por escrito.`,
    });
  } catch (err: any) {
    console.error('Error in chat consultant:', err);
    res.status(500).json({ error: 'Erro ao responder consulta', details: err.message });
  }
});

export default router;
