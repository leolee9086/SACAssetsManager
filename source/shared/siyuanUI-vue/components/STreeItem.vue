<template>
  <div 
    class="b3-list-item" 
    :data-node-id="item.id"
    @click="handleClick"
    @contextmenu="handleRightClick"
  >
    <div class="b3-list-item__toggle" v-if="item.children && item.children.length">
      <svg><use xlink:href="#iconRight"></use></svg>
    </div>
    <div class="b3-list-item__text">
      <div class="b3-list-item__first">
        <svg v-if="item.icon" class="b3-list-item__graphic"><use :xlink:href="`#icon${item.icon}`"></use></svg>
        <span>{{ item.name }}</span>
      </div>
    </div>
    <span class="b3-list-item__action" v-if="hasAction">
      <svg><use xlink:href="#iconMore"></use></svg>
    </span>
  </div>
  <div class="b3-list-item__children" v-if="expanded && item.children && item.children.length">
    <s-tree-item
      v-for="child in item.children"
      :key="child.id"
      :item="child"
      @click="onChildClick"
      @right-click="onChildRightClick"
      @ctrl-click="onChildCtrlClick"
      @alt-click="onChildAltClick"
      @shift-click="onChildShiftClick"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  hasAction: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['click', 'right-click', 'ctrl-click', 'alt-click', 'shift-click']);

const expanded = ref(false);

const handleClick = (event) => {
  const isToggle = event.target.closest('.b3-list-item__toggle');
  if (isToggle) {
    expanded.value = !expanded.value;
    return;
  }
  
  // 检测各种组合键点击
  if (event.ctrlKey) {
    emit('ctrl-click', event.currentTarget, event);
  } else if (event.altKey) {
    emit('alt-click', event.currentTarget, event);
  } else if (event.shiftKey) {
    emit('shift-click', event.currentTarget, event);
  } else {
    emit('click', event.currentTarget, event);
  }
};

const handleRightClick = (event) => {
  event.preventDefault();
  emit('right-click', event.currentTarget, event);
};

// 转发子项的事件
const onChildClick = (element, event) => {
  emit('click', element, event);
};

const onChildRightClick = (element, event) => {
  emit('right-click', element, event);
};

const onChildCtrlClick = (element, event) => {
  emit('ctrl-click', element, event);
};

const onChildAltClick = (element, event) => {
  emit('alt-click', element, event);
};

const onChildShiftClick = (element, event) => {
  emit('shift-click', element, event);
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 