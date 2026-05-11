class OverworldEventRunner {
  constructor({ map, events }) {
    this.map = map;
    this.events = events;
  }

  async init() {
    for (let event of this.events) {
      const newEvent = new window.OverworldEvent({
        map: this.map,
        event
      });
      await newEvent.init();
    }
  }
}

// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.OverworldEventRunner = OverworldEventRunner;
