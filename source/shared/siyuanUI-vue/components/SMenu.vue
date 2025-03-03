<template>
  <div class="b3-menu" :class="{ 'fn__none': !visible }">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  fullscreen: {
    type: Boolean,
    default: false
  }
});

const menuStyle = computed(() => {
  if (props.fullscreen) {
    return {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0'
    };
  } else {
    return {
      position: 'absolute',
      top: `${props.position.y}px`,
      left: `${props.position.x}px`
    };
  }
});

const emit = defineEmits(['update:visible']);

// 关闭菜单方法
const close = () => {
  emit('update:visible', false);
};

// 显示菜单方法
const open = (position) => {
  emit('update:visible', true);
  
  // 在下一个渲染周期设置位置
  nextTick(() => {
    const menuElement = document.querySelector('.b3-menu');
    if (menuElement && position) {
      if (position.isLeft) {
        menuElement.style.right = `${window.innerWidth - position.x}px`;
      } else {
        menuElement.style.left = `${position.x}px`;
      }
      menuElement.style.top = `${position.y}px`;
    }
  });
};

// 向父组件暴露方法
defineExpose({
  close,
  open
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 