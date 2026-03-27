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
      // Cria um elemento de fundo para a tela de escolha
      const screen = document.createElement("div");
      screen.classList.add("TitleScreen");
      screen.innerHTML = `
        <img class="TitleScreen_logo" src="imagens/mapas/menu/artemenu.png" alt="Jornada Matemágica" />
      `;
      container.appendChild(screen);

      const menu = new KeyboardMenu();
      menu.init(screen);
      menu.setOptions([
        {
          label: "Ensino Fundamental",
          description: "Questões do 6º ao 9º ano",
          handler: () => {
            menu.end();
            screen.remove();
            resolve("fundamental");
          }
        },
        {
          label: "Ensino Médio",
          description: "Questões do 1º ao 3º ano do EM",
          handler: () => {
            menu.end();
            screen.remove();
            resolve("medio");
          }
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
          this.close();
          // NOVO: pede ao jogador que escolha a campanha antes de iniciar
          const campanha = await this.chooseCampanha(container);
          this.progress.campanha = campanha;
          resolve(false); // novo jogo
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
          resolve(true); // continuar jogo — campanha já vem salva no progresso
        }
      },
      this.hasArcadeHistory() && {
        label: "Histórico Arcade",
        description: "Veja seu desempenho nas sessões do Ensino Médio",
        handler: () => {
          this.showArcadeHistory(container);
        }
      }
    ].filter(Boolean);
  }

  hasArcadeHistory() {
    const history = JSON.parse(localStorage.getItem("JornadaMatemagica_ArcadeHistory") || "[]");
    return history.length > 0;
  }

  showArcadeHistory(container) {
    const history = JSON.parse(localStorage.getItem("JornadaMatemagica_ArcadeHistory") || "[]");
    const last10 = history.slice(-10).reverse();

    const rows = last10.map((s, i) =>
      `<tr>
        <td>${last10.length - i}</td>
        <td>${s.date}</td>
        <td>${s.correct}/${s.total}</td>
        <td>${s.pct}%</td>
        <td>${s.time || "--"}</td>
      </tr>`
    ).join("");

    const tableHtml = `
      <table style="width:100%; border-collapse:collapse; font-size:10px; text-align:center;">
        <tr style="border-bottom:1px solid var(--menu-border-color);">
          <th>#</th><th>Data</th><th>Acertos</th><th>Taxa</th><th>Tempo</th>
        </tr>
        ${rows}
      </table>
    `;

    const popup = new PopupWindow({
      title: "Histórico Arcade",
      text: history.length === 0
        ? "Nenhuma sessão registrada ainda."
        : tableHtml,
      onComplete: () => {},
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