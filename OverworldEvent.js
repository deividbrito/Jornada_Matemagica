class OverworldEvent {
  constructor({ map, event}) {
    this.map = map;
    this.event = event;

    this.init = this.init.bind(this);
  }

  stand(resolve) {
    const who = this.map.gameObjects[ this.event.who ];
    who.startBehavior({
      map: this.map
    }, {
      type: "stand",
      direction: this.event.direction,
      time: this.event.time
    })

    const completeHandler = e => {
      if (e.detail.whoId === this.event.who) {
        document.removeEventListener("PersonStandComplete", completeHandler);
        resolve();
      }
    }
    document.addEventListener("PersonStandComplete", completeHandler)
  }

  walk(resolve) {
    const who = this.map.gameObjects[ this.event.who ];
    who.startBehavior({
      map: this.map
    }, {
      type: "walk",
      direction: this.event.direction,
      retry: true
    })

    const completeHandler = e => {
      if (e.detail.whoId === this.event.who) {
        document.removeEventListener("PersonWalkingComplete", completeHandler);
        resolve();
      }
    }
    document.addEventListener("PersonWalkingComplete", completeHandler)

  }

  textMessage(resolve) {

    if (this.event.faceHero) {
      const obj = this.map.gameObjects[this.event.faceHero];
      obj.direction = utils.oppositeDirection(this.map.gameObjects["hero"].direction);
    }

    const message = new TextMessage({
      text: this.event.text,
      onComplete: () => resolve()
    })
    message.init( document.querySelector(".game-container") )
  }

  quizGame(resolve) {
    if (this.event.faceHero) {
      const obj = this.map.gameObjects[this.event.faceHero];
      obj.direction = utils.oppositeDirection(this.map.gameObjects["hero"].direction);
    }

    const assunto = this.event.idAssunto || null;
    let dificuldadeSolicitada = this.event.dificuldade || window.playerState.getDifficultyForAssunto(assunto);
    const campanha = window.progress?.campanha || "fundamental";

    const quizGame = new QuizGame({
      onComplete: (result) => {
        if (result && typeof result.isCorrect === "boolean") {
          if (window.progress?.campanha === "medio") {
            window.arcadeStats = window.arcadeStats || { total: 0, correct: 0 };
            window.arcadeStats.total++;
            if (result.isCorrect) window.arcadeStats.correct++;
          }
          window.playerState.adjustSkill(
            result.idAssunto,
            result.isCorrect,
            result.dificuldade,
            result.timeTaken
          );
        }
        resolve();
      },
      idAssunto: assunto,
      dificuldade: dificuldadeSolicitada,
      campanha,
    });

    quizGame.init(document.querySelector(".game-container"));
  }


  changeMap(resolve) {
    const sceneTransition = new SceneTransition();
    sceneTransition.init(document.querySelector(".game-container"), () => {
        const resolvedMapId = utils.resolveMapId(this.event.map);
        window.currentMapName = resolvedMapId;

        this.map.overworld.startMap( window.OverworldMaps[resolvedMapId], {
            x: this.event.x,
            y: this.event.y,
            direction: this.event.direction,
        });

        resolve();
        sceneTransition.fadeOut();
    });
  }

  choiceMessage(resolve) {
    const choiceMessage = new ChoiceMessage({
      text: this.event.text,
      choices: this.event.options,
      onComplete: (chosenEvents) => {
        const eventChain = new OverworldEventRunner({
          map: this.map,
          events: chosenEvents
        });
        eventChain.init().then(() => resolve());
      }
    });
    choiceMessage.init(document.querySelector(".game-container"));
  }


  popup(resolve) {
    const popup = new PopupWindow({
      title: this.event.title || "",
      text: this.event.text || "",
      onComplete: () => resolve(),
    });
    popup.init(document.querySelector(".game-container"));
  }

  addStoryFlag(resolve) {
    window.playerState.storyFlags[this.event.flag] = true;
    resolve();
  }

  changeSprite(resolve) {
    const who = this.map.gameObjects[this.event.who];
    if (who) {
      who.sprite.image.src = this.event.src;
    }
    resolve();
  }

  // ====================================================================
  // MODO GINCANA ACADÊMICA — prova única com recompensas por streak
  // ====================================================================

  arcadeStart(resolve) {
    const popup = new PopupWindow({
      title: "Gincana Acadêmica",
      text: "Quantas questões deseja enfrentar?",
      buttons: [
        { label: "5",  value: "5"  },
        { label: "10", value: "10" },
        { label: "15", value: "15" },
        { label: "20", value: "20" },
        { label: "25", value: "25" },
        { label: "30", value: "30" },
        { label: "35", value: "35" },
        { label: "40", value: "40" },
        { label: "45", value: "45" },
        { label: "50", value: "50" },
        { label: "55", value: "55" },
        { label: "60", value: "60" },
      ],
      onComplete: (value) => {
        const count = parseInt(value) || 10;
        const startTime = Date.now();

        const numAltars = Math.ceil(count / 10);
        const altarCheckpoints = [];
        for (let i = 1; i <= numAltars; i++) {
          altarCheckpoints.push(Math.floor((count * i) / (numAltars + 1)));
        }

        window.arcadeRun = {
          lives: 3,
          maxLives: 3,
          score: 0,
          streak: 0,
          maxStreak: 0,
          totalCorrect: 0,
          totalWrong: 0,
          totalTimeMs: 0,
          totalQuestions: count,
          questionsAnswered: 0,
          freeAnswers: 0,
          rewardsTriggered: 0,
          altarsFired: 0,
          altarCheckpoints,
          nextFiftyFifty: false,
          focusRemaining: 0,
          nextDouble: false,
          startTime,
          ended: false,
        };
        window.arcadeStats = { total: 0, correct: 0, startTime, questionsPerMage: count };

        window.audioManager.playBgm("audio/bgm/arcade.mp3");

        let timerEl = document.querySelector(".ArcadeTimer");
        if (!timerEl) {
          timerEl = document.createElement("div");
          timerEl.classList.add("ArcadeTimer");
          document.querySelector(".game-container").appendChild(timerEl);
        }
        timerEl.textContent = "0:00";
        clearInterval(window.arcadeTimerInterval);
        window.arcadeTimerInterval = setInterval(() => {
          const elapsed = Date.now() - window.arcadeRun.startTime;
          const m = Math.floor(elapsed / 60000);
          const s = Math.floor((elapsed % 60000) / 1000);
          timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
        }, 1000);

        if (window.arcadeHUD) {
          window.arcadeHUD.show(document.querySelector(".game-container"));
        }

        resolve();
      },
    });
    popup.init(document.querySelector(".game-container"));
  }

  _computePoints(dificuldade, timeMs) {
    const run = window.arcadeRun;
    let pts = 1;
    const tier = parseInt(dificuldade) || 1;
    pts += (tier - 1);

    let timeBonus = 0;
    if (timeMs < 10000) timeBonus = 2;
    else if (timeMs < 20000) timeBonus = 1;
    if (run.focusRemaining > 0) timeBonus *= 2;
    pts += timeBonus;

    pts += Math.min(3, Math.floor(run.streak / 3));

    return pts;
  }

  _computeMultiplier(streak) {
    return Math.min(3.0, 1.0 + Math.min(streak, 20) * 0.1);
  }

  // Recompensa por streak: a cada 5 acertos seguidos.
  // Prioridade: restaurar tentativa perdida → ganhar tentativa máxima (até 5) → ganhar revisão grátis.
  _grantStreakReward() {
    const run = window.arcadeRun;
    let rewardLabel = null;
    if (run.lives < run.maxLives) {
      run.lives++;
      rewardLabel = "🔥 5 acertos! +1 ◆ tentativa restaurada";
    } else if (run.maxLives < 5) {
      run.maxLives++;
      run.lives++;
      rewardLabel = "🔥 5 acertos! +1 ◆ tentativa máxima";
    } else {
      run.freeAnswers++;
      rewardLabel = "🔥 5 acertos! +1 📘 revisão grátis";
    }
    if (window.arcadeHUD) {
      window.arcadeHUD.refresh();
      window.arcadeHUD.showRewardToast(rewardLabel);
    }
  }

  arcadeBattle(resolve) {
    const idAssunto = this.event.idAssunto || null;
    const run = window.arcadeRun;
    if (!run || run.ended) { resolve(); return; }

    window.audioManager.playBgm("audio/bgm/battle.mp3");
    if (window.arcadeHUD) {
      window.arcadeHUD.setEtapa(run.totalQuestions);
      window.arcadeHUD.updateEtapa(run.questionsAnswered, run.totalQuestions);
      window.arcadeHUD.refresh();
    }

    const finishBattle = (defeated) => {
      if (window.arcadeHUD) window.arcadeHUD.hideEtapa();
      window.audioManager.playBgm("audio/bgm/arcade.mp3");
      run.lastBattleDefeated = defeated;
      resolve();
    };

    const runNext = () => {
      if (run.ended) { finishBattle(false); return; }
      // Acabou as questões — gincana concluída com sucesso
      if (run.questionsAnswered >= run.totalQuestions) {
        finishBattle(true);
        return;
      }

      // Altares de apoio em checkpoints equilibrados (1 a 3 por run, conforme tamanho)
      if (run.altarsFired < run.altarCheckpoints.length &&
          run.questionsAnswered >= run.altarCheckpoints[run.altarsFired] &&
          run.questionsAnswered > 0) {
        run.altarsFired++;
        this._showBuffAltar(() => runNext());
        return;
      }

      const dificuldade = this.event.dificuldade || window.playerState.getDifficultyForAssunto(idAssunto);
      const campanha = window.progress?.campanha || "fundamental";

      const useFifty = !!run.nextFiftyFifty;
      run.nextFiftyFifty = false;

      const quizGame = new QuizGame({
        idAssunto,
        dificuldade,
        campanha,
        useFiftyFifty: useFifty,
        onComplete: (result) => {
          run.questionsAnswered++;

          if (!result || typeof result.isCorrect !== "boolean") {
            runNext();
            return;
          }

          window.playerState.adjustSkill(
            result.idAssunto,
            result.isCorrect,
            result.dificuldade,
            result.timeTaken
          );

          window.arcadeStats.total++;
          run.totalTimeMs += result.timeTaken || 0;

          if (result.isCorrect) {
            window.arcadeStats.correct++;
            run.totalCorrect++;
            run.streak++;
            if (run.streak > run.maxStreak) run.maxStreak = run.streak;

            const pts = this._computePoints(result.dificuldade, result.timeTaken || 99999);
            const mult = this._computeMultiplier(run.streak);
            let earned = Math.round(pts * mult);
            if (run.nextDouble) {
              earned *= 2;
              run.nextDouble = false;
              if (window.arcadeHUD) window.arcadeHUD.showRewardToast("✦ Nota Dupla: pontos dobrados!");
            }
            run.score += earned;

            // Recompensa por streak a cada 5 corretas
            const milestone = Math.floor(run.streak / 5);
            if (milestone > run.rewardsTriggered) {
              run.rewardsTriggered = milestone;
              this._grantStreakReward();
            }
          } else {
            run.totalWrong++;
            run.streak = 0;
            if (run.freeAnswers > 0) {
              run.freeAnswers--;
              if (window.arcadeHUD) window.arcadeHUD.showRewardToast("📘 Revisão absorveu o erro — tentativa preservada");
            } else {
              run.lives--;
            }
          }

          if (run.focusRemaining > 0) run.focusRemaining--;

          if (window.arcadeHUD) {
            window.arcadeHUD.updateEtapa(run.questionsAnswered, run.totalQuestions);
            window.arcadeHUD.refresh();
          }

          if (run.lives <= 0) {
            run.ended = true;
            if (window.arcadeHUD) window.arcadeHUD.hideEtapa();
            this._showRunEnd(false, () => {});
            return;
          }

          runNext();
        },
      });
      quizGame.init(document.querySelector(".game-container"));
    };

    runNext();
  }

  _showBuffAltar(callback) {
    const run = window.arcadeRun;
    const buffs = window.arcadeMeta.rollBuffs(["heart"]);
    const cards = buffs.map(b => `
      <div class="ArcadeAltar_card">
        <div class="ArcadeAltar_icon">${b.icon}</div>
        <div class="ArcadeAltar_label">${b.label}</div>
        <div class="ArcadeAltar_desc">${b.description}</div>
      </div>
    `).join("");

    const header = `Altar ${run.altarsFired} de ${run.altarCheckpoints.length}`;

    const popup = new PopupWindow({
      title: "🎓 Altar de Apoio",
      text:
        `<b>${header}</b><br><br>` +
        "Você chegou a um <b>checkpoint</b> da gincana. Escolha <b>1 dos 3 buffs</b> abaixo — a escolha vale pelo restante da run.<br><br>" +
        "Clique no botão correspondente ao buff que quer ativar:" +
        `<div class="ArcadeAltar_cards">${cards}</div>`,
      buttons: buffs.map(b => ({ label: `${b.icon} ${b.label}`, value: b.id })),
      onComplete: (value) => {
        this._applyBuff(value);
        callback();
      },
    });
    popup.init(document.querySelector(".game-container"));
  }

  _applyBuff(buffId) {
    const run = window.arcadeRun;
    const def = window.arcadeMeta.BUFF_POOL.find(b => b.id === buffId);
    switch (buffId) {
      case "heart":
        if (run.lives < run.maxLives) run.lives++;
        else if (run.maxLives < 5) { run.maxLives++; run.lives++; }
        else run.freeAnswers++;
        break;
      case "shield":
        run.freeAnswers++;
        break;
      case "fifty":
        run.nextFiftyFifty = true;
        break;
      case "focus":
        run.focusRemaining = 3;
        break;
      case "fury":
        run.nextDouble = true;
        break;
    }
    if (window.arcadeHUD) {
      window.arcadeHUD.refresh();
      if (def) window.arcadeHUD.showRewardToast(`✅ Buff ativo: ${def.icon} ${def.label}`);
    }
  }

  arcadeCheckEnd(resolve) {
    const run = window.arcadeRun;
    if (!run) { resolve(); return; }

    const allDone = run.questionsAnswered >= run.totalQuestions;
    const dead = run.lives <= 0;

    if (!allDone && !dead) { resolve(); return; }

    this._showRunEnd(allDone, resolve);
  }

  async _showRunEnd(victory, resolve) {
    const run = window.arcadeRun;
    clearInterval(window.arcadeTimerInterval);
    window.audioManager.stopBgm();

    const elapsedMs = Date.now() - run.startTime;
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const timeStr = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    const total = run.totalCorrect + run.totalWrong;
    const pct = total > 0 ? Math.round((run.totalCorrect / total) * 100) : 0;
    const avgTimeMs = total > 0 ? Math.round(run.totalTimeMs / total) : 0;

    const runResult = {
      victory,
      score: run.score,
      correct: run.totalCorrect,
      total,
      timeStr,
      elapsedMs,
      magosDefeated: victory ? 1 : 0,
      lives: run.lives,
      maxLives: run.maxLives,
      maxStreak: run.maxStreak,
      questionsPerMage: run.totalQuestions,
      avgTimeMs,
    };

    const meta = await window.arcadeMeta.recordRun(runResult);

    const medalsHtml = meta.medalsEarned.length
      ? `<div class="ArcadeRunEnd_medals">${meta.medalsEarned.map(m =>
          `<span class="ArcadeRunEnd_medal">${m.icon} ${m.label}</span>`).join("")}</div>`
      : "";

    const rankLineAfter = meta.rankAfter;
    const rankLabel = meta.rankedUp
      ? `<b style="color:#88ff99">${rankLineAfter.name}</b> ⬆`
      : `<b>${rankLineAfter.name}</b>`;

    const titleStr = victory ? "Aprovado!" : "Reprovado...";
    const subtitle = victory
      ? "Você completou todas as questões da gincana!"
      : "Suas tentativas acabaram. Revise o conteúdo e tente de novo.";

    let persistenceWarning = "";
    if (meta.reason === "local") {
      persistenceWarning = `<div style="font-size:8px;color:#66ddff;text-align:center;margin-top:6px;border:1px solid #66ddff;padding:4px;">ℹ Modo <b>convidado</b>: progresso salvo neste navegador. Faça login para guardar na nuvem e ver seu ranking.</div>`;
    } else if (meta.reason === "api-error") {
      persistenceWarning = `<div style="font-size:8px;color:#ff5577;text-align:center;margin-top:6px;border:1px solid #ff5577;padding:4px;">⚠ <b>Falha ao contatar o servidor</b>. Esta prova não foi salva. Verifique sua conexão.</div>`;
    } else if (meta.reason === "local-error") {
      persistenceWarning = `<div style="font-size:8px;color:#ff5577;text-align:center;margin-top:6px;border:1px solid #ff5577;padding:4px;">⚠ Não foi possível salvar localmente (armazenamento cheio/bloqueado).</div>`;
    }

    const html = `
      ${subtitle}
      <div class="ArcadeRunEnd_grid">
        <div><b>Pontos:</b> ${run.score}</div>
        <div><b>Acertos:</b> ${run.totalCorrect}/${total} (${pct}%)</div>
        <div><b>Tentativas:</b> ${run.lives}/${run.maxLives}</div>
        <div><b>Streak máx:</b> ${run.maxStreak}</div>
        <div><b>Tempo:</b> ${timeStr}</div>
        <div><b>Méd/quest:</b> ${(avgTimeMs/1000).toFixed(1)}s</div>
      </div>
      ${medalsHtml}
      <div style="font-size:9px;text-align:center">+${meta.xpGained} XP</div>
      <div class="ArcadeRunEnd_xpBar"><div class="ArcadeRunEnd_xpFill" data-xpfill></div></div>
      <div class="ArcadeRunEnd_xpLabel">Rank: ${rankLabel}</div>
      ${persistenceWarning}
    `;

    const popup = new PopupWindow({
      title: titleStr,
      text: html,
      buttons: [
        { label: "Jogar novamente", value: "replay" },
        { label: "Voltar ao menu",  value: "menu" },
      ],
      onComplete: (value) => {
        if (window.arcadeHUD) window.arcadeHUD.hide();
        const oldTimer = document.querySelector(".ArcadeTimer");
        if (oldTimer) oldTimer.remove();

        if (value === "replay") {
          delete window.playerState.storyFlags["ARCADE_DUELO_COMPLETO"];
          window.arcadeRun = null;
          window.arcadeStats = null;
          this.map.overworld.startMap(window.OverworldMaps["Auditorio_M"]);
          this.map.overworld.startGameLoop();
          resolve();
        } else {
          location.reload();
        }
      },
    });
    popup.init(document.querySelector(".game-container"));

    setTimeout(() => {
      const fill = document.querySelector("[data-xpfill]");
      if (fill) {
        const pct = Math.round(meta.rankAfter.progress * 100);
        fill.style.width = pct + "%";
      }
    }, 100);
  }

  // Compat
  arcadeQuiz(resolve) { this.arcadeBattle(resolve); }
  arcadeComplete(resolve) { this.arcadeCheckEnd(resolve); }
  arcadeAltar(resolve) { resolve(); }

  pause(resolve){
    console.log("JOGO PAUSADO!");
    this.map.isPaused = true;
    const menu = new PauseMenu({
      progress: this.map.overworld.progress,
      onComplete: () => {
        resolve();
        this.map.isPaused = false;
        this.map.overworld.startGameLoop();
      }
    });
    menu.init(document.querySelector(".game-container"));
  }

  init() {
    return new Promise(resolve => {
      (() => this[this.event.type](resolve))();
    });
  }
}
