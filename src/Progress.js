class Progress {
  constructor() {
    this.mapId = "Corredor";
    this.startingHeroX = 4;
    this.startingHeroY = 3;
    this.startingHeroDirection = "down";
    this.campanha = "fundamental";
    this.saveFileKey = "JornadaMatemagica_SaveFile1";
    this.sessaoKey = "jm_session";
    // Tenta restaurar sessão de localStorage imediatamente — assim qualquer
    // reload mid-run preserva o estado de "logado" mesmo sem chamar /auth/me.
    this.sessaoData = this._loadSessaoFromStorage();

    // Estado da fase ativa (Pilar 4 do roadmap).
    // Quando o jogador escolhe uma fase no FaseSelector, populamos esse objeto
    // e contamos respostas até bater metaQuestoes. Não é persistido — se sair
    // antes de concluir, a tentativa não conta. Mantém o "atalho" do roadmap:
    // fase é uma run agrupada de N quizzes num mapa, sem inventar máquina de
    // estado nova.
    this.faseRun = null;
  }

  startFase(fase, opts = {}) {
    this.faseRun = {
      codigo: fase.codigo,
      nome: fase.nome,
      metaQuestoes: fase.metaQuestoes,
      metaAcertos: fase.metaAcertos,
      recompensaXp: fase.recompensaXp,
      mapId: fase.mapId,
      answered: 0,
      correct: 0,
      score: 0,
      usedBuff: false,
      // true quando o jogador veio do menu "Selecionar Fase" (replay isolado).
      // false quando entrou pela porta da sala (run longa narrativa).
      viaSelector: !!opts.viaSelector,
      // "1"/"2"/"3" sobrescreve o adaptativo; null preserva PlayerState.getDifficultyForAssunto.
      dificuldadeManual: opts.dificuldadeManual || null,
    };
  }

  recordFaseAnswer({ isCorrect, scoreDelta = 0, usedBuff = false }) {
    if (!this.faseRun) return null;
    this.faseRun.answered += 1;
    if (isCorrect) this.faseRun.correct += 1;
    this.faseRun.score += Math.max(0, scoreDelta);
    if (usedBuff) this.faseRun.usedBuff = true;
    return {
      answered: this.faseRun.answered,
      correct: this.faseRun.correct,
      done: this.faseRun.answered >= this.faseRun.metaQuestoes,
    };
  }

  clearFase() {
    this.faseRun = null;
  }

  /**
   * Define os dados da sessão após login/registro bem-sucedidos.
   * Formato: { jogador: { id, nome, email }, sessao: { id, id_usuario } }
   * Persiste em localStorage pra sobreviver a reloads (ex.: fim de fase).
   */
  setSessao(dadosSessao) {
    this.sessaoData = dadosSessao;
    try {
      if (dadosSessao) {
        window.localStorage.setItem(this.sessaoKey, JSON.stringify(dadosSessao));
      } else {
        window.localStorage.removeItem(this.sessaoKey);
      }
    } catch (_) { /* localStorage indisponível — segue em memória */ }
  }

  _loadSessaoFromStorage() {
    try {
      const raw = window.localStorage.getItem(this.sessaoKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
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
      if (window.loadingOverlay) window.loadingOverlay.show("Salvando…");
      try {
        await window.api.fetch(`/api/progressos/${sessaoId}`, {
          method: "POST",
          body: JSON.stringify({ ponto_de_salvamento: payload }),
        });
        if (window.toast) window.toast.success("Progresso salvo.", 2000);
        return;
      } catch (err) {
        console.error("Falha ao salvar progresso remoto, caindo para localStorage:", err);
        if (window.toast) window.toast.warn("Sem conexão — progresso salvo só neste navegador.");
      } finally {
        if (window.loadingOverlay) window.loadingOverlay.hide();
      }
    }
    window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
  }

  getSaveFile() {
    const raw = window.localStorage.getItem(this.saveFileKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // Só consideramos save válido se tem mapId — qualquer outra coisa é
      // lixo (save parcial ou corrompido) que não deve oferecer "Continuar".
      return parsed && parsed.mapId ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  async load() {
    if (this.hasRemoteSession()) {
      const sessaoId = this.sessaoData.sessao.id;
      try {
        const json = await window.api.fetch(`/api/progressos/${sessaoId}`);
        const file = json.ponto_de_salvamento;
        // Mesmo critério de getSaveFile: precisa de mapId válido.
        if (file && file.mapId) {
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
    // Normaliza saves antigos: bug anterior salvava em pixels (ex.: 64 em
    // vez de 4). Valores > 50 são certamente pixels (mapas têm no máx ~40
    // tiles). Dividimos por 16 pra trazer pra grid coord.
    this.startingHeroX = this._normalizeGrid(file.startingHeroX);
    this.startingHeroY = this._normalizeGrid(file.startingHeroY);
    this.startingHeroDirection = file.startingHeroDirection;
    this.campanha = file.campanha || "fundamental";
    if (file.playerState && typeof file.playerState === "object") {
      Object.keys(file.playerState).forEach((key) => {
        window.playerState[key] = file.playerState[key];
      });
    }
  }

  _normalizeGrid(value) {
    if (typeof value !== "number") return 0;
    return value > 50 ? Math.round(value / 16) : value;
  }

  async hasRemoteSaveData() {
    if (!this.hasRemoteSession()) return false;
    try {
      const sessaoId = this.sessaoData.sessao.id;
      const json = await window.api.fetch(`/api/progressos/${sessaoId}`);
      // Save válido = tem `ponto_de_salvamento` com mapId. Backend cria
      // a linha com `{}` no registro, então só Object.keys > 0 não basta.
      return !!(
        json &&
        json.ponto_de_salvamento &&
        json.ponto_de_salvamento.mapId
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
    try { window.localStorage.removeItem(this.sessaoKey); } catch (_) {}
  }

  // Re-hidrata sessaoData no boot. Estratégia em camadas:
  //   1. Construtor já carregou do localStorage (sobrevive a reloads)
  //   2. Se temos token mas não temos sessao em cache, tenta /auth/me
  //   3. Se token foi limpo (401), descarta também a sessao persistida
  async rehydrateSession() {
    if (!window.api.isLogged()) {
      // Sem token → garante limpeza pra evitar "logado fantasma".
      if (this.sessaoData) {
        this.sessaoData = null;
        try { window.localStorage.removeItem(this.sessaoKey); } catch (_) {}
      }
      return;
    }
    if (this.sessaoData) return; // já temos do localStorage, ok
    try {
      const data = await window.api.fetch("/api/auth/me");
      if (data && data.sessao && data.jogador) {
        this.setSessao({ jogador: data.jogador, sessao: data.sessao });
      }
    } catch (err) {
      // 401 já foi tratado pelo apiClient (limpa o token). Outros erros
      // ficam silenciosos — fluxo cai pra login normal.
      if (!err.status || err.status >= 500) {
        console.warn("Falha ao re-hidratar sessão:", err.message);
      }
    }
  }

  // Sincroniza progresso de fases (backend) → storyFlags (cliente).
  // Roda após login pra que diálogos com `required: ["MAGO_X_DERROTADO"]`
  // reflitam o que o jogador já concluiu em outros dispositivos.
  async syncFaseFlags() {
    if (!this.hasRemoteSession()) return;
    const FLAG_MAP = {
      sala1_decimais:      "MAGO_DECIMAIS_DERROTADO",
      sala2_aproximacao:   "MAGO_APROXIMACAO_DERROTADO",
      gremio_primos:       "MAGO_PRIMOS_DERROTADO",
      biblioteca_fracoes:  "MAGO_FRACOES_DERROTADO",
      patio_racionais:     "MAGO_RACIONAIS_DERROTADO",
      jardim_porcentagem:  "MAGO_PORCENTAGEM_DERROTADO",
    };
    try {
      const fases = await window.api.fetch(`/api/fases?campanha=fundamental`);
      fases.forEach((f) => {
        const flag = FLAG_MAP[f.codigo];
        if (flag && f.progresso && f.progresso.status === "concluida") {
          window.playerState.storyFlags[flag] = true;
        }
      });
    } catch (err) {
      console.warn("Falha ao sincronizar flags de fase:", err.message);
    }
  }
}

window.progress = new Progress();

// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.Progress = Progress;
