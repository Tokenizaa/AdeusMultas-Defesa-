import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { CheckoutView } from './CheckoutView';
import { AuthProvider } from '../../core/auth/AuthContext';
import { RouterProvider } from '../../core/router/RouterContext';

// ---------------------------------------------------------------------------
// Ambiente Node (vitest): RouterContext e AuthContext leem window.location em
// inicializadores lazy de useState, que rodam durante renderToString. Shimamos
// o mínimo necessário para que a renderização decorra sem rede nem DOM real.
// ---------------------------------------------------------------------------
const originalWindow = (globalThis as any).window;

const mockLocation = {
  pathname: '/checkout/case-pix-only-1',
  search: '',
  hash: '',
  origin: 'http://localhost',
  href: 'http://localhost/checkout/case-pix-only-1',
};

beforeAll(() => {
  globalThis.window = {
    location: mockLocation,
    history: { pushState: () => undefined, replaceState: () => undefined },
    sessionStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    },
    localStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
  } as any;
});

afterAll(() => {
  (globalThis as any).window = originalWindow;
});

const currentCase = {
  id: 'case-pix-only-1',
  isPaid: false,
  status: 'aguardando_pagamento',
  infraction: { aitNumber: 'AIT-12345' },
  clientName: 'Cliente Teste',
  clientEmail: 'cliente@teste.com',
  clientCpf: '123.456.789-09',
  serviceType: 'defesa_previa',
} as unknown as never;

const renderCheckout = (isAdmin = false) =>
  renderToString(
    <AuthProvider>
      <RouterProvider>
        <CheckoutView
          currentCase={currentCase as never}
          onPaymentSuccess={() => undefined}
          onBackToOnboarding={() => undefined}
          isAdmin={isAdmin}
        />
      </RouterProvider>
    </AuthProvider>
  );

describe('CheckoutView — checkout PIX-only (cartão oculto, não removido)', () => {
  it('exibe PIX como única opção visível e oculta o botão Cartão', () => {
    const html = renderCheckout();

    // PIX permanece como padrão e visível
    expect(html).toContain('PIX Instantâneo');
    expect(html).toContain('Pagamento Instantâneo');

    // QR Code, código copia e cola, botão copiar e verificação do pagamento seguem presentes
    expect(html).toContain('QR Code');
    expect(html).toContain('Ou Copie o Código PIX Copia e Cola');
    expect(html).toContain('Copiar');
    expect(html).toContain('Já Paguei — Verificar Pagamento');

    // Botão da opção Cartão está na página mas com classe hidden (display: none)
    expect(html).toContain('hidden');
    expect(html).toContain('Cartão');

    // O formulário de cartão NÃO é renderizado (pix é o único visível)
    expect(html).not.toContain('Cartão de Crédito');
    expect(html).not.toContain('Tokenização segura PagBank');
  });

  it('mantém a visibilidade dos controles de administração de teste inalterada', () => {
    const htmlAdmin = renderCheckout(true);
    // renderToString escapa '&' como '&amp;'; correspondemos a substring sem o e-comercial.
    expect(htmlAdmin).toContain('Ferramentas de Teste — Admin');
    expect(htmlAdmin).toContain('Simular Pagamento Aprovado (PagBank Sandbox)');

    // Sem admin, a toolbar não aparece
    const htmlNoAdmin = renderCheckout(false);
    expect(htmlNoAdmin).not.toContain('Ferramentas de Teste');
  });

  it('preserva o código do cartão no source (integração não apagada)', () => {
    const checkoutSrc = readFileSync(
      fileURLToPath(new URL('./CheckoutView.tsx', import.meta.url)),
      'utf8',
    );
    expect(checkoutSrc).toContain("import { CreditCardForm } from './CreditCardForm'");
    expect(checkoutSrc).toContain('<CreditCardForm');
    expect(checkoutSrc).toContain('handleCreditCardSuccess');
    expect(checkoutSrc).toContain('handleCreditCardError');
    expect(checkoutSrc).toContain("setPaymentMethod('credit_card')");

    // O endpoint/handler de cartão do backend segue presente (não foi removido).
    const paymentsRoute = readFileSync(
      fileURLToPath(new URL('../../../cloudflare/routes/payments.ts', import.meta.url)),
      'utf8',
    );
    expect(paymentsRoute).toContain('/payments/credit-card/create');
    expect(paymentsRoute).toContain('createCreditCardOrder');
  });
});
