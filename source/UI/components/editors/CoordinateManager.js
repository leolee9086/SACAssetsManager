import { ref, onMounted, onUnmounted, nextTick } from '../../../../static/vue.esm-browser.js'

export function useFixedPosition(coordinateManager, initialOffset = { top: 20, left: 20 }) {
  const offset = ref({ ...initialOffset });

  const updatePosition = () => {
    const scroll = coordinateManager.getScrollOffset();
    offset.value = {
      top: initialOffset?.top + scroll.scrollTop,
      left: initialOffset?.left + scroll.scrollLeft,
      right: initialOffset?.left - scroll.scrollLeft

    };
  };

  onMounted(()=>nextTick(() => {
    coordinateManager.container.addEventListener('scroll', updatePosition);
    coordinateManager.container.addEventListener('wheel', updatePosition);

    updatePosition(); // 初始化位置
  }));

  onUnmounted(() => {
    coordinateManager.container.removeEventListener('scroll', updatePosition);
    coordinateManager.container.removeEventListener('wheel', updatePosition);

  });

  return offset;
}
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
