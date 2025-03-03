<template>
  <button 
    class="b3-menu__item" 
    :class="{ 
      'b3-menu__item--current': current,
      'b3-menu__item--disabled': disabled 
    }"
    @click="handleClick"
  >
    <span class="b3-menu__icon" v-if="icon || iconHTML">
      <s-icon v-if="icon" :name="icon"></s-icon>
      <span v-else-if="iconHTML" v-html="iconHTML"></span>
    </span>
    <span class="b3-menu__label">{{ label }}</span>
    <span class="b3-menu__accelerator" v-if="accelerator">{{ accelerator }}</span>
    <span class="b3-menu__submenu" v-if="subMenuItems && subMenuItems.length">
      <s-icon name="Right"></s-icon>
    </span>
  </button>
  
  <div class="b3-menu__submenu" v-if="subMenuItems && subMenuItems.length && subMenuOpen">
    <s-menu-item 
      v-for="(item, index) in subMenuItems" 
      :key="index"
      v-bind="item"
    ></s-menu-item>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    default: ''
  },
  iconHTML: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    required: true
  },
  accelerator: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  current: {
    type: Boolean,
    default: false
  },
  subMenuItems: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['click']);
const subMenuOpen = ref(false);

const handleClick = (event) => {
  if (props.disabled) return;
  
  if (props.subMenuItems && props.subMenuItems.length) {
    subMenuOpen.value = !subMenuOpen.value;
  } else {
    emit('click', event);
  }
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 