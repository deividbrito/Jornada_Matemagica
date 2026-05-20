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

    FaseRunner._showResultPopup({ nome, payload, result, viaSelector });
  }

  static _showResultPopup({ nome, payload, result, viaSelector }) {
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

    const overlay = document.createElement("div");
    overlay.className = `FaseResult ${aprovou ? "FaseResult--win" : "FaseResult--fail"}`;
    overlay.innerHTML = `
      <div class="FaseResult_inner">
        <div class="FaseResult_title">${titulo}</div>
        <div class="FaseResult_subtitle">${subtitulo}</div>
        <div class="FaseResult_stars" data-stars="${estrelas}">${stars}</div>
        <div class="FaseResult_stats">
          <span>Acertos: <strong>${payload.acertos}/${payload.totalQuestoes}</strong></span>
        </div>
        ${recompensaHtml}
        <button type="button" class="FaseResult_button">Continuar</button>
      </div>
    `;
    document.body.appendChild(overlay);

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
