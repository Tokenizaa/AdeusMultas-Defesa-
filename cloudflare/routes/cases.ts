import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { rowToDomain, domainToRow } from '../canonical-mapper';
import { computeDefenseIntegrityHash, hasValidDefenseIntegrity } from '../defense-integrity';
import { analyzeInfractionCompat, generateDefenseDraftCompat } from '../rag-adapter';
import { runCanonicalQualityGate } from '../quality-gate';

const isCanonicalUserId = (value: string | undefined): boolean =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const canAccessCase = (user: AuthenticatedUser | undefined, row: any): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!row?.user_id || !isCanonicalUserId(user.id)) return false;
  return row.user_id === user.id;
};

export const casesRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

const boundedString = (value: unknown, maxLength: number): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : undefined;

function createClaimToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function claimTokensMatch(provided: unknown, stored: unknown): boolean {
  if (typeof provided !== 'string' || typeof stored !== 'string' || !provided || provided.length !== stored.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < stored.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ stored.charCodeAt(index);
  }
  return difference === 0;
}

// Public anonymous intake is deliberately separate from authenticated case creation.
casesRoutes.post('/cases/anonymous', async (c) => {
  const ipAddress = c.req.header('cf-connecting-ip');
  const limiter = c.env.ANONYMOUS_CASE_LIMITER;
  if (!ipAddress || !limiter) {
    throw new HTTPException(503, { message: 'Criação anônima temporariamente indisponível.' });
  }
  const { success } = await limiter.limit({ key: ipAddress });
  if (!success) {
    c.header('Retry-After', '60');
    throw new HTTPException(429, { message: 'Limite temporário de novos casos atingido.' });
  }

  const body = await c.req.json<any>().catch(() => null);
  const infractionInput = body?.infraction;
  const vehicleInput = body?.vehicle;
  const aitNumber = boundedString(infractionInput?.aitNumber, 80);
  const infractionCode = boundedString(infractionInput?.infractionCode, 20);
  const location = boundedString(infractionInput?.location, 240);
  const plate = boundedString(vehicleInput?.plate, 8);
  // The public onboarding form does not collect make/model during free analysis.
  // Preserve that uncertainty explicitly instead of rejecting a valid intake.
  const brandModel = boundedString(vehicleInput?.brandModel, 120) || 'Não informado';
  if (!aitNumber || !infractionCode || !location || location.length < 5 || !plate || plate.length < 7) {
    throw new HTTPException(400, { message: 'Dados mínimos da autuação e do veículo incompletos.' });
  }

  const claimToken = createClaimToken();
  const now = new Date().toISOString();
  const infraction = {
    aitNumber,
    infractionCode,
    description: boundedString(infractionInput.description, 240) || '',
    ctbArticle: boundedString(infractionInput.ctbArticle, 80) || '',
    severity: boundedString(infractionInput.severity, 20) || 'media',
    points: Number.isFinite(Number(infractionInput.points)) ? Number(infractionInput.points) : 0,
    fineAmount: Number.isFinite(Number(infractionInput.fineAmount)) ? Number(infractionInput.fineAmount) : 0,
    // A análise gratuita ainda não coleta o órgão autuador. Preserve a
    // incerteza explicitamente para que o motor determinístico possa avaliar
    // as demais regras sem transformar a ausência em fallback silencioso.
    // Isso não afirma um órgão: documentos e UI continuam exibindo
    // "Não informado".
    autuadorBody: boundedString(infractionInput.autuadorBody, 120) || 'Não informado',
    dateTime: boundedString(infractionInput.dateTime, 40) || undefined,
    location,
    speedLimit: Number.isFinite(Number(infractionInput.speedLimit)) ? Number(infractionInput.speedLimit) : undefined,
    measuredSpeed: Number.isFinite(Number(infractionInput.measuredSpeed)) ? Number(infractionInput.measuredSpeed) : undefined,
    consideredSpeed: Number.isFinite(Number(infractionInput.consideredSpeed)) ? Number(infractionInput.consideredSpeed) : undefined,
    radarEquipmentId: boundedString(infractionInput.radarEquipmentId, 120) || undefined,
    inmetroAferitionDate: boundedString(infractionInput.inmetroAferitionDate, 40) || undefined,
    formalFlawsDetected: [],
  };
  const caseId = crypto.randomUUID();
  const domainData: any = {
    id: caseId,
    title: `Diagnóstico Auto ${aitNumber}`,
    clientName: boundedString(body?.userNome, 160) || 'Condutor',
    clientPhone: boundedString(body?.userPhone, 40) || '',
    serviceType: boundedString(body?.serviceType, 60) || 'defesa_previa',
    userId: null,
    isAnonymous: true,
    claimToken,
    isPaid: false,
    status: 'analisado',
    currentStage: 2,
    vehicle: {
      plate,
      brandModel,
      renavam: boundedString(vehicleInput.renavam, 40) || undefined,
      year: boundedString(vehicleInput.year, 10) || undefined,
      color: boundedString(vehicleInput.color, 40) || undefined,
    },
    infraction,
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };

  domainData.analysis = await analyzeInfractionCompat(c.env, caseId, infraction);
  // O procedimento escolhido pelo usuário é parte do contrato do caso. O
  // Rule Engine classifica a infração, mas não pode substituir a fase
  // processual explicitamente selecionada no onboarding.
  domainData.analysis.recommendedProcedure = domainData.serviceType;
  const row = domainToRow(domainData);
  row.user_id = null;
  row.is_anonymous = true;
  row.claim_token = claimToken;
  row.is_paid = false;

  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase.from('cases').insert(row).select().single();
  if (error || !data) throw new HTTPException(503, { message: 'Não foi possível salvar o diagnóstico.' });
  return c.json({ ...rowToDomain(data), claimToken }, 201);
});

// Recuperação anônima autenticada por token bearer de alta entropia.
 // Não usar ID isolado como autorização; respostas inválidas são indistinguíveis.
casesRoutes.post('/cases/anonymous/:id/recover', async (c) => {
  const ipAddress = c.req.header('cf-connecting-ip');
  const limiter = c.env.ANONYMOUS_CASE_LIMITER;
  if (!ipAddress || !limiter) {
    throw new HTTPException(503, { message: 'Recuperação temporariamente indisponível.' });
  }
  const { success } = await limiter.limit({ key: `recover:${ipAddress}` });
  if (!success) {
    c.header('Retry-After', '60');
    throw new HTTPException(429, { message: 'Limite temporário de recuperação atingido.' });
  }

  const body = await c.req.json<any>().catch(() => null);
  const providedToken = body?.claimToken;
  if (typeof providedToken !== 'string' || !/^[a-f0-9]{64}$/i.test(providedToken)) {
    throw new HTTPException(404, { message: 'Caso não encontrado ou token inválido.' });
  }

  const supabase = createSupabaseAdminClient(c.env);
  const { data: row, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', c.req.param('id'))
    .eq('is_anonymous', true)
    .is('user_id', null)
    .maybeSingle();

  if (error) throw new HTTPException(503, { message: 'Não foi possível recuperar o caso.' });
  if (!row || !claimTokensMatch(providedToken, row.claim_token)) {
    throw new HTTPException(404, { message: 'Caso não encontrado ou token inválido.' });
  }

  const recovered = rowToDomain(row);
  // O segredo nunca é devolvido pelo endpoint de recuperação.
  delete (recovered as any).claimToken;
  return c.json({ case: recovered });
});

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
  if (row.is_paid !== true) {
    throw new HTTPException(402, { message: 'Pagamento necessário para gerar a defesa.' });
  }

  const domain = rowToDomain(row);

  if (domain.defenseDraft && domain.analysis) {
    if (
      !(await hasValidDefenseIntegrity(domain.defenseDraft as any, domain.analysis as any, {
        aitNumber: domain.infraction?.aitNumber,
        infractionCode: domain.infraction?.infractionCode,
        ctbArticle: domain.infraction?.ctbArticle,
        dateTime: domain.infraction?.dateTime,
        location: domain.infraction?.location,
        measuredSpeed: domain.infraction?.measuredSpeed,
        consideredSpeed: domain.infraction?.consideredSpeed,
        speedLimit: domain.infraction?.speedLimit,
        radarEquipmentId: domain.infraction?.radarEquipmentId,
        inmetroAferitionDate: domain.infraction?.inmetroAferitionDate,
      }))
    ) {
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
  // Recompute analysis server-side (canonical analysis via RAG)
  if (domainData.infraction) {
    domainData.analysis = await analyzeInfractionCompat(c.env, domainData.id, domainData.infraction);
    domainData.analysis.recommendedProcedure = domainData.serviceType;
  }

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

  // Recompute analysis if infraction data changed (via RAG)
  if (updatedDomain.infraction) {
    updatedDomain.analysis = await analyzeInfractionCompat(c.env, updatedDomain.id, updatedDomain.infraction);
  }

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

  const body = await c.req.json<any>().catch(() => ({}));

  const isOwner = row.user_id === user.id;
  if (row.user_id && !isOwner) {
    throw new HTTPException(403, { message: 'Caso já vinculado a outro usuário' });
  }

  if (!row.user_id) {
    if (!claimTokensMatch(body.claimToken, row.claim_token)) {
      throw new HTTPException(403, { message: 'Token de claim inválido ou ausente' });
    }
  }

  const domain = rowToDomain(row);
  const { name, email, phone, cpf } = body;
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
  let update = supabase.from('cases').update(updatedRow).eq('id', domain.id);
  if (!row.user_id) {
    update = update.is('user_id', null).eq('claim_token', row.claim_token);
  }
  const { data, error } = await update.select().single();
  if (error || !data) throw new HTTPException(409, { message: 'Caso já foi vinculado ou não pode ser atualizado.' });
  return c.json(rowToDomain(data));
});

// POST /api/cases/:id/qualification — persiste somente os dados de qualificação explicitamente fornecidos.
casesRoutes.post('/cases/:id/qualification', authenticateToken, async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: row, error: readError } = await supabase.from('cases').select('id,user_id,is_anonymous,applicant_json,client_name,client_email,client_phone,client_cpf').eq('id', c.req.param('id')).maybeSingle();
  if (readError) throw new HTTPException(500, { message: 'Não foi possível consultar o caso.' });
  if (!row) throw new HTTPException(404, { message: 'Caso não encontrado.' });
  const user = c.get('user');
  if (!canAccessCase(user, row) || row.is_anonymous === true) throw new HTTPException(403, { message: 'Vincule o caso à sua conta antes de informar os dados do requerente.' });

  const body = await c.req.json<any>().catch(() => ({}));
  const applicant = {
    applicantName: typeof body.name === 'string' ? body.name.trim() : '',
    applicantCpf: typeof body.cpf === 'string' ? body.cpf.replace(/\D/g, '') : '',
    applicantCnh: typeof body.cnh === 'string' ? body.cnh.trim() : '',
    applicantRg: typeof body.rg === 'string' ? body.rg.trim() : '',
    addressStreet: typeof body.addressStreet === 'string' ? body.addressStreet.trim() : '',
    addressNumber: typeof body.addressNumber === 'string' ? body.addressNumber.trim() : '',
    addressComplement: typeof body.addressComplement === 'string' ? body.addressComplement.trim() : '',
    addressCityState: typeof body.cityState === 'string' ? body.cityState.trim() : '',
    cnhCategory: typeof body.cnhCategory === 'string' ? body.cnhCategory.trim().toUpperCase() : '',
  };
  if (applicant.applicantName.length < 3 || applicant.applicantCpf.length !== 11 || !applicant.applicantCnh || !applicant.addressStreet || !applicant.addressNumber || !applicant.addressCityState || !/^[A-E]{1,2}$/.test(applicant.cnhCategory)) {
    throw new HTTPException(400, { message: 'Confira nome, CPF, CNH, endereço, município/UF e categoria da CNH.' });
  }
  const { error: updateError } = await supabase.from('cases').update({
    client_name: applicant.applicantName,
    client_email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : row.client_email,
    client_phone: typeof body.phone === 'string' ? body.phone.trim() : row.client_phone,
    client_cpf: applicant.applicantCpf,
    applicant_json: JSON.stringify(applicant),
    updated_at: new Date().toISOString(),
  }).eq('id', row.id).eq('user_id', user.id);
  if (updateError) throw new HTTPException(500, { message: 'Não foi possível salvar a qualificação.' });
  return c.json({ success: true, applicant: { ...applicant, applicantCpf: '***.***.***-' + applicant.applicantCpf.slice(-2) } });
});

// POST /api/cases/:id/generate-defense — gera minuta determinística via RAG + DocumentAssemblyEngine
casesRoutes.post('/cases/:id/generate-defense', authenticateToken, async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: row } = await supabase.from('cases').select('*').eq('id', c.req.param('id')).maybeSingle();
  if (!row) throw new HTTPException(404, { message: 'Caso não encontrado' });
  if (row.is_paid !== true) throw new HTTPException(402, { message: 'Pagamento ainda não foi confirmado pelo servidor. A minuta não pode ser gerada.' });

  const user = c.get('user');
  if (!canAccessCase(user, row)) {
    throw new HTTPException(403, { message: 'Você não tem permissão para acessar este caso' });
  }

  const domain = rowToDomain(row);
  const body = await c.req.json<any>().catch(() => ({}));

  // Recompute analysis from current infraction data (canonical, fresh via RAG)
  if (domain.infraction) {
    domain.analysis = await analyzeInfractionCompat(c.env, domain.id, domain.infraction);
    domain.analysis.recommendedProcedure = domain.serviceType;
  }

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
          processNumbers: b.processNumbers,
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
            processNumbers: domain.processNumbers,
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

  // Use the fresh analysis for defense generation (via RAG + DocumentAssemblyEngine)
  const defense = await generateDefenseDraftCompat(
    c.env,
    domain.id,
    domain.infraction,
    domain.vehicle?.plate || 'SEM PLACA',
    domain.vehicle?.brandModel || 'Veículo não informado',
    resolvedApplicant,
    domain.serviceType,
    domain.analysis
  );
  // Quality Gate no runtime canônico (ACHADO A-06): antes ele existia apenas em
  // src/core/ai/ai-orchestrator e em teste — o Worker gerava e devolvia peça sem
  // qualquer verificação. Fail-closed: reprovar é bloquear.
  const qualityGate = runCanonicalQualityGate({
    infraction: domain.infraction,
    analysis: domain.analysis,
    draft: defense,
    applicant: resolvedApplicant,
    vehicle: domain.vehicle,
    serviceType: domain.serviceType,
  });
  if (!qualityGate.overallPass) {
    throw new HTTPException(422, {
      message: `Documento reprovado no Quality Gate (${qualityGate.score}%): ${qualityGate.checks
        .filter((check) => !check.passed)
        .map((check) => `${check.check} — ${check.message}`)
        .join(' | ')}`,
    });
  }

  domain.defenseDraft = defense;
  domain.currentStage = 3;
  domain.status = 'defesa_pronta';
  domain.updatedAt = new Date().toISOString();
  domain.timeline = [
    ...(domain.timeline || []),
    {
      id: `tl_def_${Date.now()}`,
      title: 'Petição Administrativa Atualizada',
      description: `Minuta da ${domain.serviceType} estruturada com ${defense.selectedArgumentIds?.length || 0} teses jurídicas.`,
      timestamp: new Date().toISOString(),
      type: 'defense',
    },
  ];

  const updatedRow = domainToRow(domain);
  const { data, error } = await supabase.from('cases').update(updatedRow).eq('id', domain.id).select().single();
  if (error) throw new HTTPException(400, { message: error.message });

  return c.json({ success: true, defenseDraft: defense, qualityGate, case: rowToDomain(data) });
});

export default casesRoutes;
