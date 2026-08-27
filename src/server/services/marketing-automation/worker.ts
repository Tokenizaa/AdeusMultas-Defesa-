import { supabaseAdmin } from '../../../scraper-prospecting/supabase';
import { whatsappService } from '../whatsapp-service';
import { logger } from '../../../scraper-prospecting/logger';

const POLL_INTERVAL_MS = 10_000;
const STATE_ID = '00000000-0000-0000-0000-000000000001';

type AutomationStatus = 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';

export class MarketingAutomationWorker {
  private static instance: MarketingAutomationWorker | null = null;
  private timer: NodeJS.Timeout | null = null;
  private currentStatus: AutomationStatus = 'STOPPED';
  private processing = false;

  static getInstance(): MarketingAutomationWorker {
    if (!MarketingAutomationWorker.instance) {
      MarketingAutomationWorker.instance = new MarketingAutomationWorker();
    }
    return MarketingAutomationWorker.instance;
  }

  async start(): Promise<{ success: boolean; error?: string }> {
    const state = await this.loadState();
    if (state.status === 'RUNNING') {
      return { success: false, error: 'Já está rodando.' };
    }

    await this.updateState('RUNNING');
    this.currentStatus = 'RUNNING';

    if (!this.timer) {
      this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
    }

    await this.tick();
    return { success: true };
  }

  async pause(): Promise<{ success: boolean; error?: string }> {
    const state = await this.loadState();
    if (state.status !== 'RUNNING') {
      return { success: false, error: 'Não está rodando.' };
    }

    await this.updateState('PAUSED');
    this.currentStatus = 'PAUSED';
    return { success: true };
  }

  async stop(): Promise<{ success: boolean; error?: string }> {
    await this.updateState('STOPPED');
    this.currentStatus = 'STOPPED';

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    return { success: true };
  }

  async getStatus(): Promise<{ status: AutomationStatus; lastError?: string | null; lastProcessedAt?: string | null; processedCount: number }> {
    const state = await this.loadState();
    return {
      status: state.status as AutomationStatus,
      lastError: state.last_error,
      lastProcessedAt: state.last_processed_at,
      processedCount: state.processed_count,
    };
  }

  private async tick(): Promise<void> {
    if (this.processing) return;
    if (this.currentStatus !== 'RUNNING') return;

    this.processing = true;
    try {
      const state = await this.loadState();
      if (state.status !== 'RUNNING') {
        this.currentStatus = state.status as AutomationStatus;
        return;
      }

      const actions = await this.getNextActions();
      for (const action of actions) {
        if (this.currentStatus !== 'RUNNING') break;
        await this.processAction(action);
      }

      await this.updateState('RUNNING');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`tick_error: ${message}`, { module: 'worker' });
      await this.updateState('ERROR', message);
      this.currentStatus = 'ERROR';
    } finally {
      this.processing = false;
    }
  }

  private async processAction(action: any): Promise<void> {
    try {
      switch (action.action) {
        case 'send_message':
          await this.handleSendMessage(action);
          break;
        case 'wait_response':
          await this.handleWaitResponse(action);
          break;
        case 'update_status':
          await this.handleUpdateStatus(action);
          break;
        case 'finish':
          await this.handleFinish(action);
          break;
      }

      await supabaseAdmin
        .from('marketing_automation_queue')
        .delete()
        .eq('id', action.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Action error: ${message}`, { actionId: action.id, error: message });

      await supabaseAdmin
        .from('marketing_automation_queue')
        .update({
          attempts: (action.attempts || 0) + 1,
          last_error: message,
        })
        .eq('id', action.id);
    }
  }

  private async handleSendMessage(action: any): Promise<void> {
    const { lead_campaign_id } = action;
    const { data: lc, error: lcError } = await supabaseAdmin
      .from('marketing_lead_campaigns')
      .select('*, campaign:marketing_campaigns(*), lead:marketing_leads(*)')
      .eq('id', lead_campaign_id)
      .single();

    if (lcError || !lc) {
      throw new Error(`Lead campaign não encontrada: ${lead_campaign_id}`);
    }

    const lead = lc.lead as any;
    const campaign = lc.campaign as any;
    if (!lead.phone && !lead.whatsapp) {
      throw new Error('Lead sem telefone/WhatsApp.');
    }

    const toPhone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    if (!toPhone) {
      throw new Error('Telefone inválido.');
    }

    const stepIndex = lc.current_step;
    const steps = campaign.steps || [];
    const step = steps[stepIndex];
    if (!step) {
      throw new Error('Step não encontrado na campanha.');
    }

    const text = this.renderMessage(step.message || '', lead);

    const result = await whatsappService.sendText({
      to: toPhone,
      message: text,
      instanceName: process.env.EVOLUTION_INSTANCE_NAME,
    });

    const messageId = result.messageId || `wamid_${Date.now()}`;

    await supabaseAdmin.from('marketing_messages').insert({
      lead_id: lead.id,
      campaign_id: campaign.id,
      lead_campaign_id: lc.id,
      direction: 'outbound',
      text,
      channel: 'whatsapp_evolution',
      status: result.success ? 'sent' : 'failed',
      external_id: result.messageId,
      external_status: result as any,
      sent_at: new Date().toISOString(),
    });

    const nextStep = stepIndex + 1;
    const isLastStep = nextStep >= steps.length;
    const newStatus = isLastStep ? 'exhausted' : 'sent';

    await supabaseAdmin
      .from('marketing_lead_campaigns')
      .update({
        status: newStatus,
        current_step: nextStep,
        contact_count: (lc.contact_count || 0) + 1,
        last_contact_at: new Date().toISOString(),
        next_contact_at: isLastStep ? null : new Date(Date.now() + (campaign.min_interval_hours || 48) * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', lead_campaign_id);

    if (!isLastStep) {
      await supabaseAdmin.from('marketing_automation_queue').insert({
        lead_campaign_id: lc.id,
        action: 'wait_response',
        scheduled_at: new Date(Date.now() + (campaign.min_interval_hours || 48) * 60 * 60 * 1000).toISOString(),
        max_attempts: 5,
      });
    }
  }

  private async handleWaitResponse(action: any): Promise<void> {
    const { lead_campaign_id } = action;
    const { data: lc, error } = await supabaseAdmin
      .from('marketing_lead_campaigns')
      .select('*, lead:marketing_leads(*)')
      .eq('id', lead_campaign_id)
      .single();

    if (error || !lc) {
      throw new Error(`Lead campaign não encontrada: ${lead_campaign_id}`);
    }

    const lead = lc.lead as any;
    const campaign = (lc as any).campaign;

    const lastMessage = await supabaseAdmin
      .from('marketing_messages')
      .select('*')
      .eq('lead_campaign_id', lead_campaign_id)
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMessage.data && lastMessage.data.status === 'sent') {
      await supabaseAdmin
        .from('marketing_lead_campaigns')
        .update({ status: 'delivered' })
        .eq('id', lead_campaign_id);
    }

    const nextAction = {
      lead_campaign_id: lc.id,
      action: 'send_message',
      scheduled_at: new Date(Date.now() + 60000).toISOString(),
      max_attempts: 3,
    };

    await supabaseAdmin.from('marketing_automation_queue').insert(nextAction);
  }

  private async handleUpdateStatus(action: any): Promise<void> {
    await supabaseAdmin
      .from('marketing_lead_campaigns')
      .update({ status: 'queued' })
      .eq('id', action.lead_campaign_id);
  }

  private async handleFinish(action: any): Promise<void> {
    await supabaseAdmin
      .from('marketing_lead_campaigns')
      .update({ status: 'exhausted' })
      .eq('id', action.lead_campaign_id);
  }

  private renderMessage(template: string, lead: any): string {
    return template
      .replace(/\{nome\}/gi, lead.name || '')
      .replace(/\{categoria\}/gi, lead.category || '')
      .replace(/\{cidade\}/gi, lead.city || '');
  }

  private async loadState(): Promise<{ status: AutomationStatus; last_error?: string | null; last_processed_at?: string | null; processed_count: number }> {
    const { data } = await supabaseAdmin
      .from('marketing_automation_state')
      .select('*')
      .eq('id', STATE_ID)
      .single();

    return {
      status: (data?.status || 'STOPPED') as AutomationStatus,
      last_error: data?.last_error,
      last_processed_at: data?.last_processed_at,
      processed_count: data?.processed_count || 0,
    };
  }

  private async updateState(status: AutomationStatus, lastError?: string): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'RUNNING') {
      updates.last_processed_at = new Date().toISOString();
      updates.processed_count = (await this.loadState()).processed_count + 1;
    }

    if (lastError) {
      updates.last_error = lastError;
    }

    await supabaseAdmin
      .from('marketing_automation_state')
      .upsert({ id: STATE_ID, ...updates });
  }

  private async getNextActions(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('marketing_automation_queue')
      .select('*')
      .lte('scheduled_at', new Date().toISOString())
      .lt('attempts', 'max_attempts')
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (error) {
      logger.error(`queue_error: ${error.message}`, { module: 'worker' });
      return [];
    }

    return data || [];
  }
}

export const marketingAutomationWorker = MarketingAutomationWorker.getInstance();