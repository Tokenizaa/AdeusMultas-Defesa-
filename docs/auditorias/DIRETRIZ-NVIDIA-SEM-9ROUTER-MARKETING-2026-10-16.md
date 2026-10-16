## 9. Diretriz complementar — NVIDIA padrão e remoção do 9Router na criação

**Decisão de produto para a Fase 1:** no módulo de Marketing, a NVIDIA deve ser o provedor padrão para criação de conteúdo por IA. Nenhuma criação de texto, imagem ou vídeo deve ser roteada por Ninerouter/9Router, nem cair silenciosamente nesse gateway como fallback.

Esta diretriz se aplica ao fluxo de criação do Marketing. A Fase 1 deve mapear separadamente outros usos de IA do produto (por exemplo, embeddings, RAG e análise de documentos) para evitar remover dependências fora do escopo por engano. Se a intenção for remover o 9Router de toda a aplicação, isso exige um inventário transversal e um plano de migração próprio.

### Evidência encontrada

- `src/server/observability/ai-provider-manager.ts` descreve e implementa uma cadeia de execução NVIDIA → 9Router → Gemini/RAG.
- `src/server/knowledge/embedding-service.ts` descreve NVIDIA → 9Router → Gemini/vetorização determinística.
- `src/server/services/ai-media-service.ts` usa `@google/genai` e depende de `GEMINI_API_KEY` para imagem/vídeo; portanto, a geração de mídia não está hoje centralizada em NVIDIA.
- `deploy/index.mjs` contém um proxy dedicado `/_9router/v1/*` para `NINEROUTER_UPSTREAM`.
- `CLOUDFLARE.md`, `.env.example.example`, `src/server/config/config-service.ts`, documentação e observabilidade ainda citam credenciais e estados de 9Router.
- `src/server/services/ai-media-service.ts` e auditorias anteriores registram fallbacks de imagem/vídeo simulados em certas condições. Esses fallbacks não podem ser apresentados como geração bem-sucedida.

### Trabalho obrigatório na Fase 1

1. Inventariar cada referência a `NINEROUTER`, `9router`, `/_9router` e variantes, classificando-a como runtime de criação de Marketing, outro domínio de IA, código legado, documentação, monitoramento ou segredo de deploy.
2. Mapear quais modelos/rotas NVIDIA realmente estão disponíveis e autenticados para texto, imagem e vídeo. Não presumir que a API de chat também gera mídia.
3. Definir a NVIDIA como provedor explícito e padrão no contrato de criação do Marketing; eliminar seleção automática de 9Router nessa jornada.
4. Se NVIDIA não suportar uma modalidade necessária no ambiente contratado, retornar indisponibilidade clara e registrar o gap. Não substituir por 9Router, Gemini, SVG, vídeo de amostra ou outro provedor sem autorização explícita.
5. Identificar e documentar quais segredos `NINEROUTER_*` podem ser desativados com segurança depois da migração. Não apagar segredos de produção antes de provar que nenhum outro serviço ainda os consome.
6. Atualizar configurações, mensagens de status, métricas, testes, documentação e instruções dos agentes para refletir o provedor real, sem métricas simuladas de disponibilidade.
7. Adicionar testes que falhem se o fluxo de criação do Marketing tentar chamar endpoints de 9Router ou declarar sucesso sem uma mídia real e válida.

### Critérios de aceite específicos

- NVIDIA é a única rota de provedor para criação de Marketing.
- Não há fallback silencioso para 9Router nem mocks apresentados como resultados reais.
- Texto, imagem e vídeo têm suporte NVIDIA verificado individualmente; qualquer modalidade sem suporte está explicitamente bloqueada e documentada.
- Os usos de 9Router fora da criação de Marketing foram inventariados antes de remover variáveis globais ou proxies.
- A remoção dos segredos e do proxy ocorre somente após busca de referências, testes e validação do runtime de produção.

**Ordem atualizada:** Fase 1 passa a incluir a auditoria de provedores e capacidades NVIDIA como requisito bloqueante. A Fase 2 só começa depois que o contrato de criação e o suporte real de cada modalidade estiverem definidos.
