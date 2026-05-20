// src/FaseRunner.js
// Finaliza uma fase: dispara `POST /api/fases/:codigo/concluir`, mostra popup
// de resultado (estrelas + XP + medalha) e limpa o estado faseRun.
//
// Não é um "runner" no sentido clássico — a contagem por quiz vive em
// OverworldEvent.quizGame (via Progress.recordFaseAnswer). Este módulo só
// fecha o ciclo quando o jogador atinge metaQuestoes.

// Mapeamento código da fase → storyFlag de mago derrotado. Usado pra setar
// flag manualmente após vitória em run longa, mantendo narrativa local ao
// save (sem depender de sync do backend que vazaria histórico entre runs).
const FASE_FLAG_MAP = {
  sala1_decimais:      "MAGO_DECIMAIS_DERROTADO",
  sala2_aproximacao:   "MAGO_APROXIMACAO_DERROTADO",
  gremio_primos:       "MAGO_PRIMOS_DERROTADO",
  biblioteca_fracoes:  "MAGO_FRACOES_DERROTADO",
  patio_racionais:     "MAGO_RACIONAIS_DERROTADO",
  jardim_porcentagem:  "MAGO_PORCENTAGEM_DERROTADO",
};

class FaseRunner {
  static async finalize() {
    const run = window.progress && window.progress.faseRun;
    if (!run) return;

    // Snapshot do estado antes de zerar (popup pode rodar async).
    const payload = {
      totalQuestoes: run.answered,
      acertos: run.correct,
      score: run.score,
      semBuffs: !run.usedBuff,
    };
    const codigo = run.codigo;
    const nome = run.nome;
    const viaSelector = !!run.viaSelector;
    // Stats locais (não vão pro backend — só pro popup pedagógico).
    const stats = {
      totalElapsedMs: Date.now() - (run.startTime || Date.now()),
      totalAnswerTimeMs: run.totalTimeMs || 0,
      maxStreak: run.maxStreak || 0,
      score: run.score || 0,
      usedBuff: !!run.usedBuff,
    };

    if (window.loadingOverlay) window.loadingOverlay.show("Finalizando fase…");

    let result;
    try {
      result = await window.api.fetch(
        `/api/fases/${encodeURIComponent(codigo)}/concluir`,
        { method: "POST", body: JSON.stringify(payload) }
      );
    } catch (err) {
      console.error("Falha ao concluir fase:", err);
      if (window.toast) {
        window.toast.error("Não foi possível registrar a fase. Tente novamente.");
      }
      return;
    } finally {
      if (window.loadingOverlay) window.loadingOverlay.hide();
    }

    // Atualiza XpBar imediatamente se o backend devolveu rank novo.
    if (result.rank) {
      document.dispatchEvent(
        new CustomEvent("jm:xp-updated", { detail: result.rank })
      );
    }

    // Seta storyFlag de "mago derrotado" pra que diálogos pós-luta, sprite
    // derrotado e bloqueio de sala reflitam no save desta run. SÓ em run
    // longa — replay (viaSelector) não afeta narrativa.
    if (result.aprovou && !viaSelector && window.playerState) {
      const flag = FASE_FLAG_MAP[codigo];
      if (flag) window.playerState.storyFlags[flag] = true;
    }

    // Limpa o estado da fase ANTES de mostrar o popup — assim o FaseHUD some.
    window.progress.clearFase();

    FaseRunner._showResultPopup({ nome, payload, result, viaSelector, stats });
  }

  static _formatTime(ms) {
    if (!ms || ms < 0) return "—";
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
  }

  static _showResultPopup({ nome, payload, result, viaSelector, stats }) {
    const aprovou = result.aprovou;
    const primeira = result.primeiraConclusao;
    const estrelas = result.estrelas;
    const xp = result.xpReward || 0;
    const medalha = result.medalha;

    const stars = "★".repeat(estrelas) + "☆".repeat(3 - estrelas);

    const titulo = aprovou
      ? (primeira ? "Fase Concluída!" : "Fase Repetida")
      : "Tente Novamente";

    const subtitulo = aprovou
      ? `${nome}`
      : `Você acertou ${payload.acertos}/${payload.totalQuestoes}. Continue tentando!`;

    const recompensaHtml = aprovou && primeira && xp > 0
      ? `<div class="FaseResult_reward">+${xp} XP${medalha ? ` · 🏅 ${medalha}` : ""}</div>`
      : (aprovou && !primeira
          ? `<div class="FaseResult_reward FaseResult_reward--repeat">XP já obtido em conclusão anterior</div>`
          : "");

    // Stats detalhados — todos derivados localmente, sem dependência do backend.
    const totalQuestoes = payload.totalQuestoes || 0;
    const acertos = payload.acertos || 0;
    const pct = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;
    const avgMs = totalQuestoes > 0 ? Math.round((stats.totalAnswerTimeMs || 0) / totalQuestoes) : 0;
    const tempoTotalStr = FaseRunner._formatTime(stats.totalElapsedMs);
    const avgStr = avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : "—";
    const semBuffsLabel = stats.usedBuff
      ? `<span class="FaseResult_extra FaseResult_extra--muted">Buff usado</span>`
      : `<span class="FaseResult_extra FaseResult_extra--ok">Sem buffs ✨</span>`;

    const detailsHtml = `
      <div class="FaseResult_breakdown">
        <div class="FaseResult_cell">
          <span class="FaseResult_cellLabel">Aproveitamento</span>
          <span class="FaseResult_cellValue">${pct}%</span>
        </div>
        <div class="FaseResult_cell">
          <span class="FaseResult_cellLabel">Streak máx</span>
          <span class="FaseResult_cellValue">🔥 ${stats.maxStreak || 0}</span>
        </div>
        <div class="FaseResult_cell">
          <span class="FaseResult_cellLabel">Tempo total</span>
          <span class="FaseResult_cellValue">${tempoTotalStr}</span>
        </div>
        <div class="FaseResult_cell">
          <span class="FaseResult_cellLabel">Méd / questão</span>
          <span class="FaseResult_cellValue">${avgStr}</span>
        </div>
      </div>
      <div class="FaseResult_extras">
        <span class="FaseResult_extra">Pontos: <strong>${stats.score || 0}</strong></span>
        ${semBuffsLabel}
      </div>
    `;

    const overlay = document.createElement("div");
    overlay.className = `FaseResult ${aprovou ? "FaseResult--win" : "FaseResult--fail"}`;
    overlay.innerHTML = `
      <div class="FaseResult_inner">
        <div class="FaseResult_title">${titulo}</div>
        <div class="FaseResult_subtitle">${subtitulo}</div>
        <div class="FaseResult_stars" data-stars="${estrelas}">${stars}</div>
        <div class="FaseResult_stats">
          <span>Acertos: <strong>${acertos}/${totalQuestoes}</strong></span>
        </div>
        ${detailsHtml}
        ${recompensaHtml}
        <button type="button" class="FaseResult_button">Continuar</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Som temático: vitória/erro pra ancorar emocionalmente o resultado.
    if (window.audioManager) {
      window.audioManager.playSfx(aprovou ? "correct" : "wrong");
    }

    const btn = overlay.querySelector(".FaseResult_button");
    const close = async () => {
      overlay.remove();
      if (viaSelector) {
        // Replay/atalho: NÃO altera save (mantém posição da run intacta).
        // Reload natural → cai na TitleScreen, jogador escolhe o que fazer.
        window.location.reload();
        return;
      }
      // Run longa: volta ao Corredor com hero 3 tiles acima do Mentor (4,8).
      // Distância suficiente pra Mentor caminhar até Alice durante cutscenes
      // de Transição/Epílogo sem o tile do caminho estar bloqueado pelo hero.
      window.progress.mapId = "Corredor";
      window.progress.startingHeroX = 4;
      window.progress.startingHeroY = 5;
      window.progress.startingHeroDirection = "down";
      try { await window.progress.save(); } catch (_) { /* segue mesmo offline */ }
      try { window.sessionStorage.setItem("jm_skip_title", "1"); } catch (_) {}
      window.location.reload();
    };
    btn.addEventListener("click", close);
    setTimeout(() => btn.focus(), 50);
  }
}

window.FaseRunner = FaseRunner;
