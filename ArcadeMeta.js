// Persistência e metaprogressão do Modo Gincana Acadêmica.
//
// Modo logado (tem sessaoData.jogador.id):
//   - Fonte da verdade é o backend (rotas /api/arcade/*).
//   - Sem uso de localStorage. Se a API falhar, mostra aviso e não persiste.
//
// Modo convidado (sem sessão):
//   - Persistência 100% local em localStorage, no mesmo navegador.
//   - Progresso segue entre sessões mas some em outra máquina/navegador.
//   - XP/medalhas/ranks são calculados no cliente (mesma lógica do servidor).

class ArcadeMeta {
  constructor() {
    this.apiBase = "http://localhost:3000/api/arcade";
    this.localMetaKey    = "JornadaMatemagica_ArcadeMeta";
    this.localHistoryKey = "JornadaMatemagica_ArcadeHistory";

    this.RANKS = [
      { name: "Calouro I",        xp: 0 },
      { name: "Calouro II",       xp: 400 },
      { name: "Calouro III",      xp: 1000 },
      { name: "Estudante I",      xp: 1800 },
      { name: "Estudante II",     xp: 2800 },
      { name: "Estudante III",    xp: 4000 },
      { name: "Bolsista I",       xp: 5500 },
      { name: "Bolsista II",      xp: 7500 },
      { name: "Bolsista III",     xp: 10000 },
      { name: "Destaque I",       xp: 13000 },
      { name: "Destaque II",      xp: 16500 },
      { name: "Destaque III",     xp: 20500 },
      { name: "Campeão Nacional", xp: 25000 },
    ];

    this.BUFF_POOL = [
      { id: "heart",   icon: "◆", label: "Tentativa Extra", description: "Ganha +1 tentativa (máx 5)." },
      { id: "shield",  icon: "📘", label: "Revisão",         description: "Próximo erro não custa tentativa." },
      { id: "fifty",   icon: "✂", label: "Dica 50/50",      description: "Próxima questão começa com 2 alternativas erradas eliminadas." },
      { id: "focus",   icon: "⏸", label: "Concentração",    description: "Bônus de tempo dobrado nas próximas 3 questões." },
      { id: "fury",    icon: "✦", label: "Nota Dupla",      description: "Próximo acerto vale o dobro de pontos." },
    ];

    this._metaCache = null;
  }

  _idJogador() {
    return window.progress?.sessaoData?.jogador?.id || null;
  }

  _idSessao() {
    return window.progress?.sessaoData?.sessao?.id || null;
  }

  _defaultMeta() {
    return {
      xp: 0,
      totalRuns: 0,
      victories: 0,
      defeats: 0,
      bestScore: 0,
      maxStreak: 0,
      perfectRuns: 0,
      medals: { semFalhas: 0, velocista: 0, tempestade: 0 },
      rank: this.getRankInfo(0),
    };
  }

  _loadLocalMeta() {
    try {
      const raw = localStorage.getItem(this.localMetaKey);
      if (!raw) return this._defaultMeta();
      const parsed = JSON.parse(raw);
      parsed.rank = this.getRankInfo(parsed.xp || 0);
      parsed.medals = parsed.medals || { semFalhas: 0, velocista: 0, tempestade: 0 };
      return parsed;
    } catch (err) {
      return this._defaultMeta();
    }
  }

  _saveLocalMeta(meta) {
    try {
      const { rank, ...rest } = meta;
      localStorage.setItem(this.localMetaKey, JSON.stringify(rest));
      return true;
    } catch (err) {
      console.warn("Falha ao salvar meta local:", err);
      return false;
    }
  }

  _loadLocalHistory() {
    try {
      const raw = localStorage.getItem(this.localHistoryKey);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  _appendLocalHistory(entry) {
    try {
      const hist = this._loadLocalHistory();
      hist.push(entry);
      while (hist.length > 100) hist.shift();
      localStorage.setItem(this.localHistoryKey, JSON.stringify(hist));
      return true;
    } catch (err) {
      console.warn("Falha ao salvar histórico local:", err);
      return false;
    }
  }

  getRankInfo(xp) {
    const effectiveXp = xp != null ? xp : (this._metaCache?.xp || 0);
    let currentIndex = 0;
    for (let i = 0; i < this.RANKS.length; i++) {
      if (effectiveXp >= this.RANKS[i].xp) currentIndex = i;
    }
    const current = this.RANKS[currentIndex];
    const next = this.RANKS[currentIndex + 1] || null;
    const progress = next
      ? (effectiveXp - current.xp) / (next.xp - current.xp)
      : 1;
    return {
      name: current.name,
      xp: effectiveXp,
      currentXp: current.xp,
      nextXp: next ? next.xp : current.xp,
      nextName: next ? next.name : null,
      progress: Math.max(0, Math.min(1, progress)),
      isMax: !next,
    };
  }

  async getMeta() {
    const id = this._idJogador();
    if (!id) {
      const local = this._loadLocalMeta();
      this._metaCache = local;
      return local;
    }
    try {
      const res = await fetch(`${this.apiBase}/meta/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._metaCache = data;
      return data;
    } catch (err) {
      console.warn("Falha ao carregar meta da gincana:", err);
      return this._defaultMeta();
    }
  }

  async getHistory(limit = 10, sort = "recent") {
    const id = this._idJogador();
    if (!id) {
      const hist = this._loadLocalHistory().slice();
      if (sort === "score") {
        hist.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else {
        hist.reverse();
      }
      return hist.slice(0, Math.max(1, Math.min(100, limit)));
    }
    try {
      const res = await fetch(`${this.apiBase}/historico/${id}?limit=${limit}&sort=${sort}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("Falha ao carregar histórico da gincana:", err);
      return [];
    }
  }

  async getLeaderboard(n = 10) {
    return this.getHistory(n, "score");
  }

  // Ranking global (3 listas: xp, bestScore, vitórias + posição do jogador).
  async getGlobalRanking(limit = 10) {
    const id = this._idJogador();
    const url = `${this.apiBase}/ranking?limit=${limit}` + (id ? `&id_jogador=${id}` : "");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("Falha ao carregar ranking global:", err);
      return { xp: [], bestScore: [], victories: [], playerPositions: null };
    }
  }

  // Indica sincronamente se há histórico disponível (para o menu do TitleScreen).
  // Retorna true se logado (histórico vive no backend) OU se há dados locais.
  hasLocalHistory() {
    try {
      const raw = localStorage.getItem(this.localHistoryKey);
      if (!raw) return false;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0;
    } catch (err) {
      return false;
    }
  }

  // Registra uma run concluída.
  // Retorna { xpGained, rankBefore, rankAfter, rankedUp, medalsEarned, persisted, reason }.
  //   persisted=true  + reason="server" → gravado no backend
  //   persisted=true  + reason="local"  → gravado no localStorage (convidado)
  //   persisted=false + reason="api-error"   → logado mas API caiu; dados perdidos
  //   persisted=false + reason="local-error" → localStorage indisponível
  async recordRun(runResult) {
    const id_jogador = this._idJogador();

    if (!id_jogador) {
      return this._recordRunGuest(runResult);
    }

    try {
      const body = {
        id_jogador,
        id_sessao: this._idSessao(),
        victory: !!runResult.victory,
        score: runResult.score || 0,
        correct: runResult.correct || 0,
        wrong: Math.max(0, (runResult.total || 0) - (runResult.correct || 0)),
        total: runResult.total || 0,
        lives: runResult.lives != null ? runResult.lives : 0,
        maxLives: runResult.maxLives || 3,
        maxStreak: runResult.maxStreak || 0,
        questionsPerMage: runResult.questionsPerMage || 5,
        elapsedMs: runResult.elapsedMs || 0,
        avgTimeMs: runResult.avgTimeMs || 0,
      };

      const res = await fetch(`${this.apiBase}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.meta) this._metaCache = data.meta;

      return {
        xpGained: data.xpGained,
        rankBefore: data.rankBefore,
        rankAfter: data.rankAfter,
        rankedUp: !!data.rankedUp,
        medalsEarned: data.medalsEarned || [],
        persisted: true,
        reason: "server",
      };
    } catch (err) {
      console.warn("Falha ao registrar run no servidor:", err);
      const computed = this._computeLocal(runResult);
      return { ...computed, persisted: false, reason: "api-error" };
    }
  }

  // Convidado: calcula e persiste no localStorage.
  _recordRunGuest(runResult) {
    const computed = this._computeLocal(runResult);

    const prev = this._loadLocalMeta();
    const victory = !!runResult.victory;
    const perfect = victory && runResult.lives === runResult.maxLives;

    const next = {
      xp:           (prev.xp || 0) + computed.xpGained,
      totalRuns:    (prev.totalRuns || 0) + 1,
      victories:    (prev.victories || 0) + (victory ? 1 : 0),
      defeats:      (prev.defeats || 0) + (victory ? 0 : 1),
      bestScore:    Math.max(prev.bestScore || 0, runResult.score || 0),
      maxStreak:    Math.max(prev.maxStreak || 0, runResult.maxStreak || 0),
      perfectRuns:  (prev.perfectRuns || 0) + (perfect ? 1 : 0),
      medals: {
        semFalhas:  (prev.medals?.semFalhas  || 0) + (computed.medalsEarned.some(m => m.id === "semFalhas")  ? 1 : 0),
        velocista:  (prev.medals?.velocista  || 0) + (computed.medalsEarned.some(m => m.id === "velocista")  ? 1 : 0),
        tempestade: (prev.medals?.tempestade || 0) + (computed.medalsEarned.some(m => m.id === "tempestade") ? 1 : 0),
      },
    };

    const savedMeta = this._saveLocalMeta(next);

    const historyEntry = {
      date: new Date().toISOString(),
      victory,
      score: runResult.score || 0,
      correct: runResult.correct || 0,
      total: runResult.total || 0,
      pct: runResult.total > 0 ? Math.round((runResult.correct / runResult.total) * 100) : 0,
      lives: runResult.lives || 0,
      maxLives: runResult.maxLives || 3,
      maxStreak: runResult.maxStreak || 0,
      questionsPerMage: runResult.questionsPerMage || 5,
      elapsedMs: runResult.elapsedMs || 0,
      avgTimeMs: runResult.avgTimeMs || 0,
      xpGained: computed.xpGained,
      medals: computed.medalsEarned.map(m => m.id),
    };
    const savedHist = this._appendLocalHistory(historyEntry);

    next.rank = this.getRankInfo(next.xp);
    this._metaCache = next;

    return {
      ...computed,
      persisted: !!(savedMeta && savedHist),
      reason: (savedMeta && savedHist) ? "local" : "local-error",
    };
  }

  // Calcula XP/medalhas/ranks sem persistir. Usado por guest (antes de salvar)
  // e como fallback quando API falha.
  _computeLocal(runResult) {
    const victory = !!runResult.victory;
    const fator = (runResult.questionsPerMage || 5) / 5;
    let xpGained = Math.round((runResult.score || 0) * fator);
    if (!victory) xpGained = Math.round(xpGained * 0.3);

    const medalsEarned = [];
    if (victory && runResult.lives === runResult.maxLives) {
      medalsEarned.push({ id: "semFalhas", label: "Gabarito", icon: "🏆" });
    }
    if (victory && runResult.avgTimeMs && runResult.avgTimeMs < 10000) {
      medalsEarned.push({ id: "velocista", label: "Velocista", icon: "⚡" });
    }
    if ((runResult.maxStreak || 0) >= 10) {
      medalsEarned.push({ id: "tempestade", label: "Maratona", icon: "📚" });
    }

    const currentXp = this._metaCache?.xp || 0;
    const rankBefore = this.getRankInfo(currentXp);
    const rankAfter = this.getRankInfo(currentXp + xpGained);

    return {
      xpGained,
      rankBefore,
      rankAfter,
      rankedUp: rankAfter.name !== rankBefore.name,
      medalsEarned,
    };
  }

  rollBuffs(excludeIds = []) {
    const pool = this.BUFF_POOL.filter(b => !excludeIds.includes(b.id));
    const out = [];
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }
}

window.arcadeMeta = new ArcadeMeta();
