### Objetivo

Ajude desenvolvedores a trabalhar rapidamente neste frontend React + Vite + TypeScript. Forneça mudanças pequenas, seguras e testáveis; priorize alterações isoladas em componentes, serviços e hooks.

### Arquitetura (visão rápida)

- Projeto: Vite + React + TypeScript (entrada `src/main.tsx`, base `vite.config.ts`).
- Roteamento: `HashRouter` em `src/App.tsx`. Proteções de rota usam `useAuth()` e `ProtectedRoute` local.
- Estado global: `src/contexts/EvaluationContext.tsx` (useReducer) e `src/contexts/AuthContext.tsx` (login/token). Prefira usar esses providers para compartilhar dados.
- Chamadas à API: serviços em `src/services/*` usam `fetch` com `BASE_URL` e `API_ENDPOINTS` definidos em `src/config/apiConfig.ts`. O token de autenticação é armazenado em `localStorage` (`authToken`).

### Fluxos críticos e comandos

- Instalação / dev: `npm i` e `npm run dev` (usa Vite). Scripts estão em `package.json` (`dev`, `build`, `preview`, `lint`).
- Variáveis de ambiente: a base da API vem de `import.meta.env.VITE_API_BASE_URL`. Ao rodar localmente, defina `VITE_API_BASE_URL` (ex: `http://localhost:8080`).
- Testes e linter: não há suíte de testes configurada; `npm run lint` executa o ESLint do projeto.

### Convenções específicas do projeto

- Não há cliente HTTP centralizado além dos serviços em `src/services/*`. Ao adicionar novas chamadas, siga o padrão:
  - Use `getAuthToken()` de `src/config/apiConfig.ts` para incluir Authorization header.
  - As funções retornam JSON diretamente e lançam em `!response.ok`.
- Tipos: muitos tipos ligados às avaliações estão em `src/types/evaluation.ts`. Atualize/consuma esses tipos sempre que manipular dados de API.
- Estado global: alterações de dados (operadores, criterios, avaliacoes) devem usar `EvaluationContext` (actions definidas no reducer). Para efeitos colaterais (POST/PUT/DELETE) existem helpers em `EvaluationProvider` (`addOperator`, `updateOperator`, `deleteOperator`).

### Padrões de UI e componentes

- UI baseada em `shadcn` e Radix primitives localizados em `src/components/ui/` (ex.: `button.tsx`, `input.tsx`). Reutilize estes componentes para aparência consistente.
- Notificações: `Toaster` (em `src/components/ui/toaster`) e `Sonner` são usados por padrão; use-os para feedback do usuário.

### Como um agente deve propor mudanças (práticas seguras)

1. Faça mudanças pequenas: uma feature por PR.
2. Preserve contratos públicos: tipos em `src/types/*` e rotas em `src/App.tsx` raramente devem mudar sem coordenação.
3. Se tocar em API endpoints, atualize `src/config/apiConfig.ts` e `src/services/*` juntos.
4. Para autenticação, confirme fluxo: login grava `authToken` em `localStorage`; `AuthProvider` usa `/profile` para construir `user`.
5. Atualize `localStorage` keys usadas: `authToken`, `totalTeamTickets`.

### Exemplos práticos (trechos que um agente pode mudar)

- Para adicionar um novo endpoint: editar `src/config/apiConfig.ts` e adicionar funções em `src/services/<name>Service.ts` seguindo `getHeaders()` padrão e tratamento de `response.ok`.
- Para proteger uma rota nova: em `src/App.tsx` adicione uma rota com `ProtectedRoute` e o conjunto de `allowedGroups` apropriado.
- Para alterar comportamento global: editar `EvaluationContext.tsx` — use actions do reducer e atualize chamadas em `useEffect` quando necessário.

### Arquivos chave para referência rápida

- `src/config/apiConfig.ts` — base da API e token
- `src/contexts/AuthContext.tsx` — login, logout, carregamento do usuário
- `src/contexts/EvaluationContext.tsx` — estado global, reducer e actions
- `src/services/*` — todas as chamadas de API (operatorService, criteriaService, evaluationService)
- `src/App.tsx`, `src/main.tsx` — providers, roteamento e setup
- `package.json`, `vite.config.ts` — scripts e configuração do bundler

### O que evitar

- Não altere a estratégia de armazenamento de token (localStorage) sem atualizar `AuthProvider` e `getAuthToken()`.
- Evite grandes refactors sem testes; prefer incremental.

Se algo ficou faltando ou você quer que eu inclua exemplos de código específicos, diga quais áreas devo detalhar.
