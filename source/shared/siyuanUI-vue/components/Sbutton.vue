<template>
    <button 
      class="b3-button" 
      :class="[
        type ? `b3-button--${type}` : '',
        narrow ? 'b3-button--narrow' : '',
        disabled ? 'b3-button--disabled' : ''
      ]"
      @click="handleClick"
      :disabled="disabled"
    >
      <slot name="icon"></slot>
      <slot></slot>
    </button>
  </template>
  
  <script setup>
  const props = defineProps({
    type: {
      type: String,
      default: '',
      validator: (value) => ['', 'text', 'cancel', 'error', 'primary', 'outline'].includes(value)
    },
    narrow: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  });
  
  const emit = defineEmits(['click']);
  
  const handleClick = (event) => {
    if (!props.disabled) {
      emit('click', event);
    }
  };
  </script>
  
  <style scoped>
  /* 基础样式会从思源的CSS中继承 */
  /* 
  按钮类型说明:
  - 默认: b3-button (标准按钮)
  - b3-button--text: 文本风格按钮，用于确认操作
  - b3-button--cancel: 取消风格按钮
  - b3-button--error: 错误/警告风格按钮
  - b3-button--primary: 主要按钮风格
  - b3-button--narrow: 窄版按钮
  - b3-button--disabled: 禁用状态按钮
  */
  </style>