 // 简化 ErrorBoundary 组件定义
 import { defineComponent } from "../../../../../static/vue.esm-browser.js";
 export const ErrorBoundary = defineComponent({
  name: 'ErrorBoundary',
  emits: ['error'],  // 明确声明事件
  setup(props, { slots, emit }) {
    const handleError = (err) => {
      console.error('Component Error:', err);
      emit('error', err);
      return false;
    };

    return {
      handleError,
    };
  },
  render() {
    return this.$slots.default?.();
  },
  errorCaptured(err, instance, info) {
    return this.handleError(err);
  }
});

