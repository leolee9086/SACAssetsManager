<template>
  <div 
    class="toolbar__item" 
    :class="[
      active ? 'toolbar__item--active' : '',
      disabled ? 'toolbar__item--disabled' : '',
      customClass
    ]"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <slot name="icon">
      <s-icon v-if="icon" :name="icon"></s-icon>
    </slot>
    <span v-if="$slots.default" class="toolbar__text">
      <slot></slot>
    </span>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  customClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['click']);

const handleClick = (event) => {
  if (!props.disabled) {
    emit('click', event);
  }
};
</script> 