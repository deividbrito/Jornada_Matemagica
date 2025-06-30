class OverworldEventRunner {
  constructor({ map, events }) {
    this.map = map;
    this.events = events;
  }

  async init() {
    for (let event of this.events) {
      const newEvent = new OverworldEvent({
        map: this.map,
        event
      });
      await newEvent.init();
    }
  }
}
