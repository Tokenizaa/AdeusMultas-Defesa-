import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { rowToDomain, domainToRow } from '../canonical-mapper';
import { computeDefenseIntegrityHash, hasValidDefenseIntegrity } from '../defense-integrity';

const isCanonicalUserId = (value: string | undefined): boolean =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const canAccessCase = (user: AuthenticatedUser | undefined, row: any): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!row?.user_id || !isCanonicalUserId(user.id)) return false;
  return row.user_id === user.id;
};

/** Geração determinística de minuta (sem IA) — ampliada na Fase 2. */
async function generateDeterministicDraft(domain: any): Promise<any> {
  const analysis = domain.analysis || {};
  const canonicalArguments = analysis.recommendedArguments || [];
  const procedure = analysis.recommendedProcedure || domain.serviceType || 'recurso_jari';
  const inf = domain.infraction || {};
  const app = domain.applicant || {};
  const applicantName = app.applicantName || domain.clientName || 'Condutor';

  const fullDraftText = [
    `DEFESA PRELIMINAR / ${procedure.toUpperCase()}`,
    ``,
    `AUTUAÇÃO: AIT ${inf.aitNumber || 'N/A'} — ${inf.description || ''} (${inf.ctbArticle || ''})`,
    `ÓRGÃO AUTUADOR: ${inf.autuadorBody || 'N/A'}`,
    `VEÍCULO: ${domain.vehicle?.plate || 'SEM PLACA'} — ${domain.vehicle?.brandModel || ''}`,
    ``,
    `REQUERENTE: ${applicantName} (CPF ${app.applicantCpf || 'N/A'})`,
    ``,
    `I. DOS FATOS`,
    ``,
    `O condutor foi autuado conforme circunstâncias descritas no auto de infração.`,
    ``,
    `II. DAS TESES APLICÁVEIS`,
    ``,
    ...(canonicalArguments.length
      ? canonicalArguments.map((a: any) => `- ${a.title || a.text || a.id}`)
      : ['- Nulidade formal do auto de infração']),
    ``,
    `III. DO PEDIDO`,
    ``,
    `Ante o exposto, requer o acolhimento da presente defesa para cancelamento da autuação.`,
  ].join('\n');

  const selectedArgumentIds = canonicalArguments.map((a: any) => a.id || '');

  return {
    id: `def_${crypto.randomUUID()}`,
    fullDraftText,
    selectedArgumentIds,
    procedureType: procedure,
    factsNarrative: domain.applicant?.factsNarrative,
  };
}

export const casesRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

// GET /api/cases — lista casos (admin: todos/filtro; cidadão: próprios)
casesRoutes.get('/cases', authenticateToken, async (c) => {
  const user = c.get('user');
  const { userId } = c.req.query();
  const supabase = createSupabaseAdminClient(c.env);

  let query = supabase.from('cases').select('*');
  if (!user || user.role !== 'admin') {
    query = query.eq('user_id', user?.id ?? '__none__');
  } else if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new HTTPException(500, { message: 'Erro ao consultar casos' });

  return c.json((data || []).map(rowToDomain));
});

// GET /api/cases/:id
casesRoutes.get('/cases/:id', authenticateToken, async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: row, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', c.req.param('id'))
    .maybeSingle();

  if (error) throw new HTTPException(500, { message: 'Erro ao consultar caso' });
  if (!row) throw new HTTPException(404, { message: 'Caso não encontrado' });

  const user = c.get('user');
  if (!canAccessCase(user, row)) {
    throw new HTTPException(403, { message: 'Você não tem permissão para acessar este caso' });
  }

  const domain = rowToDomain(row);

  if (domain.defenseDraft && domain.analysis) {
    if (!(await hasValidDefenseIntegrity(domain.defenseDraft as any, domain.analysis as any))) {
      domain.defenseDraft = undefined;
      throw new HTTPException(409, {
        message: 'Documento de defesa inválido ou adulterado. Gere novamente a defesa antes de consultá-la.',
      });
    }
  }

  return c.json(domain);
});

// POST /api/cases — cria caso
casesRoutes.post('/cases', authenticateToken, async (c) => {
  const user = c.get('user')!;
  if (!isCanonicalUserId(user.id)) {
    throw new HTTPException(401, { message: 'Identidade de usuário inválida para criação do caso.' });
  }

  const domainData = await c.req.json<any>();
  domainData.id = domainData.id || `case_${crypto.randomUUID()}`;
  delete domainData.userId;
  delete domainData.analysis;

  if (domainData.isAnonymous && !domainData.claimToken) {
    domainData.claimToken = crypto.randomUUID();
  }
  domainData.userId = user.id;
  domainData.createdAt = domainData.createdAt || new Date().toISOString();
  domainData.updatedAt = new Date().toISOString();

  const row = domainToRow(domainData);
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase.from('cases').insert(row).select().single();

  if (error) throw new HTTPException(400, { message: error.message });
  return c.json(rowToDomain(data), 201);
});

// PUT /api/cases/:id
casesRoutes.put('/cases/:id', authenticateToken, async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: existingRow } = await supabase.from('cases').select('*').eq('id', c.req.param('id')).maybeSingle();
  if (!existingRow) throw new HTTPException(404, { message: 'Caso não encontrado' });

  const user = c.get('user');
  if (!canAccessCase(user, existingRow)) {
    throw new HTTPException(403, { message: 'Você não tem permissão para acessar este caso' });
  }

  const updatedDomain = await c.req.json<any>();
  updatedDomain.id = c.req.param('id');
  updatedDomain.updatedAt = new Date().toISOString();
  updatedDomain.userId = existingRow.user_id;

  const newRow = domainToRow(updatedDomain);
  newRow.user_id = existingRow.user_id;

  const { data, error } = await supabase.from('cases').update(newRow).eq('id', c.req.param('id')).select().single();
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json(rowToDomain(data));
});

// DELETE /api/cases/:id — anonimiza (LGPD)
casesRoutes.delete('/cases/:id', authenticateToken, async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: row } = await supabase.from('cases').select('*').eq('id', c.req.param('id')).maybeSingle();
  if (!row) throw new HTTPException(404, { message: 'Caso não encontrado' });

  const user = c.get('user');
  if (!canAccessCase(user, row)) {
    throw new HTTPException(403, { message: 'Você não tem permissão para acessar este caso' });
  }

  const anonymized = {
    client_name: '[REMOVIDO]',
    client_email: null,
    client_phone: null,
    client_cpf: null,
    user_id: null,
    applicant_json: null,
    defense_draft_json: null,
    analysis_json: null,
    evidence_json: null,
    ocr_auxiliary_json: null,
    timeline_json: null,
    claim_token: null,
    commercial_offer_id: null,
    formal_flaws_json: null,
    protocol_info_json: null,
    real_driver_name: null,
    real_driver_cpf: null,
    real_driver_cnh: null,
    cellphone_circumstance: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('cases').update(anonymized).eq('id', c.req.param('id'));
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ success: true, message: 'Dados pessoais removidos. Caso retido para conformidade legal.' });
});

// POST /api/cases/:id/claim — vincula caso anônimo ao usuário
casesRoutes.post('/cases/:id/claim', authenticateToken, async (c) => {
  const user = c.get('user')!;
  if (!isCanonicalUserId(user.id)) {
    throw new HTTPException(401, { message: 'Identidade de usuário inválida para vinculação do caso.' });
  }

  const supabase = createSupabaseAdminClient(c.env);
  const { data: row } = await supabase.from('cases').select('*').eq('id', c.req.param('id')).maybeSingle();
  if (!row) throw new HTTPException(404, { message: 'Caso anônimo não encontrado' });

  const isOwner = row.user_id === user.id;
  if (row.user_id && !isOwner) {
    throw new HTTPException(403, { message: 'Caso já vinculado a outro usuário' });
  }

  if (!row.user_id) {
    const body = await c.req.json<any>().catch(() => ({}));
    if (!row.claim_token || body.claimToken !== row.claim_token) {
      throw new HTTPException(403, { message: 'Token de claim inválido ou ausente' });
    }
  }

  const domain = rowToDomain(row);
  const { name, email, phone, cpf } = await c.req.json<any>().catch(() => ({}));
  domain.clientName = name || domain.clientName;
  domain.clientEmail = email || domain.clientEmail;
  domain.clientPhone = phone || domain.clientPhone;
  domain.clientCpf = cpf || domain.clientCpf;
  domain.isAnonymous = false;
  domain.updatedAt = new Date().toISOString();
  domain.userId = user.id;
  domain.timeline = [
    ...(domain.timeline || []),
    {
      id: `tl_${Date.now()}`,
      title: 'Cadastro Concluído',
      description: `Caso vinculado ao motorista ${domain.clientName}.`,
      timestamp: new Date().toISOString(),
      type: 'system',
    },
  ];

  const updatedRow = domainToRow(domain);
  const { data, error } = await supabase.from('cases').update(updatedRow).eq('id', domain.id).select().single();
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json(rowToDomain(data));
});

// POST /api/cases/:id/generate-defense — gera minuta determinística
casesRoutes.post('/cases/:id/generate-defense', authenticateToken, async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: row } = await supabase.from('cases').select('*').eq('id', c.req.param('id')).maybeSingle();
  if (!row) throw new HTTPException(404, { message: 'Caso não encontrado' });

  const user = c.get('user');
  if (!canAccessCase(user, row)) {
    throw new HTTPException(403, { message: 'Você não tem permissão para acessar este caso' });
  }

  const domain = rowToDomain(row);
  const body = await c.req.json<any>().catch(() => ({}));

  // Resolve qualificação do requerente (body → applicant existente)
  const b = body.applicantData || {};
  const resolvedApplicant =
    body.applicantData &&
    (b.name !== undefined || b.applicantName !== undefined)
      ? {
          name: b.name || b.applicantName || '',
          cpf: b.cpf || b.applicantCpf || '',
          rg: b.rg || b.applicantRg,
          cnh: b.cnh || b.applicantCnh || '',
          category: b.category || b.cnhCategory,
          address: b.address || (b.addressStreet ? `${b.addressStreet}, ${b.addressNumber || ''}` : ''),
          cityState: b.cityState || b.addressCityState || '',
        }
      : domain.applicant
        ? {
            name: domain.applicant.applicantName,
            cpf: domain.applicant.applicantCpf,
            rg: domain.applicant.applicantRg,
            cnh: domain.applicant.applicantCnh,
            category: domain.applicant.cnhCategory,
            address: `${domain.applicant.addressStreet}, ${domain.applicant.addressNumber || ''}`,
            cityState: domain.applicant.addressCityState,
          }
        : undefined;

  if (
    !resolvedApplicant ||
    !resolvedApplicant.name ||
    !resolvedApplicant.cpf ||
    !resolvedApplicant.cnh ||
    !resolvedApplicant.address ||
    !resolvedApplicant.cityState
  ) {
    throw new HTTPException(400, {
      message: 'Dados de qualificação do requerente incompletos. Preencha os dados complementares antes de gerar a defesa.',
    });
  }

  const defense = await generateDeterministicDraft(domain);
  if (body.customFacts) {
    defense.factsNarrative = body.customFacts;
  }

  const analysis = domain.analysis || {};
  defense.integrityHash = await computeDefenseIntegrityHash(defense as any, analysis);

  domain.defenseDraft = defense;
  domain.currentStage = 3;
  domain.status = 'defesa_pronta';
  domain.updatedAt = new Date().toISOString();
  domain.timeline = [
    ...(domain.timeline || []),
    {
      id: `tl_def_${Date.now()}`,
      title: 'Petição Administrativa Atualizada',
      description: `Minuta da ${domain.serviceType} estruturada com ${defense.selectedArgumentIds.length} teses jurídicas.`,
      timestamp: new Date().toISOString(),
      type: 'defense',
    },
  ];

  const updatedRow = domainToRow(domain);
  const { data, error } = await supabase.from('cases').update(updatedRow).eq('id', domain.id).select().single();
  if (error) throw new HTTPException(400, { message: error.message });

  return c.json({ success: true, defenseDraft: defense, case: rowToDomain(data) });
});

export default casesRoutes;