<template>
  <div class="fn__flex-1" :style="containerStyle">
    <s-tree-item
      v-for="item in items"
      :key="item.id"
      :item="item"
      @click="handleClick"
      @right-click="handleRightClick"
      @ctrl-click="handleCtrlClick"
      @alt-click="handleAltClick"
      @shift-click="handleShiftClick"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import STreeItem from './STreeItem.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  marginBottom: {
    type: [Number, String],
    default: 0
  }
});

const emit = defineEmits(['click', 'right-click', 'ctrl-click', 'alt-click', 'shift-click']);

const containerStyle = computed(() => {
  if (props.marginBottom) {
    return { marginBottom: typeof props.marginBottom === 'number' ? `${props.marginBottom}px` : props.marginBottom };
  }
  return {};
});

const handleClick = (element, event) => {
  emit('click', element, event);
};

const handleRightClick = (element, event) => {
  emit('right-click', element, event);
};

const handleCtrlClick = (element, event) => {
  emit('ctrl-click', element, event);
};

const handleAltClick = (element, event) => {
  emit('alt-click', element, event);
};

const handleShiftClick = (element, event) => {
  emit('shift-click', element, event);
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 