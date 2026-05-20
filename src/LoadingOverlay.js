// src/LoadingOverlay.js
// Overlay global com spinner + mensagem contextual. Contador de referências
// para suportar chamadas concorrentes (ex.: dois saves em paralelo).
//
// API:
//   window.loadingOverlay.show("Salvando…")    → mostra (incrementa ref count)
//   window.loadingOverlay.hide()                → decrementa; some quando bate 0
//   window.loadingOverlay.setLabel("Carregando questão…")
//   window.loadingOverlay.reset()               → força hide imediato

class LoadingOverlay {
  constructor() {
    this.element = null;
    this.label = null;
    this.refCount = 0;
  }

  _ensure() {
    if (this.element && document.body.contains(this.element)) return;
    this.element = document.createElement('div');
    this.element.className = 'LoadingOverlay';
    this.element.innerHTML = `
      <div class="LoadingOverlay_box">
        <div class="LoadingOverlay_spinner"></div>
        <div class="LoadingOverlay_label">Carregando…</div>
      </div>
    `;
    if (document.body) {
      document.body.appendChild(this.element);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.element);
      }, { once: true });
    }
    this.label = this.element.querySelector('.LoadingOverlay_label');
  }

  show(text) {
    this._ensure();
    if (text) this.setLabel(text);
    this.refCount += 1;
    this.element.classList.add('LoadingOverlay--visible');
  }

  hide() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0 && this.element) {
      this.element.classList.remove('LoadingOverlay--visible');
    }
  }

  setLabel(text) {
    this._ensure();
    if (this.label) this.label.textContent = text;
  }

  reset() {
    this.refCount = 0;
    if (this.element) this.element.classList.remove('LoadingOverlay--visible');
  }
}

window.loadingOverlay = new LoadingOverlay();
window.LoadingOverlay = LoadingOverlay;
