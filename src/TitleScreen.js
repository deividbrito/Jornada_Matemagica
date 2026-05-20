class TitleScreen {
  constructor({ progress }) {
    this.progress = progress;
    this.element = null;
  }

  async showLogin(container) {
    if (!this.progress.hasRemoteSession()) {
      await new Promise((resolveLogin) => {
        new window.LoginForm({
          onComplete: (dadosSessao) => {
            this.progress.setSessao(dadosSessao);
            resolveLogin();
          }
        }).init(container);
      });
    }
  }

  /**
   * NOVO: Exibe o menu de escolha de campanha e retorna a campanha selecionada.
   * @param {HTMLElement} container
   * @returns {Promise<"fundamental"|"medio">}
   */
  async chooseCampanha(container) {
    return new Promise((resolve) => {
      const screen = document.createElement("div");
      screen.classList.add("TitleScreen");
      screen.innerHTML = `
        <img class="TitleScreen_logo" src="imagens/mapas/menu/artemenu.png" alt="Jornada Matemágica" />
      `;
      // UX-D: monta em document.body (resolução nativa). Se montasse no
      // .game-container (escalado 3.5x), `position: fixed` herdaria o
      // contexto transformado e a tela ficaria gigante.
      document.body.appendChild(screen);

      const menu = new window.KeyboardMenu();
      menu.init(screen);

      let escListener = null;
      const cleanup = () => {
        menu.end();
        screen.remove();
        if (escListener) escListener.unbind();
      };

      escListener = new window.KeyPressListener("Escape", () => {
        cleanup();
        resolve(null);
      });

      menu.setOptions([
        {
          label: "Ensino Fundamental",
          description: "Questões do 6º ao 9º ano",
          handler: () => { cleanup(); resolve("fundamental"); }
        },
        {
          label: "Modo ENEM",
          description: "Desafios no estilo ENEM — modo arcade!",
          handler: () => { cleanup(); resolve("medio"); }
        },
        {
          label: "Voltar",
          description: "Voltar ao menu principal (ou pressione Esc)",
          handler: () => { cleanup(); resolve(null); }
        }
      ]);
    });
  }

  async getOptions(resolve, container) {
    const safeFile = this.progress.getSaveFile();
    const hasRemoteSave = await this.progress.hasRemoteSaveData();

    return [
      {
        label: "Novo jogo",
        description: "Comece uma nova aventura!",
        handler: async () => {
          this.hide();
          const campanha = await this.chooseCampanha(container);
          if (campanha === null) {
            this.show();
            return;
          }
          this.close();
          this.progress.campanha = campanha;
          resolve({ action: "new" });
        }
      },
      (safeFile || hasRemoteSave) && {
        label: "Continuar jogo",
        description: "Continue sua aventura!",
        handler: async () => {
          this.close();
          if (hasRemoteSave) {
            await this.progress.load();
          }
          resolve({ action: "continue" });
        }
      },
      this.hasArcadeHistory() && {
        label: "Boletim",
        description: "Veja seu rank, XP e melhores provas da Gincana Acadêmica",
        handler: () => {
          this.keyboardMenu.pause();
          this.showArcadeRanking(container, () => this.keyboardMenu.resume());
        }
      },
      // Seleção de fases — atalho que coexiste com o modo história.
      // Modo história: Alice anda pelas salas, encontra cada mago e dispara
      // a fase pelo diálogo (com cutscenes de provocação/redenção).
      // Selecionar Fase: teleporta direto pra arena. Útil pra replay/treino
      // sem precisar re-assistir as cutscenes.
      this.progress.hasRemoteSession() && {
        label: "Selecionar Fase",
        description: "Acesso direto às arenas — replay/treino",
        handler: () => {
          this.keyboardMenu.pause();
          this.hide();
          new window.FaseSelector({
            onSelect: async (fase) => {
              // FaseSelector vive em document.body (fora do canvas) — então o
              // popup de dificuldade também vai pro body pra ficar sobre tudo.
              const dificuldadeManual = await window.PopupWindow.askDifficulty({
                title: `Replay: ${fase.nome}`,
                text: "Como você quer enfrentar este desafio?<br><span style='opacity:0.75;font-size:0.85em;'>(Automática se ajusta ao seu desempenho.)</span>",
                container: document.body,
              });
              this.close();
              this.progress.campanha = fase.campanha;
              this.progress.startFase(fase, { viaSelector: true, dificuldadeManual });
              // Overworld.init decide o que fazer com isso — teleporta direto
              // pra fase.mapId (arena), sem passar pelo Corredor.
              resolve({ action: "fase", fase });
            },
            onCancel: () => {
              this.show();
              this.keyboardMenu.resume();
            },
          }).init();
        }
      },
      {
        label: "Ranking Global",
        description: "Veja os melhores jogadores da Gincana Acadêmica",
        handler: () => {
          this.keyboardMenu.pause();
          this.showGlobalRanking(container, () => this.keyboardMenu.resume());
        }
      },
      // "Sair" só aparece quando há sessão autenticada. Para convidado, o menu
      // já não persiste nada e não precisa de logout.
      this.progress.hasRemoteSession() && {
        label: "Sair",
        description: "Encerra a sessão e volta para a tela de login",
        handler: () => {
          this.progress.logout();
          // Recarregar a página é a forma mais simples de voltar à tela de login
          // sem reconstruir todo o estado do jogo manualmente.
          window.location.reload();
        }
      }
    ].filter(Boolean);
  }

  async showArcadeRanking(container, onClose) {
    const [meta, top] = await Promise.all([
      window.arcadeMeta.getMeta(),
      window.arcadeMeta.getLeaderboard(10),
    ]);
    const rank = meta.rank || window.arcadeMeta.getRankInfo(meta.xp || 0);

    const rows = top.map((s, i) => {
      const result = s.victory ? "✓" : "✗";
      const ms = s.elapsedMs || 0;
      const mm = Math.floor(ms / 60000);
      const ss = Math.floor((ms % 60000) / 1000);
      const timeStr = ms > 0 ? `${mm}m${ss.toString().padStart(2, "0")}s` : "--";
      return `<tr>
        <td>${i + 1}</td>
        <td>${result}</td>
        <td>${s.score}</td>
        <td>${s.correct}/${s.total}</td>
        <td>${s.questionsPerMage || "-"}</td>
        <td>${s.maxStreak}</td>
        <td>${timeStr}</td>
      </tr>`;
    }).join("");

    const xpPct = Math.round(rank.progress * 100);
    const nextLine = rank.isMax
      ? `<i>Rank máximo!</i>`
      : `Próximo: <b>${rank.nextName}</b> (${rank.xp - rank.currentXp}/${rank.nextXp - rank.currentXp} XP)`;

    const html = `
      <div style="text-align:center; margin-bottom:14px;">
        <div style="font-size:24px; color:#ffeb3b; margin-bottom:8px;"><b>${rank.name}</b></div>
        <div class="ArcadeRunEnd_xpBar" style="margin:6px auto; height:10px;"><div class="ArcadeRunEnd_xpFill" style="width:${xpPct}%"></div></div>
        <div style="font-size:14px; color:#cce0ff;">${nextLine}</div>
      </div>
      <div style="font-size:16px; margin:8px 0; text-align:center;">
        Provas: <b>${meta.totalRuns}</b> · Aprovações: <b>${meta.victories}</b> · Melhor: <b>${meta.bestScore}</b> · Streak máx: <b>${meta.maxStreak}</b>
      </div>
      <div style="font-size:16px; margin:8px 0; text-align:center;">
        🏆 ${meta.medals.semFalhas} · ⚡ ${meta.medals.velocista} · 📚 ${meta.medals.tempestade}
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:15px; text-align:center; margin-top:12px;">
        <tr style="border-bottom:2px solid var(--menu-border-color); color:#ffeb3b;">
          <th style="padding:4px;">#</th><th>R</th><th>Pts</th><th>Acer</th><th>Etapas</th><th>Streak</th><th>Tempo</th>
        </tr>
        ${rows || `<tr><td colspan="7" style="padding:12px;">Sem provas ainda.</td></tr>`}
      </table>
    `;

    const popup = new window.PopupWindow({
      title: "Boletim",
      text: html,
      size: "large",
      onComplete: () => { if (onClose) onClose(); },
    });
    // Mounta no body (regra UX-D): TitleScreen e seus popups vivem em escala nativa.
    popup.init(document.body);
  }

  hasArcadeHistory() {
    if (window.progress && window.progress.hasRemoteSession()) return true;
    return !!(window.arcadeMeta && window.arcadeMeta.hasLocalHistory());
  }

  async showGlobalRanking(container, onClose) {
    const data = await window.arcadeMeta.getGlobalRanking(10);
    const loggedIn = !!(window.progress && window.progress.hasRemoteSession());

    const renderTable = (list, cols, sortKey) => {
      if (!list || list.length === 0) {
        return `<div style="font-size:15px;text-align:center;padding:12px;opacity:0.7;">Sem jogadores ainda.</div>`;
      }
      const headerRow = `<tr style="border-bottom:2px solid var(--menu-border-color);color:#ffeb3b;">
        <th style="padding:4px;">#</th><th style="text-align:left;padding:4px 6px;">Jogador</th>${cols.map(c => `<th style="padding:4px;">${c.label}</th>`).join("")}
      </tr>`;
      const rows = list.map((p, i) => `<tr>
        <td style="padding:3px;">${i + 1}</td>
        <td style="text-align:left;padding:3px 6px;">${p.nome}</td>
        ${cols.map(c => `<td style="padding:3px;">${c.fmt(p)}</td>`).join("")}
      </tr>`).join("");
      const posLine = (loggedIn && data.playerPositions && data.playerPositions[sortKey])
        ? `<div style="font-size:14px;text-align:center;margin-top:8px;color:#88ff99;">Sua posição: <b>#${data.playerPositions[sortKey]}</b></div>`
        : (loggedIn
            ? `<div style="font-size:14px;text-align:center;margin-top:8px;color:#cce0ff;"><i>Jogue uma prova para entrar no ranking.</i></div>`
            : `<div style="font-size:14px;text-align:center;margin-top:8px;color:#ffaa33;"><i>Entre para participar do ranking.</i></div>`);
      return `<table style="width:100%;border-collapse:collapse;font-size:15px;text-align:center;">
        ${headerRow}${rows}
      </table>${posLine}`;
    };

    const section = (title, list, cols, sortKey) => `
      <div style="font-size:18px;color:#ffeb3b;margin-top:16px;margin-bottom:6px;text-align:center;">
        <b>${title}</b>
      </div>
      ${renderTable(list, cols, sortKey)}
    `;

    const colsXp = [
      { label: "XP",   fmt: p => p.xp },
      { label: "Rank", fmt: p => p.rank?.name || "-" },
    ];
    const colsScore = [
      { label: "Score", fmt: p => p.bestScore },
      { label: "Provas", fmt: p => p.totalRuns },
    ];
    const colsVic = [
      { label: "Vit.",  fmt: p => p.victories },
      { label: "Total", fmt: p => p.totalRuns },
    ];

    const html = `
      ${section("🏆 Por XP", data.xp, colsXp, "xp")}
      ${section("🎯 Por Melhor Score", data.bestScore, colsScore, "bestScore")}
      ${section("✓ Por Vitórias", data.victories, colsVic, "victories")}
    `;

    const popup = new window.PopupWindow({
      title: "Ranking Global",
      text: html,
      size: "large",
      onComplete: () => { if (onClose) onClose(); },
    });
    popup.init(document.body);
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("TitleScreen");
    this.element.innerHTML = `
      <img class="TitleScreen_logo" src="imagens/mapas/menu/artemenu.png" alt="Jornada Matemágica" />
    `;
  }

  close() {
    if (this.keyboardMenu) {
      this.keyboardMenu.end();
    }
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }

  hide() {
    if (this.element) this.element.style.display = "none";
    if (this.keyboardMenu) this.keyboardMenu.pause();
  }

  show() {
    if (this.element) this.element.style.display = "";
    if (this.keyboardMenu) this.keyboardMenu.resume();
  }

  // Onboarding na primeira partida (após login bem-sucedido).
  // Apresenta 4 popups curtos e marca storyFlags.onboarding_done = true.
  // Jogador convidado também passa pelo onboarding (uma vez por navegador).
  async showOnboarding(container) {
    const flags = window.playerState && window.playerState.storyFlags;
    if (flags && flags.onboarding_done) return;

    const steps = [
      {
        title: "Bem-vinda à Jornada Matemágica!",
        text:
          "Você é a Alice, e seu desafio é dominar a matemática enquanto explora o colégio. " +
          "Vamos ver como o jogo funciona em 30 segundos."
      },
      {
        title: "Como andar",
        text:
          "Use as <b>setas do teclado</b> (ou <b>WASD</b>). " +
          "Em celular/tablet, use o <b>D-pad</b> que aparece na tela."
      },
      {
        title: "Conversar e enfrentar desafios",
        text:
          "Encoste em um colega ou professor e aperte <b>Enter</b> (ou o botão <b>A</b>) para falar. " +
          "Alguns vão te propor uma <b>questão de matemática</b> — responda escolhendo a alternativa."
      },
      {
        title: "Dificuldade que se adapta",
        text:
          "O jogo aprende com seus acertos e erros e ajusta o nível das próximas perguntas. " +
          "<b>Errar faz parte</b> — sempre tem explicação depois!"
      }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await new Promise((resolve) => {
        const popup = new window.PopupWindow({
          badge: `Passo ${i + 1} de ${steps.length}`,
          title: step.title,
          text: step.text,
          size: "large",
          onComplete: () => resolve(),
        });
        popup.init(document.body);
      });
    }

    if (flags) {
      flags.onboarding_done = true;
      if (window.playerState && typeof window.playerState.save === "function") {
        window.playerState.save();
      }
    }
  }

  async init(container) {
    await this.showLogin(container);

    // Onboarding (idempotente: storyFlags.onboarding_done evita repetir)
    await this.showOnboarding(container);

    return new Promise(async (resolve) => {
      this.createElement();
      // Regra UX-D: TitleScreen vive em document.body (resolução nativa)
      // pra não ser comprimida pela escala 3.5x do canvas. O `container`
      // ainda é passado em getOptions pelos handlers que precisam dele.
      document.body.appendChild(this.element);

      this.keyboardMenu = new window.KeyboardMenu();
      this.keyboardMenu.init(this.element);

      const options = await this.getOptions(resolve, container);
      this.keyboardMenu.setOptions(options);
    });
  }
}
// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.TitleScreen = TitleScreen;
