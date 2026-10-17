---
name: e2e-frontend-validation
description: Validação funcional, visual e de acessibilidade dos fluxos do frontend do AdeusMultas em E2E.
---
# E2E Frontend Validation

Skill local exclusiva deste projeto; manter dentro de `.opencode/skills/`.

Mapear páginas e fluxos reais a partir do código e dos cenários. Testar formulários (obrigatoriedade, formato, campos ausentes/limites, mensagens, persistência), modais e diálogos (abrir/fechar, confirmar/cancelar, teclado, foco, rolagem), navegação, abas, carregamento, erro, sucesso, estado vazio, upload/download e recuperação após falhas.

Percorrer onboarding → confirmação de dados → análise → visualização da minuta → checklist/download → pagamento simulado/liberação quando aplicável. Comparar valores do formulário, payload, resposta da API, registros persistidos e documento final.

Validar mobile/tablet/desktop em larguras representativas, console, requests com erro, controles duplicados, layout cortado, foco visível, labels e navegação por teclado. Reutilizar Playwright e componentes de teste existentes. Guardar screenshots e traces nos artefatos da execução.

Aprovação exige comportamento, não apenas renderização. Registrar esperado, observado, evidência e severidade. Aspecto não verificado deve permanecer como tal.
