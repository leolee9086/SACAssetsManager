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
    constructor(container,cardsContainer) {
        this.container = container;
        this.parentElement = container.parentElement;
        this.cardsContainer =cardsContainer 
        // 添加鼠标位置追踪
        this.currentMousePosition = { x: 0, y: 0 };
        this.container.addEventListener('mousemove', this.updateMousePosition.bind(this));
    }

    updateMousePosition(event) {
        const relativePos = this.getRelativePosition(event);
        this.currentMousePosition = relativePos;
        this.updateContainerSize();
    }

    updateContainerSize() {
        const scroll = this.getScrollOffset();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // 计算需要的最小尺寸（当前鼠标位置 + 一个屏幕的尺寸）
        const requiredWidth = Math.max(
            this.currentMousePosition.x + screenWidth,
            scroll.clientWidth
        );
        const requiredHeight = Math.max(
            this.currentMousePosition.y + screenHeight,
            scroll.clientHeight
        );

        // 设置容器尺寸
        this.cardsContainer.style.width = `${requiredWidth}px`;
        this.cardsContainer.style.height = `${requiredHeight}px`;
    }

    getScrollOffset() {
        return {
            scrollLeft: this.cardsContainer.parentElement.scrollLeft || 0,
            scrollTop: this.cardsContainer.parentElement.scrollTop || 0,
            scrollWidth: this.cardsContainer.parentElement.scrollWidth || 0,
            scrollHeight: this.cardsContainer.parentElement.scrollHeight || 0,
            clientWidth: this.cardsContainer.parentElement.clientWidth || 0,
            clientHeight: this.cardsContainer.parentElement.clientHeight || 0
        };
    }

    getParentSize() {
        // 确保尺寸总是填满整个容器
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        return {
            width: Math.min(  screenWidth),
            height: Math.min(screenHeight)
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

    scrollTo(x, y) {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.scrollLeft = x;
            this.container.parentElement.scrollTop = y;
        }
    }
}
