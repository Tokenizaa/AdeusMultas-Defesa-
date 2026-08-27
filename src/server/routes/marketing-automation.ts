import { Router } from 'express';
import { marketingAutomationWorker } from '../services/marketing-automation/worker';
import { supabaseAdmin } from '../../scraper-prospecting/supabase';
import { runScrape } from '../../scraper-prospecting/persister';
import { whatsappService } from '../services/whatsapp-service';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const status = await marketingAutomationWorker.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao obter status', message: (err as Error).message });
  }
});

router.post('/start', async (_req, res) => {
  try {
    const result = await marketingAutomationWorker.start();
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, status: 'RUNNING' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao iniciar', message: (err as Error).message });
  }
});

router.post('/pause', async (_req, res) => {
  try {
    const result = await marketingAutomationWorker.pause();
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, status: 'PAUSED' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao pausar', message: (err as Error).message });
  }
});

router.post('/stop', async (_req, res) => {
  try {
    const result = await marketingAutomationWorker.stop();
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, status: 'STOPPED' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao parar', message: (err as Error).message });
  }
});

router.get('/campaigns', async (_req, res) => {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enrichedCampaigns = await Promise.all(
      (campaigns || []).map(async (camp: any) => {
        try {
          const { data: links } = await supabaseAdmin
            .from('marketing_lead_campaigns')
            .select('status, contact_count')
            .eq('campaign_id', camp.id);

          const totalLeads = links?.length || 0;
          const queued = links?.filter((l) => l.status === 'queued').length || 0;
          const sent = links?.filter((l) => l.status === 'sent' || l.status === 'delivered').length || 0;
          const responded = links?.filter((l) => l.status === 'responded').length || 0;
          const converted = links?.filter((l) => l.status === 'converted').length || 0;
          const exhausted = links?.filter((l) => l.status === 'exhausted').length || 0;
          const contacted = links?.filter((l) => (l.contact_count || 0) > 0).length || 0;

          const responseRate = contacted > 0 ? Math.round((responded / contacted) * 100) : 0;
          const conversionRate = contacted > 0 ? Math.round((converted / contacted) * 100) : 0;

          return {
            ...camp,
            total_leads: totalLeads,
            metrics: {
              total: totalLeads,
              queued,
              sent,
              contacted,
              responded,
              converted,
              exhausted,
              responseRate,
              conversionRate,
            },
          };
        } catch {
          return {
            ...camp,
            total_leads: 0,
            metrics: {
              total: 0,
              queued: 0,
              sent: 0,
              contacted: 0,
              responded: 0,
              converted: 0,
              exhausted: 0,
              responseRate: 0,
              conversionRate: 0,
            },
          };
        }
      })
    );

    res.json(enrichedCampaigns);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar campanhas', message: (err as Error).message });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const { name, description, lead_type, target_cities, steps, max_contacts, min_interval_hours, status } = req.body;

    const { data, error } = await supabaseAdmin
      .from('marketing_campaigns')
      .insert({
        name,
        description: description || null,
        lead_type: lead_type || 'despachante',
        target_cities: target_cities || [],
        steps: steps && steps.length > 0 ? steps : [
          { step: 1, delay_hours: 0, message: 'Olá {nome}, tudo bem? Sou da DefesAi. Ajudamos a automatizar recursos e análises de CNH.' },
          { step: 2, delay_hours: 48, message: 'Oi {nome}, conseguiu avaliar nossa proposta para despachantes em {cidade}?' },
          { step: 3, delay_hours: 96, message: '{nome}, última mensagem: caso queira testar nossa IA para defesa de multas, estamos à disposição!' }
        ],
        max_contacts: max_contacts || 3,
        min_interval_hours: min_interval_hours || 48,
        status: status || 'active',
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao criar campanha', message: (err as Error).message });
  }
});

router.patch('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, name, description, min_interval_hours, steps } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (min_interval_hours !== undefined) updates.min_interval_hours = min_interval_hours;
    if (steps !== undefined) updates.steps = steps;

    const { data, error } = await supabaseAdmin
      .from('marketing_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao atualizar campanha', message: (err as Error).message });
  }
});

router.post('/campaigns/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.body;

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('marketing_leads')
      .select('*')
      .eq('lead_type', campaign.lead_type)
      .not('phone', 'is', null)
      .limit(limit);

    if (leadsError) throw leadsError;

    const { data: existingLinks } = await supabaseAdmin
      .from('marketing_lead_campaigns')
      .select('lead_id')
      .eq('campaign_id', id);

    const existingLeadIds = new Set((existingLinks || []).map((l: any) => l.lead_id));
    const newLeads = (leads || []).filter((l: any) => !existingLeadIds.has(l.id));

    const leadCampaigns = newLeads.map((lead: any) => ({
      lead_id: lead.id,
      campaign_id: id,
      status: 'queued',
      current_step: 0,
      contact_count: 0,
    }));

    if (leadCampaigns.length > 0) {
      const { error: lcError } = await supabaseAdmin
        .from('marketing_lead_campaigns')
        .insert(leadCampaigns);

      if (lcError) throw lcError;
    }

    const queues = newLeads.map((lead: any) => ({
      lead_campaign_id: (leadCampaigns.find((lc: any) => lc.lead_id === lead.id) as any)?.id,
      action: 'send_message',
      scheduled_at: new Date().toISOString(),
      max_attempts: 3,
    })).filter((q: any) => q.lead_campaign_id);

    if (queues.length > 0) {
      const { error: qError } = await supabaseAdmin
        .from('marketing_automation_queue')
        .insert(queues);

      if (qError) throw qError;
    }

    res.json({ success: true, enqueued: queues.length, campaign: campaign.name });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao iniciar campanha', message: (err as Error).message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const { count: totalLeads } = await supabaseAdmin.from('marketing_leads').select('*', { count: 'exact', head: true });
    const { count: totalCampaigns } = await supabaseAdmin.from('marketing_campaigns').select('*', { count: 'exact', head: true });
    const { count: queued } = await supabaseAdmin.from('marketing_lead_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'queued');
    const { count: sent } = await supabaseAdmin.from('marketing_lead_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'sent');
    const { count: responded } = await supabaseAdmin.from('marketing_lead_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'responded');
    const { count: converted } = await supabaseAdmin.from('marketing_lead_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'converted');
    const { count: exhausted } = await supabaseAdmin.from('marketing_lead_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'exhausted');
    const { count: totalMessages } = await supabaseAdmin.from('marketing_messages').select('*', { count: 'exact', head: true });
    const { count: pendingQueue } = await supabaseAdmin.from('marketing_automation_queue').select('*', { count: 'exact', head: true });

    const { count: contacted } = await supabaseAdmin
      .from('marketing_lead_campaigns')
      .select('*', { count: 'exact', head: true })
      .gte('contact_count', 1);

    const { count: erroredQueue } = await supabaseAdmin
      .from('marketing_automation_queue')
      .select('*', { count: 'exact', head: true })
      .gte('attempts', 3);

    res.json({
      totalLeads: totalLeads || 0,
      totalCampaigns: totalCampaigns || 0,
      queued: queued || 0,
      sent: sent || 0,
      responded: responded || 0,
      converted: converted || 0,
      exhausted: exhausted || 0,
      totalMessages: totalMessages || 0,
      pendingQueue: pendingQueue || 0,
      contacted: contacted || 0,
      interested: (responded || 0) + (converted || 0),
      errors: erroredQueue || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar estatísticas', message: (err as Error).message });
  }
});

router.get('/leads', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize as string) || 20));
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const leadType = (req.query.lead_type as string) || '';
    const city = (req.query.city as string) || '';
    const source = (req.query.source as string) || '';
    const contactFilter = (req.query.contact_filter as string) || '';
    const isPaginated = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.paginated === 'true';

    let query = supabaseAdmin
      .from('marketing_leads')
      .select('*', { count: 'exact' });

    if (leadType && leadType !== 'all') {
      query = query.eq('lead_type', leadType);
    }

    if (city && city !== 'all') {
      query = query.ilike('city', `%${city}%`);
    }

    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (contactFilter === 'has_whatsapp') {
      query = query.not('whatsapp', 'is', null);
    } else if (contactFilter === 'has_email') {
      query = query.not('email', 'is', null);
    } else if (contactFilter === 'has_website') {
      query = query.not('website', 'is', null);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('created_at', { ascending: false });

    if (isPaginated) {
      query = query.range(from, to);
    } else {
      query = query.limit(200);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    // Fetch distinct metadata for filter dropdowns
    const { data: cityData } = await supabaseAdmin
      .from('marketing_leads')
      .select('city')
      .not('city', 'is', null)
      .limit(300);

    const availableCities = Array.from(
      new Set((cityData || []).map((c: any) => c.city?.trim()).filter(Boolean))
    ).sort();

    const { data: sourceData } = await supabaseAdmin
      .from('marketing_leads')
      .select('source')
      .not('source', 'is', null)
      .limit(300);

    const availableSources = Array.from(
      new Set((sourceData || []).map((s: any) => s.source?.trim()).filter(Boolean))
    ).sort();

    if (isPaginated) {
      res.json({
        data: data || [],
        total: count || (data ? data.length : 0),
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
        availableCities,
        availableSources,
      });
    } else {
      res.json(data || []);
    }
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar leads', message: (err as Error).message });
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('marketing_leads')
      .select('*, campaigns:marketing_lead_campaigns(*, campaign:marketing_campaigns(*)), messages:marketing_messages(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar lead', message: (err as Error).message });
  }
});

router.get('/health', async (_req, res) => {
  try {
    const dbStart = Date.now();
    const { error: dbError } = await supabaseAdmin.from('marketing_leads').select('*', { count: 'exact', head: true });
    const dbLatency = Date.now() - dbStart;

    const { count: queueCount } = await supabaseAdmin
      .from('marketing_automation_queue')
      .select('*', { count: 'exact', head: true });

    const workerStatus = await marketingAutomationWorker.getStatus();
    
    // Check Evolution API status
    let evolutionStatus: any = { status: 'online', instance: process.env.EVOLUTION_INSTANCE_NAME || 'defesai' };
    try {
      const ev = await whatsappService.getInstanceStatus();
      if (ev) {
        evolutionStatus = {
          status: ev.status === 'open' ? 'online' : ev.status,
          instance: ev.instanceName,
          phone: ev.phone || null,
        };
      }
    } catch {
      // Fallback
    }

    res.json({
      database: {
        status: dbError ? 'offline' : 'online',
        latencyMs: dbLatency,
        error: dbError?.message || null,
      },
      queue: {
        status: 'online',
        pendingJobs: queueCount || 0,
      },
      worker: {
        status: workerStatus.status.toLowerCase(),
        processedCount: workerStatus.processedCount,
        lastError: workerStatus.lastError,
        lastProcessedAt: workerStatus.lastProcessedAt,
      },
      evolution: evolutionStatus,
      lastLeadProcessedAt: workerStatus.lastProcessedAt,
      lastError: workerStatus.lastError,
    });
  } catch (err) {
    res.status(500).json({
      database: { status: 'unknown', error: (err as Error).message },
      queue: { status: 'unknown' },
      worker: { status: 'unknown' },
      evolution: { status: 'unknown' },
    });
  }
});

router.get('/queue', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('marketing_automation_queue')
      .select('*, lead_campaign:marketing_lead_campaigns(lead:marketing_leads(*), campaign:marketing_campaigns(*))')
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar fila', message: (err as Error).message });
  }
});

router.post('/scrape', async (req, res) => {
  try {
    const { queries = [], cities = [], limitPerQuery = 10 } = req.body || {};

    const config = {
      queries: Array.isArray(queries) && queries.length > 0 ? queries : ['despachante de trânsito', 'advogado direito de trânsito'],
      cities: Array.isArray(cities) ? cities : [],
      states: [],
      limitPerQuery: Math.max(1, Math.min(50, Number(limitPerQuery) || 10)),
    };

    const result = await runScrape(config);

    res.json({
      success: true,
      source: result.source,
      query: result.query,
      totalFound: result.totalFound,
      inserted: result.inserted,
      duplicates: result.duplicates,
      rejected: result.rejected,
      errors: result.errors,
      leads: result.leads,
    });
  } catch (err) {
    console.error('Erro no endpoint /scrape:', err);
    res.status(500).json({ error: 'Falha ao executar scraper', message: (err as Error).message });
  }
});

export default router;