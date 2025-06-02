class Progress {
  constructor() {
    this.mapId = "Corredor";
    this.startingHeroX = 4;
    this.startingHeroY = 3;
    this.startingHeroDirection = "down";
    this.saveFileKey = "JornadaMatemagica_SaveFile1";

    // Nova propriedade: dados de sessão (preenchidos via setSessao)
    // Esperamos receber algo como:
    // {
    //   jogador: { id, nome, email },
    //   sessao: { id, id_usuario, id_progresso_jogo, id_desempenho_jogo }
    // }
    this.sessaoData = null;
  }

  /**
   * Define os dados da sessão após login.
   * @param {{ jogador: Object, sessao: { id, id_usuario, id_progresso_jogo, id_desempenho_jogo } }} dadosSessao
   */
  setSessao(dadosSessao) {
    this.sessaoData = dadosSessao;
  }

  /**
   * Verifica se há sessão autenticada com progresso remoto.
   * @returns {boolean}
   */
  hasRemoteSession() {
    return (
      this.sessaoData !== null &&
      this.sessaoData.sessao &&
      this.sessaoData.sessao.id_progresso_jogo
    );
  }

  /**
   * Salva o progresso:
   * - Se há sessão autenticada, faz PUT em /api/progressos/:id_progresso
   * - Caso contrário, salva no localStorage
   */
  async save() {
    const payload = {
      mapId: this.mapId,
      startingHeroX: this.startingHeroX,
      startingHeroY: this.startingHeroY,
      startingHeroDirection: this.startingHeroDirection,
      playerState: {
        storyFlags: playerState.storyFlags
      }
    };

    if (this.hasRemoteSession()) {
      // Salvar no backend
      const progressoId = this.sessaoData.sessao.id_progresso_jogo;
      try {
        const res = await fetch(
          `http://localhost:3000/api/progressos/${progressoId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              // No banco, campo ponto_de_salvamento é VARCHAR ou TEXT.
              // Armazenamos o JSON completo como string.
              ponto_de_salvamento: JSON.stringify(payload)
            })
          }
        );

        if (!res.ok) {
          console.error("Erro ao salvar progresso remoto:", await res.text());
          // Se der erro no backend, podemos salvar em localStorage como fallback
          window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
        }
      } catch (err) {
        console.error("Falha na requisição de salvar remoto:", err);
        // Fallback para localStorage
        window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
      }
    } else {
      // Sem sessão: salva localmente
      window.localStorage.setItem(this.saveFileKey, JSON.stringify(payload));
    }
  }

  /**
   * Retorna o progresso do localStorage (de forma bruta).
   * Usado pelo TitleScreen para determinar se há "Continuar jogo".
   */
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
      // Buscar progresso remoto
      const progressoId = this.sessaoData.sessao.id_progresso_jogo;
      try {
        const res = await fetch(
          `http://localhost:3000/api/progressos/${progressoId}`
        );
        if (res.ok) {
          const json = await res.json();
          // Esperamos que a API retorne algo como { ponto_de_salvamento: "<JSON string>" }
          const savedString = json.ponto_de_salvamento;
          if (savedString) {
            const file = JSON.parse(savedString);
            this.mapId = file.mapId;
            this.startingHeroX = file.startingHeroX;
            this.startingHeroY = file.startingHeroY;
            this.startingHeroDirection = file.startingHeroDirection;
            Object.keys(file.playerState).forEach((key) => {
              playerState[key] = file.playerState[key];
            });
            return; // terminou o carregamento remoto com sucesso
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
      // Em caso de falha, cai no carregamento local abaixo
    }

    // Sem sessão ou erro: carrega do localStorage
    const file = this.getSaveFile();
    if (file) {
      this.mapId = file.mapId;
      this.startingHeroX = file.startingHeroX;
      this.startingHeroY = file.startingHeroY;
      this.startingHeroDirection = file.startingHeroDirection;
      Object.keys(file.playerState).forEach((key) => {
        playerState[key] = file.playerState[key];
      });
    }
  }

  reset() {
  this.mapId = "Corredor";
  this.startingHeroX = 4;
  this.startingHeroY = 3;
  this.startingHeroDirection = "down";

  // resetar também flags da história
  if (typeof playerState !== "undefined") {
    playerState.storyFlags = {};
  }
  }

}