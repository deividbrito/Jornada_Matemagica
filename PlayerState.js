class PlayerState {
  constructor() {
    this.storyFlags = {};
    // skills: map { idAssunto: { score: Number(0..100), attempts: Number, correct: Number } }
    this.skills = {};
    this.load(); // carrega do localStorage se existir
  }

  ensureAssunto(idAssunto) {
    if (!idAssunto) idAssunto = "global";
    if (!this.skills[idAssunto]) {
      this.skills[idAssunto] = {
        score: 50,    // valor neutro inicial (pode ajustar)
        attempts: 0,
        correct: 0
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

  // decide a dificuldade textual ("1","2","3") com base no score.
  
  getDifficultyForAssunto(idAssunto) {
    const score = this.getSkillScore(idAssunto);
    if (score < 40) return "1";
    if (score < 70) return "2";
    return "3";
  }

  // ajusta skill após uma tentativa.
  // - idAssunto: id do assunto (pode ser null -> "global")
  // - isCorrect: boolean
  // - questionDifficulty: "1"/"2"/"3" (string) — dificuldade da questão respondida
  adjustSkill(idAssunto, isCorrect, questionDifficulty) {
    const stat = this.ensureAssunto(idAssunto);
    stat.attempts = (stat.attempts || 0) + 1;
    if (isCorrect) stat.correct = (stat.correct || 0) + 1;

    // parâmetros de ajuste (tuneáveis)
    const baseGain = 8;    // ganho base ao acertar
    const baseLoss = 6;    // perda base ao errar

    // multiplicador conforme dificuldade da questão (quem gerou a questão deveria também fornecer)
    const diffMultiplier = questionDifficulty === "1" ? 0.8 :
                           questionDifficulty === "2" ? 1.0 : 1.2;

    const delta = Math.round((isCorrect ? baseGain : -baseLoss) * diffMultiplier);

    stat.score = Math.max(0, Math.min(100, stat.score + delta));

    this.save();
  }

  // persistência simples em localStorage --> trabalhar implementação com API depois!!!
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
