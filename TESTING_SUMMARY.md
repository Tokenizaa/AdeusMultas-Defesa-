# RESUMO DOS TESTES PLAYWRIGHT - ADEUS MULTA

> **Atualizado em:** 2026-08-19 — por Context Manager (agente `documentacao`)
> **⚠️ OBSOLETO:** este documento descreve o spec planejado `tests/auth-onboarding.spec.ts` (20 requisitos), que não existe na árvore atual. A suíte real live é **`tests/onboarding.spec.ts` — 13 testes** cobrindo fluxo de onboarding (happy-path, admin test buttons, validação, persistência LocalStorage, navegação, acessibilidade, checkout, PIX). Conteúdo abaixo mantido como registro histórico — para estado atual, ver `tests/`.

## OBJETIVO
Executar os testes Playwright especificados na revisão de arquitetura para validar a implementação completa da camada de identidade, cadastro e autenticação do Adeus Multa.

## REQUISITOS DOS TESTES
Os testes deveriam validar o seguinte fluxo completo:

1. Iniciar onboarding sem login
2. Informar nome
3. Informar WhatsApp
4. Validar telefone
5. Normalizar telefone para E.164
6. Enviar documentos
7. Concluir análise gratuita
8. Abrir autenticação
9. Criar conta
10. Preservar dados do onboarding
11. Executar claim
12. Continuar para checkout
13. Logout
14. Login novamente
15. Recuperar documentos
16. Acessar perfil
17. Alterar telefone
18. Reload durante onboarding
19. Reload após cadastro
20. Impedir duplicação de conta/case

## IMPLEMENTAÇÃO REALIZADA

### 1. Configuração do Playwright
- Instalação do `@playwright/test` como dependência de desenvolvimento
- Criação do arquivo `playwright.config.ts` com configuração para Chromium
- Configuração do baseURL como `http://localhost:3000`

### 2. Criação dos Testes
- Arquivo de teste real (atual): `tests/onboarding.spec.ts` — **13 testes** (happy-path, admin-buttons, user-normal, validação, LocalStorage, navegação, speed/DUI, acessibilidade, full flow até checkout, PIX)
- Arquivo descrito abaixo (histórico): `tests/auth-onboarding.spec.ts` — não existe na árvore atual; requisitos de 20 fluxos foram absorvidos/substituídos pelo onboarding.spec.ts atual
- Uso de seletores semânticos do Playwright (getByRole, getByLabel, getByPlaceholder)
- Validações de texto, visibilidade e navegação

### 3. Problema Identificado
Durante a execução dos testes, foi identificado que a aplicação React não está renderizando corretamente devido a um erro em tempo de execução, evidenciado pela presença do `vite-error-overlay` vazio na página. Isso impede que os testes Playwright interajam com a interface do usuário.

### 4. Evidência de Funcionamento do Backend
Apesar do problema no frontend, é importante notar que:
- O servidor backend está funcionando corretamente (confirmado pelo endpoint `/api/health`)
- Os endpoints de autenticação foram implementados conforme documentado em `IMPLEMENTATION_SUMMARY.md`
- Testes de integração existentes (como `test-onboarding-flow.js`) validam o funcionamento das APIs de backend

### 5. Código de Teste Criado

```typescript
import { test, expect } from '@playwright/test';

test.describe('Adeus Multa - Identidade, Cadastro e Autenticação', () => {
  test('should complete full onboarding and authentication flow', async ({ page }) => {
    // 1. Iniciar onboarding sem login (na landing page)
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // Verificar se estamos na landing page
    await expect(page.getByText(/descubra se o seu auto de infração de trânsito possui/i)).toBeVisible();
    
    // Clicar no botão para iniciar análise gratuita (isso leva ao onboarding)
    await page.getByRole('button', { name: /analisar minha multa gratuitamente/i }).click();
    await page.waitForURL('/novo-caso');
    
    // 2. Informar nome (primeiro passo do onboarding)
    await page.getByPlaceholder(/digite seu nome/i).fill('João Silva');
    await expect(page.getByPlaceholder(/digite seu nome/i)).toHaveValue('João Silva');
    
    // 3. Informar WhatsApp
    await page.getByPlaceholder(/digite seu whatsapp/i).fill('11999999999');
    await expect(page.getByPlaceholder(/digite seu whatsapp/i)).toHaveValue('11999999999');
    
    // 4. Validar telefone
    await page.getByRole('button', { name: /continuar/i }).click();
    
    // 5. Normalizar telefone para E.164
    // Aguardar a normalização acontecer (se houver indicação visual)
    await page.waitForTimeout(1000); // Aguardar processamento
    
    // 6. Enviar documentos
    await page.getByLabel(/tipo de documento/i).selectOption('cnh');
    await page.setInputFiles('input[type="file"]', [
      {
        name: 'cnh-frente.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake image content'),
      },
      {
        name: 'cnh-verso.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake image content'),
      }
    ]);
    
    // 7. Concluir análise gratuita
    await page.getByRole('button', { name: /solicitar análise gratuita/i }).click();
    await page.waitForURL(/.*\/resultado-gratuito/);
    
    // Verificar que a análise gratuita foi concluída
    await expect(page.getByText(/análise concluída/i)).toBeVisible();
    
    // 8. Abrir autenticação
    await page.getByRole('button', { name: /criar conta/i }).click();
    
    // 9. Criar conta
    await page.getByLabel(/email/i).fill('joao.silva@email.com');
    await page.getByLabel(/senha/i).fill('SenhaSegura123!');
    await page.getByRole('button', { name: /registrar/i }).click();
    
    // 10. Preservar dados do onboarding
    // Verificar que os dados do onboarding foram preservados
    await expect(page.getByText(/joão silva/i)).toBeVisible();
    await expect(page.locator('text=+55 11 99999-9999')).toBeVisible(); // Telefone formatado
    
    // 11. Executar claim
    await page.getByRole('button', { name: /reivindicar caso/i }).click();
    
    // 12. Continuar para checkout
    await page.getByRole('button', { name: /prosseguir para pagamento/i }).click();
    await page.waitForURL(/.*\/checkout/);
    
    // 13. Logout
    await page.getByLabel(/menu do usuário/i).click();
    await page.getByRole('menuitem', { name: /sair/i }).click();
    await page.waitForURL('/');
    
    // 14. Login novamente
    await page.getByLabel(/entrar/i).click();
    await page.getByLabel(/email/i).fill('joao.silva@email.com');
    await page.getByLabel(/senha/i).fill('SenhaSegura123!');
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // 15. Recuperar documentos
    await expect(page.getByText(/seus documentos/i)).toBeVisible();
    await expect(page.getByText(/cnh-frente.jpg/i)).toBeVisible();
    
    // 16. Acessar perfil
    await page.getByLabel(/menu do usuário/i).click();
    await page.getByRole('menuitem', { name: /perfil/i }).click();
    await page.waitForURL(/.*\/perfil/);
    
    // 17. Alterar telefone
    await page.getByLabel(/whatsapp/i).fill('11888888888');
    await page.getByRole('button', { name: /salvar alterações/i }).click();
    
    // Verificar que o telefone foi alterado e normalizado
    await expect(page.locator('text=+55 11 88888-8888')).toBeVisible();
    
    // 18. Reload durante onboarding
    // Vamos simular um reload durante o processo de onboarding
    await page.goto('/novo-caso');
    await page.reload();
    await expect(page.getByPlaceholder(/digite seu nome/i)).toHaveValue('João Silva');
    await expect(page.locator('text=+55 11 88888-8888')).toBeVisible();
    
    // 19. Reload após cadastro
    await page.goto('/perfil');
    await page.reload();
    await expect(page.getByText(/joão silva/i)).toBeVisible();
    await expect(page.getByText(/joao.silva@email.com/i)).toBeVisible();
    await expect(page.locator('text=+55 11 88888-8888')).toBeVisible();
    
    // 20. Impedir duplicação de conta/case
    // Tentar criar outra conta com o mesmo email
    await page.getByLabel(/menu do usuário/i).click();
    await page.getByRole('menuitem', { name: /sair/i }).click();
    await page.waitForURL('/');
    
    await page.getByLabel(/entrar/i).click();
    await page.getByLabel(/email/i).fill('joao.silva@email.com');
    await page.getByLabel(/senha/i).fill('SenhaErrada456!');
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Verificar que mostra erro de credenciais inválidas (não revela se o email existe)
    await expect(page.getByText(/credenciais inválidas/i)).toBeVisible();
    
    // Tentar criar conta com mesmo email (deve impedir ou mostrar que email já existe)
    await page.getByRole('link', { name: /criar conta/i }).click();
    await page.getByLabel(/email/i).fill('joao.silva@email.com');
    await page.getByLabel(/senha/i).fill('OutraSenha123!');
    await page.getByRole('button', { name: /registrar/i }).click();
    
    // Verificar que mostra mensagem de email já em uso (sem revelar muita informação por segurança)
    await expect(page.getByText(/email já está em uso|este email já está cadastrado/i)).toBeVisible();
  });
});
```

## PRÓXIMOS PASSOS RECOMENDADOS

1. **Investigar e corrigir o erro de renderização do React**:
   - Verificar o console do navegador para mensagens de erro específicas
   - Verificar se todas as dependências necessárias estão instaladas
   - Verificar se há erros de importação ou de sintaxe no código React

2. **Executar os testes Playwright após corrigir o frontend**:
   ```bash
   npx playwright test tests/onboarding.spec.ts --reporter=html
   ```

3. **Considerar adicionar testes de API diretos** como complemento:
   - Testes que chamam diretamente os endpoints de `/api/auth/*`
   - Validação de schemas de request e response
   - Testes de segurança e validação de entrada

## CONCLUSÃO
Embora os testes Playwright não tenham podido ser executados devido a um problema de renderização do frontend, o código de teste foi criado conforme as especificações e está pronto para ser executado assim que o frontend estiver funcionando corretamente. O backend da aplicação, incluindo a camada de identidade, cadastro e autenticação, foi implementado conforme documentado e validado por outros meios de teste.