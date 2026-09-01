import { Router } from 'express';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { getGeminiClient, enrichDefenseWithGemini } from '../gemini';
import { DefenseBlock, InfractionData, ProcedureType } from '../../types';
import { runControlledPipeline, registerRefinementProvider } from '../../core/ai/ai-orchestrator';

const router = Router();

registerRefinementProvider({
  refineProse: async (draftText: string) => {
    return enrichDefenseWithGemini({ petitionText: draftText });
  },
});

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
 * AI Generate Complete Defense Document via Deterministic Assembly & Controlled Refinement
 */
router.post('/ai/generate-defense', async (req, res) => {
  try {
    const { caseData, customInstructions } = req.body;
    const rawInfraction = caseData?.dadosInfracao || caseData?.infraction || {};
    const orgaoAutuador = rawInfraction.orgaoAutuador || rawInfraction.autuadorBody || 'DETRAN';
    
    // Normalizar dados para InfractionData canônico
    const infraction: InfractionData = {
      aitNumber: rawInfraction.autoInfracao || rawInfraction.aitNumber || 'SN',
      infractionCode: rawInfraction.codigoInfracao || rawInfraction.infractionCode || '745-50',
      description: rawInfraction.descricaoInfracao || rawInfraction.description || 'Infração de Trânsito',
      ctbArticle: rawInfraction.enquadramentoLegal || rawInfraction.ctbArticle || 'Art. 218, I do CTB',
      severity: rawInfraction.gravidade || rawInfraction.severity || 'media',
      points: Number(rawInfraction.pontos || rawInfraction.points || 4),
      fineAmount: Number(rawInfraction.valor || rawInfraction.fineAmount || 130.16),
      dateTime: rawInfraction.dataHoraInfracao || rawInfraction.dateTime || new Date().toISOString().split('T')[0],
      location: rawInfraction.localInfracao || rawInfraction.location || 'Via Pública',
      autuadorBody: orgaoAutuador,
      speedLimit: rawInfraction.velocidadePermitida ? Number(rawInfraction.velocidadePermitida) : rawInfraction.speedLimit,
      speedMeasured: rawInfraction.velocidadeMedida ? Number(rawInfraction.velocidadeMedida) : rawInfraction.measuredSpeed,
      speedConsidered: rawInfraction.velocidadeConsiderada ? Number(rawInfraction.velocidadeConsiderada) : rawInfraction.consideredSpeed,
      radarEquipmentId: rawInfraction.numeroEquipamentoInmetro || rawInfraction.radarEquipmentId,
      inmetroAferitionDate: rawInfraction.dataAfericaoInmetro || rawInfraction.inmetroAferitionDate,
      defenseDeadline: rawInfraction.prazoDefesa || rawInfraction.defenseDeadline,
    };

    const applicant = {
      name: rawInfraction.nomeCondutor || caseData?.applicantName || 'CONDUTOR REQUERENTE',
      cpf: rawInfraction.cpfCondutor || caseData?.applicantCpf || '000.000.000-00',
      rg: rawInfraction.rgCondutor || caseData?.applicantRg,
      cnh: rawInfraction.cnhNumero || caseData?.applicantCnh || '00000000000',
      category: rawInfraction.categoriaCnh || caseData?.cnhCategory || 'B',
      address: caseData?.applicantAddress || 'Endereço não informado',
      cityState: rawInfraction.municipioUf || caseData?.applicantCityState || 'São Paulo/SP',
    };

    const vehiclePlate = rawInfraction.placa || caseData?.vehiclePlate || 'ABC-1234';
    const vehicleModel = rawInfraction.marcaModelo || caseData?.vehicleModel || 'Veículo Automotor';
    const procedureType: ProcedureType = caseData?.procedureType || 'defesa_previa';

    // 1. Executar análise determinística via ExpertRuleEngine
    const analysis = RagPipeline.analyzeInfraction(caseData?.caseId || `case_${Date.now()}`, infraction);

    // 2. Montar minuta determinística via DocumentAssemblyEngine
    const defense = RagPipeline.generateDefenseDraft(
      analysis.caseId,
      infraction,
      vehiclePlate,
      vehicleModel,
      applicant,
      analysis.recommendedArguments || [],
      procedureType
    );

    if (customInstructions) {
      defense.factsNarrative = `${defense.factsNarrative}\n\nObservações complementares do requerente: ${customInstructions}`;
    }

    // 3. Submeter ao pipeline de IA subordinada e validação de integridade
    const pipelineResult = await runControlledPipeline(
      {
        analysis,
        draft: defense,
      },
      { tone: 'formal_rigorous' }
    );

    // Construct defense blocks
    const blocks: DefenseBlock[] = [
      {
        id: 'blk_1',
        titulo: 'Endereçamento e Cabeçalho',
        categoria: 'cabecalho',
        conteudo: `ILUSTRÍSSIMO SENHOR DIRETOR / PRESIDENTE DA JARI DO ${orgaoAutuador.toUpperCase()}`,
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_2',
        titulo: 'Qualificação do Condutor e Veículo',
        categoria: 'cabecalho',
        conteudo: `${(applicant.name || 'CONDUTOR / PROPRIETÁRIO').toUpperCase()}, CPF: ${applicant.cpf || 'NÃO INFORMADO'}, CNH: ${applicant.cnh || 'NÃO INFORMADO'}, proprietário do veículo Placa ${vehiclePlate || 'N/A'}, vem apresentar DEFESA ADMINISTRATIVA.`,
        ativo: true,
        editavel: true,
      },
      {
        id: 'blk_3',
        titulo: 'Síntese dos Fatos',
        categoria: 'fatos',
        conteudo: `Em ${infraction.dateTime ? new Date(infraction.dateTime).toLocaleDateString('pt-BR') : 'data da autuação'}, foi lavrado o Auto de Infração ${infraction.aitNumber || 'N/A'} referente a ${infraction.description || 'infração de trânsito'} no local ${infraction.location || 'Via Pública'}.`,
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
        conteudo: `Pede Deferimento.\n${applicant.cityState || 'Brasil'}, ${new Date().toLocaleDateString('pt-BR')}.\n\n_____________________________________\nAssinatura do Requerente`,
        ativo: true,
        editavel: true,
      },
    ];

    const defenseDoc = {
      id: 'doc_' + Math.random().toString(36).substring(2, 9),
      caseId: caseData?.id || pipelineResult.draft.caseId,
      tipoDefesa: caseData?.tipoServico || caseData?.serviceType || procedureType,
      titulo: `Defesa Administrativa - Auto ${infraction.aitNumber || 'N/A'}`,
      orgaoDestinatario: orgaoAutuador,
      autorNome: applicant.name,
      autorCpf: applicant.cpf,
      autorCnh: applicant.cnh,
      autorEndereco: applicant.cityState,
      textoCompleto: pipelineResult.draft.fullDraftText,
      defenseDraft: pipelineResult.draft,
      analysis,
      aiControlled: pipelineResult.controlled,
      validationReport: pipelineResult.validationReport,
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
