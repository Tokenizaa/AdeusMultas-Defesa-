/**
 * Utility for client-side formatted PDF / Print Export of the Legal Defense Petition
 */
import { CaseDomain } from '../types';

export function exportDefenseToPDF(caseData: CaseDomain, customText?: string) {
  const draftText = customText || caseData.defenseDraft?.fullDraftText || '';
  const dateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    // Fallback if popup is blocked
    window.print();
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Defesa Administrativa - Auto ${caseData.infraction?.aitNumber || 'Não informado'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 25mm 20mm 20mm 20mm;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #111827;
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    .header-timbre {
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 1.5pt solid #111827;
    }
    .header-timbre h1 {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: bold;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      color: #111827;
    }
    .header-timbre p {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #4b5563;
      margin: 0;
    }
    .meta-box {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      background-color: #f9fafb;
      border: 1pt solid #e5e7eb;
      padding: 10px 14px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
    }
    .meta-item strong {
      color: #111827;
    }
    .meta-item span {
      color: #374151;
    }
    .content-body {
      text-align: justify;
      text-justify: inter-word;
      white-space: pre-wrap;
      font-size: 11.5pt;
      line-height: 1.6;
    }
    .signature-section {
      margin-top: 40px;
      text-align: center;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 320px;
      margin: 0 auto 8px auto;
      border-top: 1pt solid #111827;
    }
    .signature-name {
      font-weight: bold;
      font-size: 11pt;
      margin: 0;
    }
    .signature-info {
      font-size: 9.5pt;
      color: #4b5563;
      margin: 2px 0 0 0;
    }
    .footer-stamp {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 0.5pt solid #d1d5db;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8pt;
      color: #6b7280;
    }
    .badge-paid {
      display: inline-block;
      padding: 2px 6px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 3px;
      font-weight: bold;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header-timbre">
    <h1>República Federativa do Brasil • Sistema Nacional de Trânsito</h1>
    <p>Defesa Administrativa de Infração de Trânsito • Lei Federal nº 9.503/1997 (CTB)</p>
  </div>

  <div class="meta-box">
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Auto de Infração (AIT):</strong>
        <span>${caseData.infraction?.aitNumber || 'Não informado'}</span>
      </div>
      <div class="meta-item">
        <strong>Placa / Veículo:</strong>
        <span>${caseData.vehicle?.plate || 'Não informado'} — ${caseData.vehicle?.brandModel || 'Não informado'}</span>
      </div>
      <div class="meta-item">
        <strong>Órgão Julgador:</strong>
        <span>${caseData.infraction?.autuadorBody || 'Não informado'}</span>
      </div>
      <div class="meta-item">
        <strong>Enquadramento:</strong>
        <span>${caseData.infraction?.infractionCode || 'Não informado'} (${caseData.infraction?.ctbArticle || 'Não informado'})</span>
      </div>
      <div class="meta-item">
        <strong>Requerente:</strong>
        <span>${caseData.clientName || 'Não informado'}</span>
      </div>
      <div class="meta-item">
        <strong>CPF:</strong>
        <span>${caseData.clientCpf || 'Não informado'}</span>
      </div>
    </div>
  </div>

  <div class="content-body">${draftText}</div>

  <div class="signature-section">
    <p style="margin-bottom: 30px;">Nestes termos, pede e espera deferimento.</p>
    <p style="margin-bottom: 40px;">${caseData.infraction?.location?.split('—')[1] || 'Não informado'}, ${dateFormatted}.</p>
    <div class="signature-line"></div>
    <p class="signature-name">${caseData.clientName || 'Não informado'}</p>
    <p class="signature-info">CPF: ${caseData.clientCpf || 'Não informado'} • Requerente / Condutor</p>
  </div>

  <div class="footer-stamp">
    <span>Documento gerado eletronicamente pela plataforma DefesAi • Autenticação: ${caseData.id}</span>
    <span class="badge-paid">✓ Petição Técnica Validada & Paga</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
