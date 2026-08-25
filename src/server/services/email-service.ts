/**
 * Email Service — Transactional email via Resend
 *
 * Resend free tier: 100 emails/day (3,000/month)
 * Alternative: Brevo (300/day free), Mailtrap (4,000/month free)
 *
 * Handles: defense ready notifications, payment confirmations,
 * password resets, case status updates, marketing opt-in
 */

import { logger } from '../observability/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface DefenseReadyEmailData {
  userName: string;
  caseId: string;
  infractions: Array<{
    code: string;
    description: string;
    fineAmount: number;
  }>;
  defenseUrl: string;
}

export interface PaymentConfirmationEmailData {
  userName: string;
  caseId: string;
  amount: number;
  paymentMethod: 'pix' | 'credit_card';
  transactionId: string;
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

function defenseReadyTemplate(data: DefenseReadyEmailData): string {
  const infractionRows = data.infractions
    .map(
      (inf) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#dc2626;font-weight:600">${inf.code}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#374151">${inf.description}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#059669">R$ ${inf.fineAmount.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const totalValue = data.infractions.reduce((sum, inf) => sum + inf.fineAmount, 0);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#071D41 0%,#1a3a8a 100%);border-radius:12px 12px 0 0;padding:32px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">🛡️ DefesAi</h1>
      <p style="color:#93c5fd;margin:8px 0 0;font-size:14px">Sua defesa está pronta</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
      <p style="color:#374151;font-size:16px;margin:0 0 16px">Olá <strong>${data.userName}</strong>,</p>

      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
        Identificamos <strong>${data.infractions.length} infração(ões)</strong> no seu caso <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px">#${data.caseId}</code>
        com valor total de <strong style="color:#059669">R$ ${totalValue.toFixed(2)}</strong>.
      </p>

      <!-- Infractions Table -->
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb">Código</th>
            <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb">Descrição</th>
            <th style="padding:12px 16px;text-align:right;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb">Valor</th>
          </tr>
        </thead>
        <tbody>${infractionRows}</tbody>
      </table>

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0">
        <a href="${data.defenseUrl}" style="display:inline-block;background:linear-gradient(135deg,#071D41,#1a3a8a);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.5px">
          Ver Minuta Jurídica
        </a>
      </div>

      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;text-align:center">
        Esta minuta foi gerada por IA especializada em direito de trânsito.<br>
        Recomendamos revisão por um advogado antes do envio ao DETRAN.
      </p>
    </div>

<!-- Footer -->
     <div style="padding:24px 16px;text-align:center">
       <p style="color:#9ca3af;font-size:12px;margin:0">
         DefesAi — Defesa de Infrações de Trânsito com IA<br>
         <a href="https://www.defesai.shop" style="color:#6b7280">www.defesai.shop</a>
       </p>
     </div>
  </div>
</body>
</html>`;
}

function paymentConfirmationTemplate(data: PaymentConfirmationEmailData): string {
  const methodLabel = data.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);border-radius:12px 12px 0 0;padding:32px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">✅ Pagamento Confirmado</h1>
    </div>

    <div style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
      <p style="color:#374151;font-size:16px;margin:0 0 16px">Olá <strong>${data.userName}</strong>,</p>

      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
        Seu pagamento foi confirmado com sucesso!
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 24px">
        <table style="width:100%;font-size:14px">
          <tr><td style="color:#6b7280;padding:4px 0">Caso:</td><td style="text-align:right;font-weight:600;color:#374151">#${data.caseId}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Valor:</td><td style="text-align:right;font-weight:700;color:#059669;font-size:18px">R$ ${data.amount.toFixed(2)}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Método:</td><td style="text-align:right;font-weight:600;color:#374151">${methodLabel}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Transação:</td><td style="text-align:right;font-family:monospace;font-size:12px;color:#6b7280">${data.transactionId}</td></tr>
        </table>
      </div>

      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0">
        Nossa equipe já está processando sua minuta jurídica. Você receberá um novo email quando estiver pronta.
      </p>
    </div>

<div style="padding:24px 16px;text-align:center">
       <p style="color:#9ca3af;font-size:12px;margin:0">
         DefesAi — Defesa de Infrações de Trânsito com IA<br>
         <a href="https://www.defesai.shop" style="color:#6b7280">www.defesai.shop</a>
       </p>
     </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Email Service
// ---------------------------------------------------------------------------

class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private baseUrl = 'https://api.resend.com';

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@www.defesai.shop';
    this.fromName = process.env.EMAIL_FROM_NAME || 'DefesAi';
  }

  private get isConfigured(): boolean {
    return Boolean(this.apiKey && !this.apiKey.startsWith('PLACEHOLDER'));
  }

  /**
   * Send a raw email via Resend API
   */
  async send(params: SendEmailParams): Promise<EmailResult> {
    if (!this.isConfigured) {
      logger.warn('email', 'email-service', 'send', 'Email service not configured — skipping send', {
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
      });
      return { success: false, error: 'Email service not configured. Set RESEND_API_KEY.' };
    }

    try {
      const to = Array.isArray(params.to) ? params.to : [params.to];

      const body: Record<string, unknown> = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: params.subject,
        html: params.html,
      };

      if (params.text) body.text = params.text;
      if (params.replyTo) body.reply_to = params.replyTo;
      if (params.tags) body.tags = params.tags;

      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = (errData as any).message || `Resend API error ${response.status}`;
        logger.error('email', 'email-service', 'send', 'Resend API error', { error: errMsg });
        return { success: false, error: errMsg };
      }

      const data = await response.json() as { id: string };

      logger.info('email', 'email-service', 'send', 'Email sent successfully', {
        messageId: data.id,
        to: to.join(', '),
        subject: params.subject,
      });

      return { success: true, messageId: data.id };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('email', 'email-service', 'send', 'Email send failed', { error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  /**
   * Send "defense ready" notification
   */
  async sendDefenseReady(data: DefenseReadyEmailData): Promise<EmailResult> {
    const totalValue = data.infractions.reduce((sum, inf) => sum + inf.fineAmount, 0);
    const html = defenseReadyTemplate(data);

    return this.send({
      to: data.userName.includes('@') ? data.userName : `${data.userName}@placeholder.com`,
      subject: `🛡️ Sua defesa está pronta — ${data.infractions.length} infração(ões) — R$ ${totalValue.toFixed(2)}`,
      html,
      tags: [
        { name: 'category', value: 'defense-ready' },
        { name: 'case_id', value: data.caseId },
      ],
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(data: PaymentConfirmationEmailData): Promise<EmailResult> {
    const html = paymentConfirmationTemplate(data);

    return this.send({
      to: data.userName.includes('@') ? data.userName : `${data.userName}@placeholder.com`,
      subject: `✅ Pagamento confirmado — Caso #${data.caseId}`,
      html,
      tags: [
        { name: 'category', value: 'payment-confirmation' },
        { name: 'case_id', value: data.caseId },
      ],
    });
  }

  /**
   * Send a generic notification email
   */
  async sendNotification(
    to: string,
    subject: string,
    body: string,
    options?: { from?: string; replyTo?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject,
      html: `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;color:#374151;line-height:1.6">${body}</body></html>`,
      replyTo: options?.replyTo,
    });
  }
}

export const emailService = new EmailService();
