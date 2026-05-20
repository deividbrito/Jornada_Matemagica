// src/Toast.js
// Stack de notificações no canto inferior direito.
// API simples e legacy-friendly:
//   window.toast.show("mensagem", "success" | "warn" | "error", durationMs?)
//   window.toast.success("...")
//   window.toast.warn("...")
//   window.toast.error("...")
//
// Cada chamada empilha um toast que desaparece sozinho. Múltiplos toasts
// coexistem (limite de 4 visíveis simultaneamente; o mais antigo é descartado).

class Toast {
  constructor() {
    this.container = null;
    this.maxVisible = 4;
    this._ensureContainer();
  }

  _ensureContainer() {
    if (this.container && document.body.contains(this.container)) return;
    this.container = document.createElement('div');
    this.container.className = 'ToastContainer';
    // body pode não existir se chamarem antes do DOM montar
    if (document.body) {
      document.body.appendChild(this.container);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.container);
      }, { once: true });
    }
  }

  show(message, level = 'info', durationMs = 4000) {
    this._ensureContainer();

    while (this.container.children.length >= this.maxVisible) {
      this.container.removeChild(this.container.firstChild);
    }

    const el = document.createElement('div');
    el.className = `Toast Toast--${level}`;
    el.setAttribute('role', level === 'error' ? 'alert' : 'status');
    el.textContent = message;
    this.container.appendChild(el);

    // Som só em erro: success/warn aparecem em fluxos comuns (saves, sync)
    // e ficariam barulhentos. Erro é raro e merece atenção.
    if (level === 'error' && window.audioManager) {
      window.audioManager.playSfx('wrong');
    }

    // Fade-in
    requestAnimationFrame(() => el.classList.add('Toast--visible'));

    // Auto-dismiss
    const timer = setTimeout(() => this._dismiss(el), durationMs);

    // Click → dismiss imediato
    el.addEventListener('click', () => {
      clearTimeout(timer);
      this._dismiss(el);
    }, { once: true });

    return el;
  }

  _dismiss(el) {
    if (!el || !el.parentNode) return;
    el.classList.remove('Toast--visible');
    el.classList.add('Toast--leaving');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  }

  success(message, durationMs) { return this.show(message, 'success', durationMs); }
  warn(message, durationMs)    { return this.show(message, 'warn', durationMs); }
  error(message, durationMs)   { return this.show(message, 'error', durationMs || 6000); }
}

window.toast = new Toast();
window.Toast = Toast;
