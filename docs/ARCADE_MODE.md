# Modo Arcade — Documentação Técnica

Documento descreve como o Modo Arcade funciona atualmente no jogo Jornada Matemágica. Referência para manutenção e evolução.

---

## 1. Entrada no Modo

- **Local**: mapa `Corredor_M` (ensino médio).
- **Gatilho**: interação com o NPC **Arquimago** (`mago1`), que dispara o evento `arcadeBattle` → [`arcadeStart()`](../OverworldEvent.js) em `OverworldEvent.js:157`.
- **Escolha de duração**: popup pergunta quantas questões (**5, 10, 15, 20 ou 25**).
- **Assunto**: fixo em `id_assunto = 2` (`OverworldMap.js:1879`). Sem seleção de tema pelo jogador.

## 2. Estrutura da Run

Objeto `window.arcadeRun` criado em `OverworldEvent.js:172-187`:

| Campo | Função |
|---|---|
| `lives / maxLives` | vidas atuais e teto (inicia 3/3, teto 5) |
| `score` | pontuação acumulada |
| `streak / maxStreak` | acertos consecutivos / recorde da run |
| `totalCorrect / totalWrong` | contadores |
| `questionsAnswered / totalQuestions` | progresso |
| `freeAnswers` | buff de respostas grátis |
| `startTime` | timestamp (tick de cronômetro a cada 1s) |
| `ended` | flag de término |

## 3. Loop de Gameplay

Função `runNext()` em `OverworldEvent.js:259`:

1. Verifica fim — todas respondidas = **vitória**; `lives <= 0` = **derrota**.
2. Spawna `QuizGame` com assunto 2 e dificuldade do `PlayerState`.
3. **Acerto** → dano = `(dificuldade + bônus de tempo) × multiplicador de streak`; anima `floatDamage()` + `shakeMago()`.
4. **Erro** → zera streak; consome `freeAnswers` se houver, senão perde 1 vida; anima `shakeScreen()`.
5. **A cada 5 acertos** → [`_grantStreakReward()`](../OverworldEvent.js) em `OverworldEvent.js:239`: restaura 1 vida → `maxLives` +1 (teto 5) → +1 resposta grátis.

## 4. HUD em Tempo Real — `ArcadeHUD.js`

Overlay DOM fixo no topo-esquerdo:

- **Vidas**: ❤ preenchidas / ♡ vazias (`ArcadeHUD.js:51-56`).
- **Streak · Multiplicador**: 🔥 N · ×M (`ArcadeHUD.js:59-60`).
- **Score** em amarelo (`ArcadeHUD.js:61`).
- **Buffs ativos**: 🎟️ contador de respostas grátis (`ArcadeHUD.js:66`).
- **HP do Mago** (topo-centro): barra vermelha com `X / Total` (`ArcadeHUD.js:25-31`).

Animações (`styles/ArcadeHUD.css`):

| Animação | Método | Duração |
|---|---|---|
| Dano flutuante ("-N" sobe) | `floatDamage()` — `ArcadeHUD.js:96-106` | 900 ms |
| Shake do bloco do mago | `shakeMago()` — `ArcadeHUD.js:108-114` | 350 ms |
| Screenshake em erro | `shakeScreen()` — `ArcadeHUD.js:125-132` | 400 ms |
| Toast de recompensa | `showRewardToast()` — `ArcadeHUD.js:116-123` | 1800 ms |

## 5. Sistema de Buffs

Pool em `ArcadeMeta.js:27-33`; sorteio de 3 distintos via `rollBuffs()` em `ArcadeMeta.js:179-188`:

- ❤ **Vida Extra** — +1 vida (respeita teto 5).
- 🛡️ **Escudo** — próximo erro não consome vida.
- ✂️ **50/50** — próxima questão começa com 2 alternativas eliminadas.
- ⏸️ **Foco Total** — bônus de tempo nas próximas 3 questões.
- ⚔️ **Fúria** — próximo acerto causa dano dobrado.

Disparo: milestones de streak e após derrota. O "altar entre duelos" é marcado como compat em `OverworldEvent.js:477`.

## 6. Fim da Run

`arcadeCheckEnd()` (`OverworldEvent.js:366`) valida término; `_showRunEnd()` (`OverworldEvent.js:378`):

- Calcula **tempo total**, **% de acertos**, **tempo médio/questão**, **magos derrotados**.
- **XP ganho** = `score × (questionsPerMage / 5)`; reduzido a **30%** se derrota (`ArcadeMeta.js:101-102`).
- Registra via `arcadeMeta.recordRun(runResult)` (`OverworldEvent.js:406`).
- Popup com stats + barra de progresso de XP (`OverworldEvent.js:435`); opções **Jogar novamente** ou **Voltar ao menu**.

## 7. Progressão Meta — `ArcadeMeta.js`

### Ranks (13 níveis — `ArcadeMeta.js:10-24`)

| Faixa | XP necessário |
|---|---|
| Aprendiz I / II / III | 0 / 400 / 1000 |
| Iniciado I / II / III | 1800 / 2800 / 4000 |
| Adepto I / II / III | 5500 / 7500 / 10000 |
| Mestre I / II / III | 13000 / 16500 / 20500 |
| **Arquimago** | 25000+ |

### Medalhas (`ArcadeMeta.js:59`, lógica em `113-125`)

- 🏆 **semFalhas** — vitória sem perder nenhuma vida.
- ⚡ **velocista** — vitória com tempo médio < 10s/questão.
- 🌩 **tempestade** — `maxStreak >= 10` na run.

## 8. Ranking Mágico na TitleScreen

Menu em `TitleScreen.js:97-146`. Exibe:

- **Rank atual** com barra de XP e próximo rank.
- **Stats globais**: total de runs, vitórias, melhor score, streak máximo, medalhas.
- **Top 10 runs** com colunas: `#`, `R` (✓/✗), Score, Acertos/Total, Magos derrotados, Streak, Tempo.

Leitura direta do `localStorage` em `TitleScreen.js:148-151`.

## 9. Persistência

**100% `localStorage` — nada vai para o backend hoje.**

- `JornadaMatemagica_ArcadeMeta`
  - `xp`, `totalRuns`, `victories`, `defeats`, `bestScore`, `maxStreak`, `perfectRuns`, `magosDerrotadosTotal`, `medals`.
- `JornadaMatemagica_ArcadeHistory`
  - Array com as últimas **100 runs** (FIFO).
  - Cada run: `date`, `victory`, `score`, `correct/total`, `%`, `time`, `elapsedMs`, `magosDefeated`, `lives/maxLives`, `maxStreak`, `questionsPerMage`, `xpGained`, `medals[]`.

Carregamento em `ArcadeMeta._load()` (`ArcadeMeta.js:38-47`) com cache em memória.

## 10. Pontos de Atenção / Débito Técnico

- ⚠️ **XP, ranks e medalhas são calculados no cliente** e gravados em `localStorage`. Qualquer usuário pode editar via DevTools e inflar stats. Migração para o backend (`POST /arcade/run` validado no servidor) é a mitigação recomendada.
- ⚠️ **Histórico crescente sem poda extra** além do cap de 100 runs — aceitável, mas considerar compressão se o schema crescer.
- ⚠️ **Assunto fixo (ID 2)** — limita variedade da run. Considerar parametrização ou rotação de assuntos.
- ⚠️ **Lógica arcade concentrada em `OverworldEvent.js` (linhas 157-477)** — bom candidato a extrair para `ArcadeRun.js` e deixar o `OverworldEvent` apenas orquestrando.

## 11. Arquivos Relacionados

- [OverworldEvent.js](../OverworldEvent.js) — controller da run.
- [ArcadeHUD.js](../ArcadeHUD.js) — overlay DOM + animações.
- [ArcadeMeta.js](../ArcadeMeta.js) — persistência, ranks, medalhas.
- [styles/ArcadeHUD.css](../styles/ArcadeHUD.css) — estilos retro arcade.
- [TitleScreen.js](../TitleScreen.js) — tela de Ranking Mágico.
- [OverworldMap.js](../OverworldMap.js) — definição do `Corredor_M` e NPC Arquimago.
- [QuizGame.js](../QuizGame.js) — motor de perguntas consumido pela run.
