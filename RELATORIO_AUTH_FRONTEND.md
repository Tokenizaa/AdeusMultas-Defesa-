# Relatório de Inspeção — Camada de Autenticação do Frontend

**Repositório:** DefesAi/AdeusMultas — `/home/lg/workspace/projects/AdeusMultas-Defesa-`  
**Branch:** `main`  
**Escopo:** Leitura apenas. Nenhum arquivo foi modificado.  
**Arquivos analisados:**
- `src/core/auth/AuthContext.tsx`
- `src/lib/authFetch.ts`
- `src/lib/supabase.ts` (trecho de autenticação)
- `src/components/public/AuthPageView.tsx`
- `src/components/auth/SharedAuthForm.tsx`
- `src/components/public/LoginPageView.tsx`
- `src/components/public/RegisterPageView.tsx`
- `src/types/auth.ts`

---

## 1. Visão Geral da Arquitetura

A autenticação do frontend é baseada em **Supabase Auth** (`@supabase/supabase-js`). O cliente é criado em `src/lib/supabase.ts` a partir de variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Um `AuthProvider` React (`src/core/auth/AuthContext.tsx`) gerencia o estado de sessão, e um wrapper `authFetch` (`src/lib/authFetch.ts`) injeta o token de acesso nas chamadas à API própria. O papel (`role`) do usuário é obtido do backend (`/api/auth/me`) com fallback para `user_metadata` e, por último, `'citizen'`.

---

## 2. Detalhes por Arquivo

### 2.1 `src/types/auth.ts`

Define os tipos centrais de autenticação (linhas 1-22):

- **Linha 1:** `export type UserRole = 'citizen' | 'admin';` — apenas dois roles possíveis.
- **Linhas 3-22:** `AuthUser` com campos `id`, `name`, `email`, `role`, `cpf?`, `phone?`, `cnh?`, `cityState?`, `rg?`, `cnhCategory?`, `addressStreet?`, `addressNumber?`, `addressComplement?`, `addressNeighborhood?`, `addressZipCode?`, `referralCode?`, `avatarUrl?`, `createdAt`.
- **Linhas 24-30:** `AuthState` com `user`, `role`, `isAuthenticated`, `isAdmin`, `isLoading`.

Não há validação (zod/yup) neste arquivo; validação é feita à mão nos componentes.

---

### 2.2 `src/lib/supabase.ts`

Este arquivo tem 1756 linhas (tipagem do banco gerada). A parte de autenticação fica nas linhas **2035-2109**:

| Linha | Conteúdo |
|-------|----------|
| 2038-2039 | Lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de `import.meta.env` (valor padrão `''`). |
| 2042-2048 | Aviso no console se as env estiverem ausentes ou contiverem placeholders (`your-`). |
| 2050-2055 | `isSupabaseConfigured` = URL e chave não vazias, URL começa com `https://`, chave com mais de 20 chars. |
| 2057-2059 | `supabase` = `createClient<Database>(supabaseUrl, supabaseAnonKey)` se configurado, senão `null`. |
| 2061 | `const STORAGE_KEY_AUTH = 'defesai_auth_session_v1';` |
| 2062 | `const STORAGE_KEY_USERS = 'defesai_registered_users_v1';` |
| 2064-2077 | `getStoredUsers()` — lê `STORAGE_KEY_USERS` do localStorage: mapa `email → { user: AuthUser, passwordHash: string }`. |
| 2079-2087 | `saveStoredUser(email, user, passwordHash)` — grava usuário + hash de senha no localStorage (modo fallback/offline). |
| 2089-2097 | `getStoredSession(): AuthUser \| null` — lê e faz `JSON.parse` de `STORAGE_KEY_AUTH` no localStorage. |
| 2099-2109 | `setStoredSession(user: AuthUser \| null)` — grava JSON em `STORAGE_KEY_AUTH` ou remove a chave se `null`. |

**Observação:** há dois storages no localStorage: `defesai_auth_session_v1` (sessão atual, informacional) e `defesai_registered_users_v1` (cadastros locais com `passwordHash`, usado como fallback quando Supabase não está configurado).

---

### 2.3 `src/core/auth/AuthContext.tsx`

O `AuthProvider` (linha 42) expõe `login`, `loginWithFacebook`, `signUp`, `logout`, `updateProfile`, `resetPassword`. Principais trechos:

#### Obtenção de role (linhas 10-29)
```ts
async function fetchUserRoleFromBackend(): Promise<UserRole | undefined> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return undefined;
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.ok) {
    const data = await res.json();
    return data.role as UserRole;
  }
  return undefined;
}
```
- Chama **`GET /api/auth/me`** com o access token da sessão Supabase no header `Authorization: Bearer`.
- O backend é a fonte autoritativa do role (evita consulta direta a `user_profiles` que bate em RLS).

#### Inicialização e restauração de sessão (linhas 46-121)
- **Linha 97:** `supabase.auth.getSession()` — recupera sessão existente do Supabase.
- **Linha 112:** `supabase.auth.onAuthStateChange(async (_event, session) => { await applySession(session?.user ?? null); ... })` — reativa a sessão em mudanças de estado (login, logout, token refresh).
- **Linha 69 (pontual):** `const role = (roleFromProfile ?? (sessionUser.user_metadata?.role as UserRole)) ?? 'citizen';` — ordem de prioridade: backend `/api/auth/me` → `user_metadata.role` → fallback hardcoded `'citizen'`.
- **Linhas 65-66:** consulta direta `supabase.from('user_profiles').select('*').eq('user_id', ...).maybeSingle()` para preencher perfil (nome, CPF, telefone, endereço, etc.).
- **Linha 91:** `setStoredSession(authUser)` — grava no localStorage (apenas informativo; nunca usado para autenticar/autorizar, conforme comentário na linha 90).

#### Login (linhas 123-161)
- **Linha 133:** `supabase.auth.signInWithPassword({ email: cleanEmail, password })`.
- Limpeza de email: `email.trim().toLowerCase()` (linha 125).
- Em caso de erro, repassa `error?.message` do Supabase diretamente (linha 140).
- Após sucesso, chama `fetchUserRoleFromBackend()` e monta `AuthUser` (linhas 143-153), grava `setStoredSession(authUser)` (linha 153).

#### Login social Facebook (linhas 163-180)
- **Linha 168:** `supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: ... } })`.

#### Cadastro (linhas 182-244)
- Validações locais: nome não vazio (188-191), email inclui `@` (192-195), senha ≥ 6 (196-199).
- **Linha 206:** `supabase.auth.signUp({ email, password, options: { data: { name, role: 'citizen', phone } } })`.
- O `role: 'citizen'` é gravado no `user_metadata` (editável pelo cliente via Supabase Auth se não houver restrição).
- Comentário nas linhas 219-220: `user_profiles` é criado pelo trigger `handle_new_user()` em `auth.users`; não há insert manual para evitar conflito de PK e erro de RLS.
- Se houver `data.session`, monta `AuthUser` com `role: 'citizen'` fixo (linhas 222-235) e grava sessão.
- Caso contrário retorna `requiresEmailConfirmation: true` (linha 238).

#### Recuperação de senha (linhas 304-316)
- **Linha 310:** `supabase.auth.resetPasswordForEmail(cleanEmail)` — envia link de redefinição por e-mail.
- Repassa `error.message` do Supabase diretamente ao frontend (linha 311).

#### Logout (linhas 246-258)
- **Linha 250:** `await supabase.auth.signOut();`
- **Linhas 255-256:** `setUser(null); setStoredSession(null);` — limpa estado React e remove `STORAGE_KEY_AUTH` do localStorage.

#### Atualização de perfil (linhas 260-302)
- `supabase.auth.updateUser({ data: { ... } })` para atualizar `user_metadata`.
- `supabase.from('user_profiles').update(profileData).eq('user_id', user.id)` para atualizar a tabela de perfis.

#### Helpers expostos (linhas 318-320)
- `role = user?.role || null`
- `isAuthenticated = Boolean(user)`
- `isAdmin = role === 'admin'`

---

### 2.4 `src/lib/authFetch.ts`

Wrapper do `fetch` nativo (linhas 10-24):

```ts
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  try {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
    }
  } catch { /* best-effort */ }
  return fetch(url, { ...options, headers });
}
```

- Injeta **apenas** `Authorization: Bearer <access_token>` da sessão Supabase.
- **Não injeta** headers `x-user-*` nem token sintético local.
- Sem sessão válida, a requisição segue anônima (sem token).

---

### 2.5 `src/components/public/AuthPageView.tsx`

Componente de página que orquestra login, cadastro e esqueceu a senha (linhas 11-121):

- **Linha 13:** consome `login`, `signUp`, `resetPassword`, `isLoading` do `useAuth()`.
- **Linha 16-19:** define modo inicial (`login` | `register`) com base no path (`/cadastro` → register) ou `initialTab`.
- **Linha 21:** `redirectTarget = queryParams.redirect || '/dashboard'`.
- **Linha 47:** `handleLogin` chama `login(email, password)` e, em caso de sucesso, navega para `redirectTarget`.
- **Linha 56:** `handleRegister` chama `signUp(name, email, password, phone)`; se `requiresEmailConfirmation`, exibe aviso; senão navega após 600ms.
- **Linha 69:** `handleForgotPassword` chama `resetPassword(email)`.
- Renderiza `SharedAuthForm` com `showPhone={true}`, `phoneRequired={false}`, `showPasswordConfirm={true}`, `showTerms={true}`, `showForgotPassword={true}` (linhas 102-116).

---

### 2.6 `src/components/auth/SharedAuthForm.tsx`

Formulário compartilhado (login + cadastro) com validação frontend (linhas 127-805):

#### Login (linhas 203-226)
- **Linhas 208-211:** exige email e password preenchidos; senão exibe erro genérico.
- Chama `onLogin(email, password)` (prop do AuthPageView → `AuthContext.login`).

#### Cadastro (linhas 231-274)
- **Linhas 236-239:** nome completo obrigatório.
- **Linhas 241-244:** email deve incluir `@`.
- **Linhas 246-249:** senha deve ter no mínimo 6 caracteres.
- **Linhas 251-254:** se `showPasswordConfirm`, senha e confirmação devem coincidir.
- **Linhas 256-259:** se `showTerms`, checkbox de termos LGPD deve estar marcado (`acceptTerms`).
- Chama `onRegister(name, email, password, phone)`.

#### Recuperação de senha (modal, linhas 279-301)
- **Linhas 281-284:** valida email com `@`.
- Chama `onForgotPassword(resetEmail)` (→ `AuthContext.resetPassword`).

#### HTML attributes (linhas 559, 583)
- `minLength={6}` no input de senha de cadastro.
- Inputs `required` nativo do HTML.

#### Estado UI
- `acceptTerms` inicializado como `true` (linha 158) — checkbox LGPD começa marcado por padrão.
- `rememberMe` inicializado como `true` (linha 159) — apenas visual, não afeta persistência (a sessão Supabase já persiste via cookie/localStorage do próprio cliente Supabase).

---

### 2.7 `src/components/public/LoginPageView.tsx` e `RegisterPageView.tsx`

Ambos são wrappers finos:
- `LoginPageView` (linhas 1-6): `<AuthPageView initialTab="login" />`.
- `RegisterPageView` (linhas 1-6): `<AuthPageView initialTab="register" />`.

---

## 3. Fluxo de Sessão (Resumo)

1. **Boot (App → AuthProvider):** `getSession()` restaura sessão do Supabase; `onAuthStateChange` reage a mudanças. O role é obtido via `/api/auth/me` (Bearer), com fallback `user_metadata.role` e, por último, `'citizen'`. O objeto `AuthUser` é gravado em localStorage via `setStoredSession` (apenas cache informativo).
2. **Login:** `signInWithPassword` → Supabase cria sessão → `onAuthStateChange` dispara → `applySession` → role via backend → `setUser` + `setStoredSession`.
3. **Cadastro:** `signUp` → (com confirmação de email) sessão nula e `requiresEmailConfirmation=true`; (sem confirmação) sessão ativa imediata.
4. **Esqueceu a senha:** `resetPasswordForEmail` → Supabase envia link.
5. **Logout:** `signOut()` → `setUser(null)` + `setStoredSession(null)` (remove `defesai_auth_session_v1` do localStorage).
6. **Requisições autenticadas:** `authFetch` lê `getSession()` e injeta `Authorization: Bearer <access_token>`.

---

## 4. Pontos Fracos Observados (Fatos, não presunções)

| # | Ponto fraco | Localização |
|---|-------------|-------------|
| 1 | **Role vindo de `user_metadata` (editável pelo cliente).** No cadastro (linha 210 do AuthContext) o `role: 'citizen'` é gravado no `user_metadata` do Supabase Auth. Na restauração (linha 69) o fallback usa `sessionUser.user_metadata?.role`. Um cliente com acesso ao Supabase Anon Key poderia alterar `user_metadata` e se autopromover, se o backend não validar rigorosamente o role via `/api/auth/me`. | `AuthContext.tsx:69, 144, 210, 227` |
| 2 | **Fallback hardcoded `?? 'citizen'.** Se backend e `user_metadata` falharem, o role vira `'citizen'` automaticamente, sem falha fechada (fail-closed) para role ausente. | `AuthContext.tsx:69, 144` |
| 3 | **Sessão persistida em localStorage.** `setStoredSession` grava `AuthUser` (incluindo role e dados de perfil) em `defesai_auth_session_v1` no localStorage. O comentário na linha 90 diz que é apenas informativo, mas o dado está exposto a XSS e leitura por qualquer script da página. | `supabase.ts:2061, 2099-2109`; `AuthContext.tsx:91` |
| 4 | **`STORAGE_KEY_USERS` armazena `passwordHash` no localStorage.** Modo fallback quando Supabase não está configurado; grava email + hash de senha em `defesai_registered_users_v1`. | `supabase.ts:2062-2087` |
| 5 | **Sem rate-limit no frontend.** Nenhum controle de tentativas de login/cadastro/recuperação no cliente (depende exclusivamente do Supabase/backend). | `AuthContext.tsx`, `SharedAuthForm.tsx` |
| 6 | **Mensagens de erro expõem detalhes do Supabase.** `login` repassa `error?.message` diretamente (linha 140); `resetPassword` repassa `error.message` (linha 311) e `err.message` (linha 314). Isso pode vazar informações internas do provedor. | `AuthContext.tsx:140, 311, 314` |
| 7 | **Validação de email fraca.** Apenas `email.includes('@')` (linhas 192, 241, 281); sem validação de domínio, formato completo ou prevenção de enumeração. | `AuthContext.tsx:192, 241`; `SharedAuthForm.tsx:241, 281` |
| 8 | **Checkbox LGPD iniciado marcado (`acceptTerms = true`).** O usuário pode cadastrar sem desmarcar ativamente; o consentimento não é uma ação explícita de opt-in. | `SharedAuthForm.tsx:158` |
| 9 | **Não há verificação de email confirmado antes de liberar acesso.** Quando `signUp` retorna `data.session` (sem confirmação obrigatória), o usuário entra imediatamente com `role: 'citizen'`. | `AuthContext.tsx:222-235` |
| 10 | **Consulta direta a `user_profiles` no frontend.** Linhas 65-66 fazem `.select('*').eq('user_id', ...)` expostos via cliente anon (sujeito a RLS, mas ainda assim exposto). | `AuthContext.tsx:65-66` |

---

## 5. Conclusão

A camada de auth do frontend delega toda a identidade ao Supabase Auth. O token de acesso é injetado exclusivamente via `Authorization: Bearer` pelo `authFetch`, sem headers `x-user-*`. O papel do usuário vem do backend `/api/auth/me` com fallback para `user_metadata` e, por fim, `'citizen'`. A sessão é refletida no localStorage (`defesai_auth_session_v1`) apenas como cache informativo, mas existem pontos de atenção: role baseado em `user_metadata` (editável pelo cliente), fallback `?? 'citizen'`, armazenamento de `passwordHash` no storage de fallback (`STORAGE_KEY_USERS`), ausência de rate-limit no frontend, e mensagens de erro que repassam detalhes brutos do Supabase. Nenhum segredo/token real foi exposto neste relatório.

---
*Relatório gerado a partir de leitura estática dos arquivos listados, sem alterações no repositório.*
