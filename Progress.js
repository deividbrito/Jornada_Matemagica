class Progress {
  constructor() {
    this.mapId = "Corredor";
    this.startingHeroX = 4;
    this.startingHeroY = 3;
    this.startingHeroDirection = "down";
    this.saveFileKey = "JornadaMatemagica_SaveFile1";
    this.sessaoData = null;
  }

  /**
   * Define os dados da sessão após login.
   * @param {{ jogador: Object, sessao: { id, id_usuario } }} dadosSessao
   */
  setSessao(dadosSessao) {
    // --- ATUALIZADO: O objeto sessao é mais simples ---
    // {
    //   jogador: { id, nome, email },
    //   sessao: { id, id_usuario }
    // }
    this.sessaoData = dadosSessao;
  }

  /**
   * Verifica se há sessão autenticada.
   * @returns {boolean}
   */
  hasRemoteSession() {
    // --- ATUALIZADO: Apenas checa se a sessão existe ---
    return (
      this.sessaoData !== null &&
      this.sessaoData.sessao &&
      this.sessaoData.sessao.id
    );
  }

  /**
   * Salva o progresso:
   * - Se há sessão autenticada, faz POST em /api/progressos/:id_sessao
   * - Caso contrário, salva no localStorage
   */
  async save() {
    const payload = {
      mapId: this.mapId,
      startingHeroX: this.startingHeroX,
      startingHeroY: this.startingHeroY,
      startingHeroDirection: this.startingHeroDirection,
      playerState: {
        storyFlags: window.playerState.storyFlags // Referencia correta
      }
    };

    if (this.hasRemoteSession()) {
      // --- ATUALIZAÇÃO COMPLETA DA LÓGICA DE SALVAR ---
      const sessaoId = this.sessaoData.sessao.id;
      try {
        const res = await fetch(
          `http://localhost:3000/api/progressos/${sessaoId}`, // Rota usa :id_sessao
          {
            method: "POST", // Rota é POST (UPSERT)
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ponto_de_salvamento: payload // Envia o OBJETO JSON diretamente
            })
          }
        );

        if (!res.ok) {
          console.error("Erro ao salvar progresso remoto:", await res.text());
          window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
        }
      } catch (err) {
        console.error("Falha na requisição de salvar remoto:", err);
        window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
      }
      // --- FIM DA ATUALIZAÇÃO ---
    } else {
      window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
    }
  }

  getSaveFile() {
    const file = window.localStorage.getItem(this.saveFileKey);
    return file ? JSON.parse(file) : null;
  }

  /**
   * Carrega o progresso:
   * - Se há sessão autenticada, tenta buscar no backend
   * - Se não houver sessão ou ocorrer erro, carrega do localStorage
   */
  async load() {
    if (this.hasRemoteSession()) {
      // --- ATUALIZAÇÃO COMPLETA DA LÓGICA DE CARREGAR ---
      const sessaoId = this.sessaoData.sessao.id;
      try {
        const res = await fetch(
          `http://localhost:3000/api/progressos/${sessaoId}` // Rota usa :id_sessao
        );
        if (res.ok) {
          const json = await res.json();
          
          // O 'ponto_de_salvamento' agora VEM como JSON, não string
          const file = json.ponto_de_salvamento; 
          
          if (file && Object.keys(file).length > 0) { // Verifica se o JSON não está vazio
            this.mapId = file.mapId;
            this.startingHeroX = file.startingHeroX;
            this.startingHeroY = file.startingHeroY;
            this.startingHeroDirection = file.startingHeroDirection;
            Object.keys(file.playerState).forEach((key) => {
              window.playerState[key] = file.playerState[key]; // Referencia correta
            });
            return; 
          }
        } else {
          console.warn(
            "Progresso remoto não encontrado (404) ou outro erro:",
            res.status
          );
        }
      } catch (err) {
        console.error("Falha ao buscar progresso remoto:", err);
      }
      // --- FIM DA ATUALIZAÇÃO ---
    }

    const file = this.getSaveFile();
    if (file) {
      this.mapId = file.mapId;
      this.startingHeroX = file.startingHeroX;
      this.startingHeroY = file.startingHeroY;
      this.startingHeroDirection = file.startingHeroDirection;
      Object.keys(file.playerState).forEach((key) => {
        window.playerState[key] = file.playerState[key]; // Referencia correta
      });
    }
  }

  async hasRemoteSaveData() {
    if (!this.hasRemoteSession()) return false;

    try {
      // --- ATUALIZADO: Rota e lógica de verificação ---
      const sessaoId = this.sessaoData.sessao.id;
      const res = await fetch(`http://localhost:3000/api/progressos/${sessaoId}`);
      if (res.ok) {
        const json = await res.json();
        // Verifica se o 'ponto_de_salvamento' existe e não é um objeto vazio '{}'
        return (
          json.ponto_de_salvamento &&
          Object.keys(json.ponto_de_salvamento).length > 0
        );
      }
      // --- FIM DA ATUALIZAÇÃO ---
    } catch (err) {
      console.error("Erro ao verificar progresso remoto:", err);
    }
    return false;
  }
  
  reset() {
    this.mapId = "Corredor";
    this.startingHeroX = 4;
    this.startingHeroY = 3;
    this.startingHeroDirection = "down";

    if (typeof window.playerState !== "undefined") {
      window.playerState.storyFlags = {};
    }
  }
}

// --- Importante: Garantir que o 'progress' esteja na window ---
window.progress = new Progress();