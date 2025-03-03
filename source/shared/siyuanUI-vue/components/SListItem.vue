<template>
  <li :class="['b3-list-item', {'b3-list-item--focus': focus}]" @click="$emit('click', $event)">
    <span v-if="selectable" class="b3-list-item__action" @click.stop="toggleSelect">
      <svg><use :xlink:href="`#icon${selected ? 'Check' : 'Uncheck'}`"></use></svg>
    </span>
    <span v-if="selectable" class="fn__space--small"></span>
    <slot name="prefix"></slot>
    <span class="b3-list-item__text" :title="title">{{ text }}</span>
    <span v-if="meta" class="b3-list-item__meta">{{ meta }}</span>
    <slot name="suffix"></slot>
  </li>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  meta: {
    type: String,
    default: ''
  },
  selectable: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  },
  focus: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click', 'select']);

const toggleSelect = (event) => {
  emit('select', !props.selected);
  event.stopPropagation();
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 