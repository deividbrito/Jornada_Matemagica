// matriz de ajuste da habilidade
const SKILL_ADJUSTMENT_MATRIX = {
  true: {
    "1": { "1": 7, "2": 10, "3": 15 }, 
    "2": { "1": 4, "2": 8,  "3": 12 }, 
    "3": { "1": 1, "2": 5,  "3": 9 }  
  },
  false: { 
    "1": { "1": -8, "2": -5, "3": -2 },
    "2": { "1": -12, "2": -7, "3": -4 },
    "3": { "1": -15, "2": -9, "3": -6 }  
  }
};


class PlayerState {
  constructor() {
    this.storyFlags = {};
    // skills: map { idAssunto: { score: Number, attempts: Number, correct: Number, streak: Number } }
    this.skills = {};
    this.load();
  }

  ensureAssunto(idAssunto) {
    if (!idAssunto) idAssunto = "global";
    if (!this.skills[idAssunto]) {
      this.skills[idAssunto] = {
        score: 50,    // começa em 50 (neutro)
        attempts: 0,
        correct: 0,
        streak: 0
      };
    }
    return this.skills[idAssunto];
  }

  getSkillScore(idAssunto) {
    return this.ensureAssunto(idAssunto).score;
  }

  getAccuracy(idAssunto) {
    const s = this.skills[idAssunto];
    if (!s || !s.attempts) return 0;
    return s.correct / s.attempts;
  }

  // decide a dificuldade ("1","2","3") com base no score.
  getDifficultyForAssunto(idAssunto) {
    const score = this.getSkillScore(idAssunto);
    if (score < 34) return "1";
    if (score < 67) return "2";
    return "3";
  }

  // ajusta a habilidade após uma tentativa
  adjustSkill(idAssunto, isCorrect, questionDifficulty, timeTaken = null) {
    const stat = this.ensureAssunto(idAssunto);
    stat.attempts = (stat.attempts || 0) + 1;
    if (isCorrect) stat.correct = (stat.correct || 0) + 1;

    // determina tiers
    const playerTier = this.getDifficultyForAssunto(idAssunto); // habilidade ANTES do ajuste
    const questionTier = String(questionDifficulty);

    // busca o delta base na matriz
    let baseDelta = SKILL_ADJUSTMENT_MATRIX[String(isCorrect)][playerTier][questionTier] || 0;
    
    let finalDelta = baseDelta;

    // bonus e penalidades
    if (isCorrect) {
      stat.streak = (stat.streak || 0) + 1;

      // bônus de Sequência (ex: +1 a cada 3 acertos, máx +3)
      const streakBonus = Math.min(Math.floor(stat.streak / 3), 3);
      finalDelta += streakBonus;

      //considerar função de simulado - implementar funcionalidades de tempo lá
      // bônus de Tempo (só para acertos)
      if (timeTaken !== null) {
        if (timeTaken < 10000) { // menos de 10s
          finalDelta += 2;
        } else if (timeTaken < 20000) { // menos de 20s
          finalDelta += 1;
        }
      }

    } else {
      // zera a sequência de acertos se errar
      stat.streak = 0;
    }
    stat.score = Math.max(0, Math.min(100, stat.score + finalDelta));

    this.save();
  }

  // persistência em localStorage
  save() {
    try {
      const payload = {
        storyFlags: this.storyFlags,
        skills: this.skills
      };
      localStorage.setItem("jornada_playerState_v1", JSON.stringify(payload));
    } catch (err) {
      console.warn("Não foi possível salvar playerState:", err);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem("jornada_playerState_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.storyFlags = parsed.storyFlags || {};
      this.skills = parsed.skills || {};
    } catch (err) {
      console.warn("Erro ao carregar playerState:", err);
    }
  }
}

window.playerState = new PlayerState();