# Plano de Ação — Jornada Matemágica rumo a Production-Ready

> **Stack conservadora:** mantemos Vanilla JS + Express + MySQL raw. Nenhuma migração para TS/ORM/framework. Todas as recomendações cabem dentro desse perímetro.
>
> **Escopo:** web pública aberta, escala escolar (dezenas a alguns milhares de alunos), múltiplas escolas potencialmente acessando.
>
> **Foco priorizado:** (1) Segurança/Autenticação, (2) Arquitetura/Escalabilidade, (3) Game Design/Retenção.

---

## Contexto

O projeto Jornada Matemágica hoje é um jogo educacional de matemática composto por:

- **Backend** (`jornada-matemagica-api/`): Express 5 + MySQL2 raw, padrão MVC plano (routes → controllers → models). 23 endpoints distribuídos por 10 domínios (auth, jogador, quiz, progresso, sessão, histórico, arcade, feedback, assunto, configurações).
- **Frontend** (`jogo/`): HTML/CSS/JS vanilla servido pelo WAMP, 30 scripts globais carregados sequencialmente em `index.html`, engine de mapa 2D própria com Canvas e sistema adaptativo de dificuldade (`PlayerState.js`).

O jogo **funciona em desenvolvimento**, mas **não está pronto para o público**. Os bloqueios mais graves encontrados:

1. **Segurança crítica**: senha do banco em texto plano em `.env`, sem `.env.example`, sem `.gitignore` confiável; CORS aberto a qualquer origem; **nenhuma rota é autenticada** — qualquer cliente pode chamar `/api/progressos/:id_sessao` com um ID arbitrário e ler/escrever dados de outro jogador (`authController.js:5-70`, `server.js:7`).
2. **Schema desalinhado com o código**: pelo menos 4 tabelas usadas pelo código (`alternativa`, `arcade_run`, `arcade_meta`, `historico_resposta`) **não existem** em `tables.sql`; typo `explicacacao` no schema; FKs obsoletas em `sessao`. Um deploy em máquina nova não roda.
3. **Base URL hardcoded** em 4 arquivos do frontend (`LoginForm.js:52`, `QuizGame.js:38`, `Progress.js:60`, `ArcadeMeta.js:14`): impossível promover a produção sem editar código.
4. **Erros de API silenciosos**: quando o backend falha, o usuário só vê `console.error`; progresso pode ser perdido sem feedback visual.
5. **Game design fragmentado**: modo Fundamental e modo Arcade são duas economias separadas (Fundamental não persiste XP/rank/score); não há onboarding/tutorial; áudio existe mas raramente é disparado; ausência de feedback visual em acertos/erros além de cor de fundo.
6. **Level design hardcoded**: fases são objetos JS dentro de `OverworldMap.js` (1900+ linhas) — adicionar conteúdo exige redeploy.

O resultado pretendido deste plano é uma sequência de 6 ondas de trabalho que, mantendo a stack atual, levam o produto a um estado em que pode ser hospedado publicamente, receber alunos reais com segurança, sustentar crescimento de conteúdo e oferecer uma experiência polida que retenha jogadores.

---

## Pilar 1 — Estrutura de Arquivos e Arquitetura

### 1.1 Backend: solidificar o MVC atual com camadas explícitas

A organização hoje já tem `routes/`, `controllers/`, `models/`. O passo natural é adicionar três camadas que **não exigem framework novo** e resolvem 80% dos problemas de manutenção:

```
jornada-matemagica-api/
├── src/
│   ├── config/
│   │   ├── env.js              # carrega + valida .env (ver Pilar 2.5)
│   │   └── db.js               # pool MySQL (move db.js para cá)
│   ├── middlewares/
│   │   ├── auth.js             # valida JWT (NOVO — Pilar 2.1)
│   │   ├── errorHandler.js     # captura erros, formata resposta (NOVO)
│   │   ├── validate.js         # roda schema Zod no req.body/params (NOVO)
│   │   ├── rateLimit.js        # express-rate-limit em /auth e /quizzes (NOVO)
│   │   └── requestLogger.js    # log estruturado (NOVO — Pilar 5)
│   ├── routes/                 # (mantém estrutura atual, só move)
│   ├── controllers/            # (mantém, mas mais magros — só HTTP)
│   ├── services/               # NOVO — regra de negócio extraída
│   │   ├── arcadeService.js    # cálculo de XP, rank, medalhas (move de arcadeController.js:100-152)
│   │   ├── quizService.js      # fallback de busca aleatória, 50/50 (move de quizController.js:35-107)
│   │   └── progressService.js  # validação de ownership da sessão
│   ├── models/                 # (mantém — só queries SQL)
│   ├── schemas/                # NOVO — validação Zod por endpoint
│   │   ├── auth.schema.js
│   │   ├── quiz.schema.js
│   │   └── arcade.schema.js
│   ├── utils/
│   │   ├── upsert.js           # helper genérico para UPSERT (elimina duplicação)
│   │   └── jwt.js              # sign/verify wrappers
│   └── app.js                  # monta Express, registra middlewares e rotas
├── migrations/                 # NOVO — substitui tables.sql monolítico
│   ├── 001_initial_schema.sql
│   ├── 002_arcade_tables.sql
│   ├── 003_historico_resposta.sql
│   ├── 004_fix_feedback_typo.sql
│   └── 005_indexes.sql
├── seeds/                      # NOVO — dados de exemplo
│   ├── assuntos.sql
│   └── questoes_demo.sql
├── tests/                      # NOVO (mesmo que comece pequeno)
│   └── smoke/
│       └── routes.smoke.test.js
├── .env.example                # NOVO — sem segredos
├── .gitignore                  # NOVO — .env, node_modules
├── Dockerfile                  # NOVO (Pilar 5)
├── docker-compose.yml          # NOVO (Pilar 5)
└── server.js                   # apenas: require app, escuta porta
```

**Por que essas três camadas e não Clean Architecture completa:**

- **`services/`** resolve o problema imediato dos controllers gigantes (`arcadeController.js` tem 252 linhas misturando HTTP e lógica de XP/medalhas). Mover para `arcadeService.js` permite testar regras de jogo isoladamente e reusar em novos endpoints (ex.: campanha Fundamental também ganhar XP — ver Pilar 3).
- **`middlewares/`** centraliza preocupações transversais. Hoje cada controller repete try/catch e validação ad-hoc. Um `errorHandler` global + `validate(schema)` cortam dezenas de linhas e tornam o código uniforme.
- **`schemas/`** com Zod dá validação declarativa por rota sem trazer TypeScript. Exemplo:
  ```js
  // schemas/arcade.schema.js
  const { z } = require('zod');
  module.exports.saveRun = z.object({
    id_jogador: z.number().int().positive(),
    score: z.number().int().min(0).max(99999),
    total_correct: z.number().int().min(0),
    total_questions: z.number().int().min(1).max(50),
    // ...
  });
  ```

**O que NÃO fazer:**

- Não introduzir Clean Architecture/Hexagonal — overkill para 23 endpoints CRUD-ish.
- Não usar `class`-based controllers — Express resolve bem com funções.
- Não introduzir um DI container — `require` direto basta.

### 1.2 Frontend: ES Modules + bundler leve (Vite), mantendo Vanilla JS

Hoje `index.html` carrega 30 `<script>` tags na ordem certa, dependendo de `window.X` global. Isso é o principal bloqueio de manutenção. Solução **dentro da stack vanilla**:

```
jogo/
├── public/                     # servido estaticamente
│   ├── imagens/                # (move da raiz para cá)
│   ├── audio/
│   └── favicon.ico             # NOVO
├── src/
│   ├── main.js                 # entry point — substitui init.js
│   ├── config.js               # NOVO — API_BASE_URL via import.meta.env
│   ├── engine/                 # core do "motor" do jogo
│   │   ├── Overworld.js
│   │   ├── OverworldEvent.js
│   │   ├── OverworldEventRunner.js
│   │   ├── GameObject.js
│   │   ├── Person.js
│   │   ├── Sprite.js
│   │   ├── DirectionInput.js
│   │   ├── KeyPressListener.js
│   │   ├── SceneTransition.js
│   │   └── utils.js
│   ├── ui/                     # componentes de tela
│   │   ├── TextMessage.js
│   │   ├── RevealingText.js
│   │   ├── ChoiceMessage.js
│   │   ├── DecisionMessage.js
│   │   ├── KeyboardMenu.js
│   │   ├── PauseMenu.js
│   │   ├── PopupWindow.js
│   │   ├── TouchControls.js
│   │   ├── TitleScreen.js
│   │   ├── LoginForm.js
│   │   ├── ShowMap.js
│   │   ├── Toast.js            # NOVO — feedback de erro/sync (Pilar 2.4)
│   │   └── LoadingOverlay.js   # NOVO — spinner global (Pilar 2.4)
│   ├── game/                   # mecânicas e domínio do jogo
│   │   ├── QuizGame.js
│   │   ├── ArcadeHUD.js
│   │   ├── PlayerState.js
│   │   └── ArcadeMeta.js
│   ├── data/                   # NOVO — config de fases extraído (Pilar 4)
│   │   ├── maps/               # 1 arquivo por mapa, sem mais 1900 linhas
│   │   │   ├── Corredor.js
│   │   │   ├── Patio.js
│   │   │   ├── Sala1.js
│   │   │   └── ...
│   │   └── index.js            # agrega todos os mapas
│   ├── services/               # NOVO — wrapper de fetch (Pilar 2.2)
│   │   ├── apiClient.js        # fetch base com headers, timeout, retry
│   │   ├── authService.js
│   │   ├── quizService.js
│   │   ├── progressService.js
│   │   └── arcadeService.js
│   ├── state/                  # NOVO — store unificado
│   │   ├── Progress.js
│   │   ├── AudioManager.js
│   │   └── store.js            # consolidação dos window.X em namespace único
│   └── styles/                 # (já existe — mover para cá)
├── index.html                  # apenas <div id="app"></div> + 1 script type="module"
├── package.json                # NOVO — adiciona vite
├── vite.config.js              # NOVO
├── .env.development            # VITE_API_BASE_URL=http://localhost:3000
├── .env.production             # VITE_API_BASE_URL=https://api.jornada.exemplo.com
└── .gitignore
```

**Ganhos imediatos:**

- ES Modules eliminam o estado global `window.playerState`, `window.progress`, `window.OverworldMaps`. Cada arquivo declara `export` / `import`, ordem de carregamento deixa de importar.
- Vite serve em dev com HMR (recarrega só o arquivo editado) e em build produz **1 bundle minificado** com tree-shaking. Os 30 scripts viram 1 (ou poucos chunks).
- `import.meta.env.VITE_API_BASE_URL` resolve o problema das URLs hardcoded em 4 arquivos.

**O que NÃO fazer:**

- Não trazer React/Vue/Svelte (decisão do usuário). Continuar com manipulação manual de DOM + Canvas.
- Não trocar Canvas 2D próprio por Phaser/PixiJS. A engine atual funciona; refatorar é re-implementar.
- Não adicionar TypeScript. Se desejado depois, fazer com JSDoc + `// @ts-check` em arquivos específicos.

---

## Pilar 2 — Integração com a API

### 2.1 Autenticação real com JWT (CRÍTICO — bloqueia produção)

**Problema atual:** `authController.js:5-70` retorna `{ jogador, sessao }` em texto plano. O frontend guarda `id_sessao` em memória (`Progress.js:22`) e manda em corpo de POSTs. **Nenhum endpoint verifica nada.** Posso fazer `POST /api/historico/responder` com qualquer `id_sessao` e poluir progresso alheio.

**Solução:**

1. No `POST /api/auth/login` (e no `POST /api/jogadores`), gerar JWT:
   ```js
   const token = jwt.sign(
     { sub: jogador.id, sid: sessao.id },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );
   res.json({ jogador, sessao, token });
   ```
2. Novo middleware `src/middlewares/auth.js`:
   ```js
   module.exports = (req, res, next) => {
     const header = req.headers.authorization || '';
     const token = header.startsWith('Bearer ') ? header.slice(7) : null;
     if (!token) return res.status(401).json({ error: 'sem token' });
     try {
       req.user = jwt.verify(token, process.env.JWT_SECRET);
       next();
     } catch { return res.status(401).json({ error: 'token inválido' }); }
   };
   ```
3. Aplicar em **todas** as rotas exceto `/api/auth/login` e `POST /api/jogadores` (registro).
4. **Validação de ownership** em services: ao receber `id_sessao` ou `id_jogador` em rotas, comparar com `req.user.sub` / `req.user.sid`. Sem isso, JWT só protege contra anônimos — usuários logados ainda poderiam falsificar IDs.
5. Frontend: `apiClient.js` injeta `Authorization: Bearer ${token}` automaticamente; token vai em `localStorage` (`jm_auth_token`).

**Por que JWT e não session cookie:** API é stateless, frontend é estático (Vite build), simplifica deploy em qualquer hospedagem (Vercel/Netlify para front, Render/Railway para back). Trade-off conhecido: logout precisa lista de revogação ou expiração curta — usaremos expiração de 7 dias + refresh implícito no próximo login.

### 2.2 Cliente HTTP unificado no frontend

Criar `src/services/apiClient.js`:

```js
import { API_BASE_URL } from '../config.js';
import { showToast } from '../ui/Toast.js';

const TIMEOUT_MS = 8000;

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('jm_auth_token');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      },
      signal: ctrl.signal
    });
    if (res.status === 401) {
      localStorage.removeItem('jm_auth_token');
      showToast('Sessão expirada. Faça login novamente.', 'warn');
      throw new Error('unauthorized');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

Cada `service` (`authService`, `quizService`, etc.) só chama `apiFetch`. Benefícios: 1 ponto para timeout, retry, log, toast, refresh de token.

### 2.3 Estados de loading e UX de erro

- Componente `LoadingOverlay.js` global, exposto via `window.showLoading()` / `hideLoading()`, usado por `apiClient` em chamadas longas (saves, login).
- Componente `Toast.js` (canto inferior direito) com 3 níveis: `success` (verde), `warn` (amarelo, ex.: "Offline, salvo localmente"), `error` (vermelho). Substitui os `console.error` silenciosos identificados em `ArcadeMeta.js:258`, `Progress.js:72-79`, `QuizGame.js:57-58`.
- Quiz: se `/api/quizzes/random` falhar, mostrar botão "Tentar novamente" com retry exponencial (1s, 3s, 7s) em vez do texto vago atual.
- Save de progresso: indicador discreto "Sincronizando…" → "✓ Salvo" no canto da tela.

### 2.4 Validação com Zod (backend)

Hoje validação é manual e inconsistente. Para cada rota POST/PUT, declarar schema:

```js
// src/schemas/auth.schema.js
const loginSchema = z.object({
  email: z.string().email().max(120),
  senha: z.string().min(6).max(120)
});
// src/middlewares/validate.js
module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'payload inválido', issues: result.error.issues });
  req.body = result.data;
  next();
};
// src/routes/authRoutes.js
router.post('/login', validate(loginSchema), authController.login);
```

Cobrir todos os endpoints com schema. Substitui os `if (!email || !senha)` espalhados.

### 2.5 Configuração e segredos

- Criar `.env.example` (sem valores reais), `.gitignore` cobrindo `.env`.
- Trocar a senha do MySQL atualmente exposta em `.env:3` — assumir que está comprometida; girar credencial antes de qualquer push público.
- `src/config/env.js` valida na inicialização que todas as variáveis exigidas existem; falha cedo com mensagem clara.
- Variáveis necessárias: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`, `JWT_SECRET`, `CORS_ORIGINS` (whitelist separada por vírgula), `NODE_ENV`.

### 2.6 CORS e rate limit

- `app.use(cors({ origin: process.env.CORS_ORIGINS.split(','), credentials: false }))`. Não mais `cors()` aberto.
- `express-rate-limit` em `/api/auth/login` (5 tentativas/min/IP), `/api/jogadores` (3 registros/h/IP) e `/api/quizzes/random` (60/min/IP).
- `helmet()` aplicado globalmente.

### 2.7 Tipagem leve sem TypeScript

Como decidido manter Vanilla JS, usar **JSDoc** nos services e schemas. VSCode já dá autocomplete e checagem com `// @ts-check` topo do arquivo. Sem custo de migração.

---

## Pilar 3 — Proposta do Jogo (Game Design)

### 3.1 Unificar economia entre Fundamental e Arcade

Hoje há **duas economias paralelas**: modo Fundamental ajusta `PlayerState.skills` (localStorage) sem persistir XP/score; modo Arcade ganha XP e ranking. Resultado: jogador que joga Fundamental não vê progresso visível além da dificuldade subindo silenciosamente, e perde tudo ao trocar de dispositivo.

**Proposta:**

- **XP unificado**: cada quiz respondido (em qualquer modo) gera XP proporcional a `(dificuldade × acerto) + bônus_tempo`. Modo Arcade mantém XP em lote no fim da run; modo Fundamental dispara XP por quiz individual via um novo endpoint `POST /api/xp/award` (ou estender `/api/arcade/runs` com `mode: 'narrative'`).
- **Sincronizar `PlayerState.skills` com o backend**: estender o JSON `ponto_de_salvamento` em `progresso_jogo` para incluir `skills` por assunto. Frontend salva em `Progress.save()` junto com mapa/posição. Resolve o problema "trocou de navegador e perdeu a curva de adaptação".
- **Rank único** mostrado tanto no menu Fundamental quanto no Arcade.

### 3.2 Onboarding (hoje inexistente)

O jogador entra direto no `Corredor` sem saber o que fazer. Adicionar:

- **Tutorial guiado nos primeiros 60 segundos**: ao detectar `storyFlags.onboarding_done !== true`, disparar uma cutscene curta que (1) ensina movimento (setas/WASD ou D-pad em mobile), (2) mostra interação com NPC, (3) resolve um quiz de exemplo com dica visível, (4) explica o sistema de dificuldade adaptativa em uma frase.
- **Tooltips contextuais** nas primeiras 3 aparições de cada elemento novo (HUD do Arcade, buff 50/50, etc.). Usar `PopupWindow.js` já existente.
- **Skip tutorial** disponível, mas off por padrão.

### 3.3 Feedback de acerto/erro mais rico

Hoje `QuizGame.js:229-235` mostra mensagem aleatória + cor. Áudio existe em `audio/sfx/` mas é raramente acionado.

**Adicionar (todos low-effort com a engine atual):**

- **Som**: integrar `AudioManager.js` em `QuizGame` — disparar `acerto.mp3` em verde, `erro.mp3` em vermelho, sempre. Hoje há apenas comentários `if (window.audioManager) …` nos lugares certos mas a chamada não ocorre consistentemente.
- **Animação visual**: shake da pergunta em erro (já existe `shakeMago` no `ArcadeHUD.css` — reusar a animação CSS), pulse verde no acerto.
- **Partículas**: confetti CSS (`@keyframes`) ou pequenos sprites flutuando em acertos consecutivos (≥3 streak).
- **Explicação obrigatória após erro**: hoje feedback é mostrado, mas o jogador pode pular rápido. Adicionar delay mínimo de 2s antes do botão "Continuar" ficar ativo, garantindo que a explicação seja lida.

### 3.4 Sistema de recompensa visível continuamente

Sem recompensa visível, retenção cai. Adicionar HUD persistente fora do Arcade também:

- Barra de XP no canto superior do overworld (slim, não invasiva), mostra nível atual + progresso para próximo.
- Notificação `+15 XP` flutuante a cada quiz correto (já existe padrão em `ArcadeHUD.js` — generalizar).
- **Conquistas/medalhas expandidas**: hoje há 3 (sem_falhas, velocista, tempestade) só no Arcade. Adicionar conquistas narrativas que cruzam os modos:
  - "Aritmético" — 50 acertos em decimais
  - "Geômetra" — 30 acertos em geometria
  - "Maratonista" — 5 dias seguidos jogando
  - "Mestre da Sala 1" — completou todas as cutscenes da Sala1
  - Persistir em `jogador_conquista` (nova tabela `id_jogador`, `id_conquista`, `desbloqueada_em`).

### 3.5 Áudio diegético

- BGM diferente por mapa (já há `battle.mp3` e `arcade.mp3` — não suficiente). Sugerido: 1 BGM calmo para corredores/biblioteca, 1 para sala de aula (quiz ativo), o `arcade.mp3` continua para boss.
- Volume controlável já existe no PauseMenu — manter.
- **Mute automático ao perder foco da aba** (`document.visibilitychange`).

### 3.6 Acessibilidade básica (não-negociável em web pública)

- `lang="pt-BR"` em `index.html` (hoje está `lang="en"`).
- `alt` descritivo em todas as imagens (parcialmente feito).
- Modo "alto contraste" no PauseMenu (alternar variáveis CSS em `global.css`).
- Atalho de teclado para repetir leitura do enunciado (Tecla `R`) — ajuda dislexia/cognição.
- Suporte a touch já existe — testar em iPad/Android real.

---

## Pilar 4 — Estruturação de Fases (Level Design)

### 4.1 Diagnóstico

Hoje fases são **três coisas misturadas**:

1. **Mapa visual** (sprite, walls, NPCs) — hardcoded em `OverworldMap.js` (1900+ linhas, 15+ mapas).
2. **Cutscene/diálogo** — hardcoded no mesmo arquivo, dentro de `cutsceneSpaces`.
3. **Banco de questões** — vem do DB filtrado por `id_assunto`, `dificuldade`, `campanha`.

**Não há entidade "fase".** A "progressão" é apenas `storyFlags` espalhadas. Para criar uma nova fase, hoje é preciso: editar JS, criar sprite PNG, adicionar entries no DB, redeploy.

### 4.2 Proposta: separar **metadata de fase** (DB) de **cena visual** (código)

Como a stack é conservadora (sem CMS, sem editor visual) e a prioridade "level design escalável" **não foi escolhida** como foco principal, a proposta é o mínimo viável que destrava conteúdo sem virar admin panel completo:

**Nova tabela `fase`:**

```sql
CREATE TABLE fase (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(40) NOT NULL UNIQUE,     -- ex: 'sala1_decimais'
  nome            VARCHAR(100) NOT NULL,            -- 'Sala 1 — Decimais'
  campanha        ENUM('fundamental','medio') NOT NULL,
  id_assunto      INT NOT NULL,
  ordem           INT NOT NULL DEFAULT 0,           -- ordem dentro da campanha
  pre_requisito_codigo VARCHAR(40) NULL,            -- desbloqueia após outra fase
  meta_questoes   INT NOT NULL DEFAULT 5,           -- quantas perguntas pra concluir
  meta_acertos    INT NOT NULL DEFAULT 3,           -- quantos acertos pra dar como concluída
  recompensa_xp   INT NOT NULL DEFAULT 50,
  recompensa_medalha VARCHAR(40) NULL,
  map_id          VARCHAR(40) NOT NULL,             -- referência ao mapa visual em OverworldMaps
  descricao       TEXT NULL,                        -- mostrado no menu de fases
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (id_assunto) REFERENCES assunto(id)
);

CREATE TABLE fase_progresso (
  id_jogador      INT NOT NULL,
  id_fase         INT NOT NULL,
  status          ENUM('bloqueada','disponivel','em_progresso','concluida') NOT NULL DEFAULT 'disponivel',
  melhor_score    INT NOT NULL DEFAULT 0,
  acertos         INT NOT NULL DEFAULT 0,
  tentativas      INT NOT NULL DEFAULT 0,
  estrelas        TINYINT NOT NULL DEFAULT 0,       -- 0-3
  primeira_conclusao_em DATETIME NULL,
  PRIMARY KEY (id_jogador, id_fase),
  FOREIGN KEY (id_jogador) REFERENCES jogador(id),
  FOREIGN KEY (id_fase) REFERENCES fase(id)
);

CREATE INDEX idx_fase_campanha_ordem ON fase(campanha, ordem);
CREATE INDEX idx_fase_progresso_jogador ON fase_progresso(id_jogador, status);
```

**Novos endpoints:**

- `GET /api/fases?campanha=fundamental` — lista fases ativas + status do jogador (join com `fase_progresso`).
- `POST /api/fases/:codigo/iniciar` — marca `em_progresso`, retorna primeira pergunta.
- `POST /api/fases/:codigo/concluir` — recebe resultado final, calcula estrelas, atualiza progresso, devolve XP/medalha.

**O mapa visual continua hardcoded em código** (sprites/walls são código mesmo) — mas agora cada mapa é um arquivo separado em `src/data/maps/` (Pilar 1.2), e o link mapa↔fase vive no DB. Adicionar uma "fase de Equações" passa a ser:

1. Inserir uma linha em `fase` (pode ser via SQL ou interface admin simples).
2. Reaproveitar um mapa existente (`map_id` aponta para `Sala1`, por exemplo).
3. Cadastrar 10 questões em `quiz` com `id_assunto` correspondente.

**Sem precisar redeploy.** Só dispara redeploy se quiser **um mapa visual novo**.

### 4.3 Lógica de progressão

- Ao logar, frontend chama `GET /api/fases?campanha=X`, recebe lista ordenada com `status`.
- Tela de seleção de fase substitui (ou complementa) a exploração livre do overworld para o modo Fundamental. Exibição em grid com imagens de `imagens/mapas/desafios/` (que hoje existem mas não são usadas — desperdício de assets).
- Critério de desbloqueio: `pre_requisito_codigo` da fase está com `status='concluida'`.
- Estrelas: 1★ por conclusão, 2★ por ≥80% acertos, 3★ por 100% sem usar buff.

### 4.4 Salvamento de progresso revisado

O atual `progresso_jogo` com `ponto_de_salvamento` JSON continua útil para **posição no overworld**, mas a **conclusão de fases** passa a viver em `fase_progresso` (relacional, queryable). Os dois coexistem; nada é jogado fora.

### 4.5 Migrations e seed inicial

- `migrations/006_fases.sql` cria as tabelas acima.
- `seeds/fases_iniciais.sql` popula com as fases que hoje existem implicitamente (Decimais=Sala1, Naturais=Sala2, Aproximação=Pátio, etc.) preservando o conteúdo atual.

---

## Pilar 5 — Oportunidades de Ouro

### 5.1 Migrations versionadas (resolve schema desalinhado — emergência)

Hoje `tables.sql` não cria as tabelas `alternativa`, `arcade_run`, `arcade_meta`, `historico_resposta`. **Um clone fresh não roda.** Adotar migrations sequenciais executadas em ordem:

```
migrations/
  001_initial_schema.sql       (jogador, assunto, quiz, alternativa, feedback, sessao, configuracoes, progresso_jogo)
  002_arcade.sql               (arcade_run, arcade_meta)
  003_historico_resposta.sql
  004_fix_feedback_typo.sql    (RENAME COLUMN explicacacao TO explicacao)
  005_drop_obsolete.sql        (drop desempenho_jogo, FKs órfãs em sessao)
  006_fases.sql                (Pilar 4)
  007_indexes.sql              (id_assunto+dificuldade, id_jogador em arcade_run e historico_resposta, email em jogador)
  008_conquistas.sql           (Pilar 3.4)
```

Executor simples: script `npm run migrate` que lê os arquivos em ordem e roda os que ainda não estão na tabela `_migrations`. Não precisa de Knex/Sequelize.

### 5.2 Performance — Backend

- **Índices**: `quiz(id_assunto, dificuldade, campanha)` cobre `quizModel`; `historico_resposta(id_sessao)` e `arcade_run(id_jogador)` cobrem leituras frequentes.
- **Paginação**: `/api/jogadores`, `/api/quizzes` hoje retornam tudo. Adicionar `?limit=&offset=` com default 50 e máximo 200.
- **Connection pool**: já existe em `db.js`. Ajustar `connectionLimit` para 20 em prod.
- **Cache HTTP de assuntos**: `Cache-Control: public, max-age=3600` em `GET /api/assuntos` e `GET /api/fases` (mudam raramente).

### 5.3 Performance — Frontend

- **Build com Vite** já corta os 30 scripts para 1 bundle (~70-80% redução de requests).
- **Code-splitting por rota**: separar bundle do título/menu do bundle do overworld (carrega quando o jogador clica "Jogar").
- **Imagens**: 64 PNGs sem otimização. Rodar `imagemin` ou converter para WebP com fallback PNG. Sprites de personagens são pequenos (não precisam mudar); mapas grandes (`corredor.png`, etc.) podem ganhar 60-80% de tamanho.
- **Preload do próximo asset**: ao entrar em um mapa, pré-carregar a imagem do próximo provável mapa baseado em `pre_requisito` invertido.
- **Fontes Google**: já usam `display=swap`. Adicionar `<link rel="preload" as="font">` para a fonte primária (VT323) — evita FOUT.
- **Service Worker** (opcional): cachear shell + últimas 20 perguntas para modo offline. Útil em web escolar com WiFi instável.

### 5.4 Observabilidade

- **Logs estruturados** com `pino` (lightweight, mantém stack conservadora — não exige migração de framework). `requestLogger.js` middleware loga `method`, `path`, `status`, `duration`, `userId` em JSON.
- **Sentry** (free tier) em backend e frontend. Captura `unhandledRejection` no front e exceptions no back. Sem ele, em web pública, bugs são invisíveis.
- **Analytics simples**: Plausible/Umami (privacy-friendly, sem GDPR drama). Eventos: `quiz_answered`, `level_completed`, `arcade_run_finished`. Permite ver onde jogadores abandonam.

### 5.5 Deploy — recomendação enxuta

Mantendo a stack:

- **Backend**: Render.com ou Railway (Free/Hobby tier, deploy via Git push). Banco MySQL gerenciado em PlanetScale ou Railway. Custo previsto: US$ 0–10/mês até dezenas de usuários simultâneos. **Não usar Heroku** (free tier acabou). **Não usar VPS sem orquestração** se time é pequeno — render/railway absorvem manutenção.
- **Frontend**: Vercel ou Netlify (free tier generoso para SPA estática). Build do Vite gera `/dist` que é servido por CDN globalmente.
- **Dominío + HTTPS**: Cloudflare na frente — grátis, TLS automático, proteção básica contra DDoS.

`Dockerfile` + `docker-compose.yml` para dev local consistente, mas em prod o PaaS escolhido faz o build próprio.

### 5.6 CI/CD mínimo (GitHub Actions)

```
.github/workflows/
  backend-ci.yml    # lint + smoke tests em PR
  frontend-ci.yml   # vite build em PR
  deploy.yml        # deploy automático em push na main (opcional)
```

Smoke tests podem ser 5–10 chamadas HTTP cobrindo o caminho crítico: registro → login → quiz random → responde → ver progresso. Roda em <30s.

### 5.7 Documentação operacional

- `README.md` atualizado com: setup local (`.env.example`, migrations, npm scripts), arquitetura em 1 diagrama, link para `docs/`.
- `docs/architecture.md` — descreve camadas, fluxo de auth, schema.
- `docs/CONTRIBUTING.md` — como adicionar uma nova fase, nova questão, novo mapa.
- `docs/runbook.md` — passos para deploy e rollback.
- API documentation: gerar OpenAPI 3.0 manualmente em `docs/openapi.yaml` (não precisa de Swagger UI integrado — pode hospedar estática). 23 endpoints, viável de manter à mão.

### 5.8 LGPD/privacidade

Web pública com dados de menores (potencial). Mínimo:

- Política de privacidade visível antes do registro.
- Termo de consentimento dos pais para menores de 13 anos.
- Endpoint `DELETE /api/jogadores/me` (jogador apaga a própria conta — direito de exclusão).
- Não coletar dados pessoais além do necessário (hoje só nome+email+senha — ok).

### 5.9 Migração do conteúdo do banco local para a nuvem (pós-Ondas)

As migrations levam **apenas o schema** (DDL), nunca dados. O conteúdo já cadastrado no MySQL local (assuntos, questões, alternativas, feedbacks — cerca de 60+ questões hoje) precisa ser portado separadamente para o banco da nuvem. **Esta etapa fica para o fim, depois de todas as ondas anteriores estarem prontas**, porque:

- O schema final só estabiliza após a Onda 5 (adiciona `fase`, `fase_progresso`, conquistas).
- Sem isso pronto, qualquer export precisaria ser refeito a cada mudança de tabela.

**Plano para essa etapa (executar antes da Onda 6 / deploy):**

1. **Pasta `seeds/`** versionada no repo do backend, contendo:
   - `seeds/01_assuntos.sql`
   - `seeds/02_quiz_e_alternativas.sql`
   - `seeds/03_feedback.sql`
   - `seeds/04_fases_iniciais.sql` (vem da Onda 5)
2. **Script `scripts/export-seeds.js`** que conecta ao MySQL local e gera os arquivos acima a partir das tabelas `assunto`, `quiz`, `alternativa`, `feedback`. Roda só em dev, na máquina do dono do conteúdo.
3. **Script `scripts/seed.js`** que aplica os arquivos `seeds/*.sql` em qualquer banco (idempotente — usa `INSERT IGNORE` ou `ON DUPLICATE KEY UPDATE` por `id` ou `codigo`).
4. **Comando `npm run seed`** no `package.json`.
5. **Deploy na nuvem** vira: `npm install && npm run migrate && npm run seed && npm start`.

**Dados de runtime ficam de fora**: `jogador`, `sessao`, `progresso_jogo`, `historico_resposta`, `arcade_run`, `arcade_meta`, `configuracoes` — todos começam vazios na nuvem. Apenas conteúdo curado pelo professor/designer entra nos seeds.

---

## Ondas de Execução (Roadmap Sugerido)

Mantendo escopo conservador, sugiro 6 ondas. Cada onda é entregável e o jogo continua funcionando ao fim de cada uma.

| Onda | Foco | Duração estimada | Entregáveis-chave |
|---|---|---|---|
| **1** | Emergência: schema + segredos | 2-3 dias | Migrations consolidadas; `.env.example`; `.gitignore`; senha do DB rotacionada; CORS whitelist; helmet; rate limit em `/auth` |
| **2** | Auth real | 3-5 dias | JWT + middleware `auth`; ownership check em rotas que recebem `id_sessao`/`id_jogador`; `apiClient.js` no front injetando token; tela de logout |
| **3** | Refatoração estrutural | 1-2 semanas | Backend `src/` com middlewares/services/schemas/Zod; Frontend migrado para Vite + ES Modules; `API_BASE_URL` via env |
| **4** | UX e feedback | 1 semana | Toast + LoadingOverlay; integração de áudio em QuizGame; tela de fases (Pilar 4); barra de XP persistente; onboarding inicial |
| **5** | Game Design unificado | 1-2 semanas | Tabela `fase` + endpoints; conquistas; XP unificado entre Fundamental e Arcade; sincronização de `PlayerState.skills` no backend |
| **6** | Produção | 1 semana | Deploy Render+Vercel+Cloudflare; CI básico (GitHub Actions); Sentry; analytics; README operacional |

---

## Verificação (como testar end-to-end)

**Critérios para considerar "production-ready":**

- [ ] Nenhuma credencial em repositório (.env fora do git, senha rotacionada).
- [ ] Todas as rotas (exceto registro/login) exigem JWT.
- [ ] Migrations executam em DB vazio sem erro.
- [ ] Frontend faz build de produção e roda em CDN com URL de API parametrizada.
- [ ] Toast/Loading visíveis em pelo menos 5 fluxos (login, quiz fetch, save progresso, save arcade run, ranking).
- [ ] Tela de seleção de fases puxa de `/api/fases` e respeita desbloqueio.
- [ ] Áudio toca em acerto/erro; tutorial é disparado no primeiro login.
- [ ] Sentry recebe pelo menos 1 evento de teste de cada ambiente.
- [ ] README explica setup completo em <10 minutos para um dev novo.
