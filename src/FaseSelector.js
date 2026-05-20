// src/FaseSelector.js
// Tela de seleção de fases.
//
// Regra de escala (UX-D): vive FORA do canvas (document.body) por ser uma lista
// extensa com cards de texto que precisa de legibilidade em resolução nativa.
// Outras meta-telas (LoginForm, Toast, LoadingOverlay) seguem a mesma regra.
//
// API: `new FaseSelector({ onSelect, onCancel }).init()` — sem container.

class FaseSelector {
  constructor({ onSelect, onCancel, campanha = "fundamental" }) {
    this.onSelect = onSelect;
    this.onCancel = onCancel;
    this.campanha = campanha;
    this.element = null;
    this.escListener = null;
  }

  async init() {
    if (!window.api || !window.api.isLogged()) {
      if (window.toast) window.toast.warn("Entre para acessar a seleção de fases.");
      if (this.onCancel) this.onCancel();
      return;
    }

    this.element = document.createElement("div");
    this.element.className = "FaseSelector";
    this.element.innerHTML = `
      <div class="FaseSelector_inner">
        <div class="FaseSelector_header">
          <h2>Selecionar Fase</h2>
          <button class="FaseSelector_close" type="button" aria-label="Voltar">×</button>
        </div>
        <div class="FaseSelector_grid">
          <div class="FaseSelector_loading">Carregando fases…</div>
        </div>
      </div>
    `;
    document.body.appendChild(this.element);

    this.element.querySelector(".FaseSelector_close")
      .addEventListener("click", () => this._cancel());
    this.escListener = new window.KeyPressListener("Escape", () => this._cancel());

    try {
      const fases = await window.api.fetch(`/api/fases?campanha=${this.campanha}`);
      this._renderGrid(fases);
    } catch (err) {
      console.error("Falha ao carregar fases:", err);
      const grid = this.element.querySelector(".FaseSelector_grid");
      grid.innerHTML = `<div class="FaseSelector_error">Não foi possível carregar as fases.</div>`;
    }
  }

  _renderGrid(fases) {
    const grid = this.element.querySelector(".FaseSelector_grid");
    if (!fases.length) {
      grid.innerHTML = `<div class="FaseSelector_empty">Nenhuma fase disponível para esta campanha.</div>`;
      return;
    }
    grid.innerHTML = "";
    fases.forEach((fase) => {
      const card = document.createElement("button");
      card.type = "button";
      const status = fase.progresso.status;
      const isLocked = status === "bloqueada";
      const isDone = status === "concluida";
      card.className = `FaseSelector_card FaseSelector_card--${status}`;
      card.disabled = isLocked;

      const stars = "★★★".slice(0, fase.progresso.estrelas) + "☆☆☆".slice(0, 3 - fase.progresso.estrelas);

      card.innerHTML = `
        <div class="FaseSelector_cardTop">
          <span class="FaseSelector_cardOrdem">${fase.ordem}</span>
          <span class="FaseSelector_cardStatus">${this._statusLabel(status)}</span>
        </div>
        <div class="FaseSelector_cardName">${fase.nome}</div>
        <div class="FaseSelector_cardStars" data-stars="${fase.progresso.estrelas}">${stars}</div>
        <div class="FaseSelector_cardDesc">${fase.descricao || ""}</div>
        <div class="FaseSelector_cardReward">+${fase.recompensaXp} XP${isDone ? " (já obtido)" : ""}</div>
        ${isLocked ? `<div class="FaseSelector_cardLock">🔒 Conclua "${fase.preRequisitoCodigo}" primeiro</div>` : ""}
      `;

      if (!isLocked) {
        card.addEventListener("click", () => this._select(fase));
      }
      grid.appendChild(card);
    });
  }

  _statusLabel(status) {
    switch (status) {
      case "concluida":    return "Concluída";
      case "em_progresso": return "Em progresso";
      case "bloqueada":    return "Bloqueada";
      default:             return "Disponível";
    }
  }

  _select(fase) {
    this._teardown();
    if (this.onSelect) this.onSelect(fase);
  }

  _cancel() {
    this._teardown();
    if (this.onCancel) this.onCancel();
  }

  _teardown() {
    if (this.escListener) {
      this.escListener.unbind();
      this.escListener = null;
    }
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

window.FaseSelector = FaseSelector;
