class TitleScreen {
  constructor({ progress }) {
    this.progress = progress;
    this.element = null;
  }

  async showLogin(container) {
    if (!this.progress.hasRemoteSession()) {
      await new Promise((resolveLogin) => {
        new LoginForm({
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
      container.appendChild(screen);

      const menu = new KeyboardMenu();
      menu.init(screen);

      let escListener = null;
      const cleanup = () => {
        menu.end();
        screen.remove();
        if (escListener) escListener.unbind();
      };

      escListener = new KeyPressListener("Escape", () => {
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
          resolve(false);
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
          resolve(true);
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
      {
        label: "Ranking Global",
        description: "Veja os melhores jogadores da Gincana Acadêmica",
        handler: () => {
          this.keyboardMenu.pause();
          this.showGlobalRanking(container, () => this.keyboardMenu.resume());
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
      <div style="text-align:center; font-size:10px; margin-bottom:6px;">
        <div style="font-size:12px; color:#ffeb3b;"><b>${rank.name}</b></div>
        <div class="ArcadeRunEnd_xpBar" style="margin:4px auto;"><div class="ArcadeRunEnd_xpFill" style="width:${xpPct}%"></div></div>
        <div style="font-size:8px;">${nextLine}</div>
      </div>
      <div style="font-size:9px; margin:4px 0;">
        Provas: <b>${meta.totalRuns}</b> · Aprovações: <b>${meta.victories}</b> · Melhor: <b>${meta.bestScore}</b> · Streak máx: <b>${meta.maxStreak}</b>
      </div>
      <div style="font-size:9px; margin:4px 0;">
        🏆 ${meta.medals.semFalhas} · ⚡ ${meta.medals.velocista} · 📚 ${meta.medals.tempestade}
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:9px; text-align:center; margin-top:6px;">
        <tr style="border-bottom:1px solid var(--menu-border-color);">
          <th>#</th><th>R</th><th>Pts</th><th>Acer</th><th>Etapas</th><th>Streak</th><th>Tempo</th>
        </tr>
        ${rows || `<tr><td colspan="7" style="padding:6px;">Sem provas ainda.</td></tr>`}
      </table>
    `;

    const popup = new PopupWindow({
      title: "Boletim",
      text: html,
      onComplete: () => { if (onClose) onClose(); },
    });
    popup.init(container);
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
        return `<div style="font-size:8px;text-align:center;padding:6px;">Sem jogadores ainda.</div>`;
      }
      const headerRow = `<tr style="border-bottom:1px solid var(--menu-border-color);">
        <th>#</th><th>Jogador</th>${cols.map(c => `<th>${c.label}</th>`).join("")}
      </tr>`;
      const rows = list.map((p, i) => `<tr>
        <td>${i + 1}</td>
        <td style="text-align:left;padding-left:4px;">${p.nome}</td>
        ${cols.map(c => `<td>${c.fmt(p)}</td>`).join("")}
      </tr>`).join("");
      const posLine = (loggedIn && data.playerPositions && data.playerPositions[sortKey])
        ? `<div style="font-size:8px;text-align:center;margin-top:3px;color:#88ff99;">Sua posição: <b>#${data.playerPositions[sortKey]}</b></div>`
        : (loggedIn
            ? `<div style="font-size:8px;text-align:center;margin-top:3px;color:#cce0ff;"><i>Jogue uma prova para entrar no ranking.</i></div>`
            : `<div style="font-size:8px;text-align:center;margin-top:3px;color:#ffaa33;"><i>Entre para participar do ranking.</i></div>`);
      return `<table style="width:100%;border-collapse:collapse;font-size:8px;text-align:center;">
        ${headerRow}${rows}
      </table>${posLine}`;
    };

    const section = (title, list, cols, sortKey) => `
      <div style="font-size:10px;color:#ffeb3b;margin-top:8px;margin-bottom:2px;text-align:center;">
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

    const popup = new PopupWindow({
      title: "Ranking Global",
      text: html,
      onComplete: () => { if (onClose) onClose(); },
    });
    popup.init(container);
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

  async init(container) {
    await this.showLogin(container);

    return new Promise(async (resolve) => {
      this.createElement();
      container.appendChild(this.element);

      this.keyboardMenu = new KeyboardMenu();
      this.keyboardMenu.init(this.element);

      // NOVO: passa container para getOptions poder exibir a tela de campanha
      const options = await this.getOptions(resolve, container);
      this.keyboardMenu.setOptions(options);
    });
  }
}