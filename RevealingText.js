class RevealingText {
  constructor(config) {
    this.element = config.element;
    this.text = config.text || "";
    this.speed = config.speed || 15;

    this.timeout = null;
    this.isDone = false;
    this._clickHandler = null;
  }

  revealOneCharacter(list) {
    const next = list.splice(0, 1)[0];
    next.span.classList.add("revealed");

    if (list.length > 0) {
      this.timeout = setTimeout(() => {
        this.revealOneCharacter(list);
      }, next.delayAfter);
    } else {
      this.isDone = true;
      this._removeClickHandler();
    }
  }

  warpToDone() {
    clearTimeout(this.timeout);
    this.isDone = true;
    this.element.querySelectorAll("span").forEach(s => {
      s.classList.add("revealed");
    });
    this._removeClickHandler();
  }

  _removeClickHandler() {
    if (this._clickHandler) {
      this.element.removeEventListener("click", this._clickHandler);
      this.element.style.cursor = "";
      this._clickHandler = null;
    }
  }

  init() {
    let characters = [];
    const safeText = this.text || "";

    safeText.split("").forEach(character => {
      let span = document.createElement("span");
      span.textContent = character;
      this.element.appendChild(span);

      characters.push({
        span,
        delayAfter: character === " " ? 0 : this.speed
      });
    });

    // Clicar no texto pula o reveal e mostra tudo de uma vez.
    this._clickHandler = () => this.warpToDone();
    this.element.addEventListener("click", this._clickHandler);
    this.element.style.cursor = "pointer";

    this.revealOneCharacter(characters);
  }
}
