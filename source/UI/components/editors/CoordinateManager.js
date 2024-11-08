export class CoordinateManager {
    constructor(container) {
        this.container = container;
        this.parentElement = container.parentElement;
    }

    getScrollOffset() {
        return {
            scrollLeft: this.container.scrollLeft || 0,
            scrollTop: this.container.scrollTop || 0,
            scrollWidth: this.container.scrollWidth || 0,
            scrollHeight: this.container.scrollHeight || 0,
            clientWidth: this.container.clientWidth || 0,
            clientHeight: this.container.clientHeight || 0
        };
    }

    getParentSize() {
        return {
            width: this.parentElement.scrollWidth,
            height: this.parentElement.scrollHeight
        };
    }

    getRelativePosition(event) {
        const rect = this.container.getBoundingClientRect();
        const scroll = this.getScrollOffset();
        return {
            x: event.clientX - rect.left + scroll.scrollLeft,
            y: event.clientY - rect.top + scroll.scrollTop
        };
    }
}
