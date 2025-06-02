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

  getOptions(resolve) {
    const safeFile = this.progress.getSaveFile();
    const hasRemoteSave = this.progress.hasRemoteSession();

    return [
      {
        label: "Novo jogo",
        description: "Comece uma nova aventura!",
        handler: () => {
          this.close();
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
          resolve(true); // continuar jogo
        }
      }
    ].filter(Boolean);
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

    return new Promise((resolve) => {
      this.createElement();
      container.appendChild(this.element);

      this.keyboardMenu = new KeyboardMenu();
      this.keyboardMenu.init(this.element);
      this.keyboardMenu.setOptions(this.getOptions(resolve));
    });
  }
}
