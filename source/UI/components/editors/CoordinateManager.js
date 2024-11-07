export class CoordinateManager {
    constructor(container) {
        this.container = container;
    }

    getRelativePosition(event) {
        const rect = this.container.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
}
