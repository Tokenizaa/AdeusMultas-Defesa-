import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';

test.describe('Suíte E2E UI: Recurso Ordinário à JARI', () => {
  const service = 'recurso-jari';
  // Base index for this service to avoid collisions with other services
  const baseIndex = 1; // In practice, compute a unique range per service

  for (let i = 0; i < 4; i++) {
    const userIndex = baseIndex + i;
    test(`Cenário ${i + 1}: Recurso JARI - Teste ${userIndex}`, async ({ page }) => {
      // Start the onboarding wizard
      await page.goto('/novo-caso', { waitUntil: 'networkidle' });

      // Step 1: ServiceStep (Situation)
      await page.getByText('Multa de Trânsito').click();
      // Wait for DefenseStageStep heading (h2)
      await expect(page.getByRole('heading', { name: 'Recebi a penalidade (Com código de barras / boleto)', level: 2 })).toBeVisible();

      // Step 2: DefenseStageStep (Process Stage)
      await page.getByText('Recebi a penalidade (Com código de barras / boleto)').click();
      // Wait for InfractionCategoryStep heading (h2)
      await expect(page.getByRole('heading', { name: 'Tipo da Infração', level: 2 })).toBeVisible();

      // Step 3: InfractionCategoryStep
      await page.getByText('Excesso de velocidade').click();
      // Wait for InfractionIdentificationStep heading (h2)
      await expect(page.getByRole('heading', { name: 'Identificação da Autuação & Veículo', level: 2 })).toBeVisible();

      // Step 4: InfractionIdentificationStep
      // Fill AIT number
      const aitNumber = `NA-${String(userIndex).padStart(3, '0')}-2026`;
      await page.getByLabel('Número do AIT').fill(aitNumber);
      // Fill autuador body
      await page.getByLabel('Órgão autuador').fill('DETRAN-SP');
      // Fill vehicle plate
      const plate = `ABC${String(userIndex).padStart(3, '0')}`;
      await page.getByLabel('Placa do veículo').fill(plate);
      // Fill brand/model (optional, but we can fill)
      await page.getByLabel('Modelo do veículo').fill('Toyota Corolla');
      // Fill RENAVAM
      const renavam = `1234567${String(userIndex).padStart(3, '0')}`;
      await page.getByLabel('RENAVAM').fill(renavam);
      // Click next
      await page.getByRole('button', { name: 'Avançar' }).click();
      // Wait for SpecificInfractionDataStep heading (h2)
      await expect(page.getByRole('heading', { name: 'Perguntas Específicas do Seu Caso', level: 2 })).toBeVisible();

      // Step 5: SpecificInfractionDataStep (for excesso_velocidade, no required fields; we can just click next)
      await page.getByRole('button', { name: 'Avançar' }).click();
      // Wait for AnalysisProcessingStep heading (or the text 'Processando Análise Jurídica')
      await expect(page.getByText('Processando Análise Jurídica')).toBeVisible();

      // Step 6: AnalysisProcessingStep (wait for analysis to complete)
      // The step will automatically advance after analysis; we can wait for the next step button or text
      await page.waitForTimeout(2000); // Simple wait; in real scenario we'd wait for a spinner to disappear
      await expect(page.getByText('Diagnóstico Preliminar Concluído')).toBeVisible();

      // Step 7: FreeAnalysisResultStep
      await page.getByRole('button', { name: /Proceder para geração de documento/i }).click();
      // If not authenticated, we should see the auth gate
      const authGate = page.getByText('Entrar ou cadastrar');
      if (await authGate.isVisible()) {
        // Fill sign up form
        const user = TestUserFactory.create(userIndex);
        await page.getByLabel('Nome completo').fill(user.name);
        await page.getByLabel('E-mail').fill(user.email);
        await page.getByLabel('Senha').fill(user.password); // Assuming password field exists
        // Submit
        await page.getByRole('button', { name: /Criar conta e continuar/i }).click();
        // Wait for auth success and proceed to qualification step
        await page.waitForTimeout(2000);
      }
      // After auth, we should be at RequiredDataStep
      await expect(page.getByText('Qualificação do Requerente para a Peça')).toBeVisible();

      // Step 8: RequiredDataStep (should be pre-filled with user data)
      // We can optionally verify that fields are filled correctly
      const user = TestUserFactory.create(userIndex);
      await expect(page.getByLabel('Nome do requerente')).toHaveValue(user.name);
      await expect(page.getByLabel('E-mail')).toHaveValue(user.email);
      await expect(page.getByLabel('CPF')).toHaveValue(user.cpf);
      // Click next
      await page.getByRole('button', { name: 'Avançar' }).click();
      await expect(page.getByText('Revisão da Petição Formal')).toBeVisible();

      // Step 9: DocumentReviewStep
      // Verify that the draft contains user data
      await expect(page.locator('text=' + user.name)).toBeVisible();
      await expect(page.locator('text=' + user.cpf)).toBeVisible();
      await expect(page.locator('text=' + aitNumber)).toBeVisible();
      await expect(page.locator('text=' + plate)).toBeVisible();
      // Click proceed to payment
      await page.getByRole('button', { name: /Proceder para pagamento/i }).click();
      await expect(page.getByText('Emissão & Pagamento Seguro')).toBeVisible();

      // Step 10: DocumentCheckoutStep
      // In test mode, we should see the admin/test facilitator toolbar
      const simulateButton = page.getByRole('button', { name: /⚡ Simular Pagamento Aprovado \(PagBank Sandbox\)/i });
      if (await simulateButton.isVisible()) {
        await simulateButton.click();
      } else {
        // Fallback: maybe we need to click the PIX verify button after simulating payment via API? 
        // For simplicity, we'll just click the verify button assuming payment already simulated via testMode?
        // We'll instead click the PIX verify button after a short wait (assuming testMode auto-generates PIX with pending status)
        await page.getByRole('button', { name: /Já paguei — Verificar e Emitir Defesa/i }).click();
      }
      // Wait for payment processing and redirect to case detail
      await page.waitForURL(/\/cases\//, { timeout: 30000 });
      // Verify case detail page shows the case number
      await expect(page.locator('text=Caso')).toBeVisible();
      // Optionally, we can verify that the document was generated (maybe a download link)
      await expect(page.getByText(/Petição Formal Gerada/i)).toBeVisible();
    });
  }
});
