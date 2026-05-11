class Progress {
  constructor() {
    this.mapId = "Corredor";
    this.startingHeroX = 4;
    this.startingHeroY = 3;
    this.startingHeroDirection = "down";
    this.campanha = "fundamental";
    this.saveFileKey = "JornadaMatemagica_SaveFile1";
    this.sessaoData = null;
  }

  /**
   * Define os dados da sessão após login/registro bem-sucedidos.
   * Formato: { jogador: { id, nome, email }, sessao: { id, id_usuario } }
   */
  setSessao(dadosSessao) {
    this.sessaoData = dadosSessao;
  }

  hasRemoteSession() {
    return (
      this.sessaoData !== null &&
      this.sessaoData.sessao &&
      this.sessaoData.sessao.id &&
      window.api.isLogged()
    );
  }

  /**
   * Salva o progresso:
   * - Com sessão autenticada → POST /api/progressos/:id_sessao
   * - Sem sessão → localStorage
   */
  async save() {
    const payload = {
      mapId: this.mapId,
      startingHeroX: this.startingHeroX,
      startingHeroY: this.startingHeroY,
      startingHeroDirection: this.startingHeroDirection,
      campanha: this.campanha,
      playerState: {
        storyFlags: window.playerState.storyFlags,
      },
    };

    if (this.hasRemoteSession()) {
      const sessaoId = this.sessaoData.sessao.id;
      try {
        await window.api.fetch(`/api/progressos/${sessaoId}`, {
          method: "POST",
          body: JSON.stringify({ ponto_de_salvamento: payload }),
        });
        return;
      } catch (err) {
        console.error("Falha ao salvar progresso remoto, caindo para localStorage:", err);
        // Fallback silencioso para localStorage — Onda 4 substituirá por toast.
      }
    }
    window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
  }

  getSaveFile() {
    const file = window.localStorage.getItem(this.saveFileKey);
    return file ? JSON.parse(file) : null;
  }

  async load() {
    if (this.hasRemoteSession()) {
      const sessaoId = this.sessaoData.sessao.id;
      try {
        const json = await window.api.fetch(`/api/progressos/${sessaoId}`);
        const file = json.ponto_de_salvamento;
        if (file && Object.keys(file).length > 0) {
          this._applyFile(file);
          return;
        }
      } catch (err) {
        // 404 quando ainda não há save — silencioso, cai para localStorage.
        if (!err.status || err.status >= 500) {
          console.warn("Falha ao buscar progresso remoto:", err.message);
        }
      }
    }

    const file = this.getSaveFile();
    if (file) this._applyFile(file);
  }

  _applyFile(file) {
    this.mapId = file.mapId;
    this.startingHeroX = file.startingHeroX;
    this.startingHeroY = file.startingHeroY;
    this.startingHeroDirection = file.startingHeroDirection;
    this.campanha = file.campanha || "fundamental";
    if (file.playerState && typeof file.playerState === "object") {
      Object.keys(file.playerState).forEach((key) => {
        window.playerState[key] = file.playerState[key];
      });
    }
  }

  async hasRemoteSaveData() {
    if (!this.hasRemoteSession()) return false;
    try {
      const sessaoId = this.sessaoData.sessao.id;
      const json = await window.api.fetch(`/api/progressos/${sessaoId}`);
      return (
        json &&
        json.ponto_de_salvamento &&
        Object.keys(json.ponto_de_salvamento).length > 0
      );
    } catch (err) {
      if (err.status && err.status < 500) return false;
      console.error("Erro ao verificar progresso remoto:", err);
      return false;
    }
  }

  reset() {
    this.mapId = "Corredor";
    this.startingHeroX = 4;
    this.startingHeroY = 3;
    this.startingHeroDirection = "down";
    // campanha NÃO é resetada — TitleScreen define antes de chamar reset().
    if (typeof window.playerState !== "undefined") {
      window.playerState.storyFlags = {};
    }
  }

  // Encerra a sessão local: descarta token + dados de sessão.
  // Não chama o backend (JWT é stateless; expira sozinho).
  logout() {
    window.api.clearToken();
    this.sessaoData = null;
  }
}

window.progress = new Progress();

// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.Progress = Progress;
