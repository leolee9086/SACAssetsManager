<template>
  <div class="b3-list">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="b3-list-item"
      :class="{ 
        'b3-list-item--focus': index === focusIndex,
        'b3-list-item--disabled': item.disabled 
      }"
      @click="handleClick(item, index)"
    >
      <div class="b3-list-item__graphic" v-if="item.icon || item.iconHtml">
        <svg v-if="item.icon"><use :xlink:href="`#${item.icon}`"></use></svg>
        <span v-else-if="item.iconHtml" v-html="item.iconHtml"></span>
      </div>
      <div class="b3-list-item__text">{{ item.text }}</div>
      <div class="b3-list-item__action" v-if="item.action">{{ item.action }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['item-click']);

const focusIndex = ref(-1);

const handleClick = (item, index) => {
  if (item.disabled) return;
  
  focusIndex.value = index;
  emit('item-click', item, index);
};
</script>

<style scoped>
.b3-list {
  padding: 4px 0;
}

.b3-list-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
}

.b3-list-item:hover {
  background-color: var(--b3-list-hover);
}

.b3-list-item--focus {
  background-color: var(--b3-list-hover);
}

.b3-list-item--disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.b3-list-item__graphic {
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.b3-list-item__text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.b3-list-item__action {
  color: var(--b3-theme-on-surface-light);
  font-size: 12px;
}
</style> 