<template>
  <div class="b3-dialog-container" v-if="visible">
    <div class="b3-dialog">
      <div class="b3-dialog__header">
        <div class="b3-dialog__title">{{ title }}</div>
        <button class="b3-dialog__close" @click="handleClose">
          <svg><use xlink:href="#iconClose"></use></svg>
        </button>
      </div>
      <div class="b3-dialog__content">
        <slot></slot>
      </div>
      <div class="b3-dialog__action" v-if="$slots.action">
        <slot name="action"></slot>
      </div>
      <div class="b3-dialog__action" v-else>
        <Sbutton :disabled="confirmDisabled" type="primary" @click="handleConfirm">{{ confirmText }}</Sbutton>
        <Sbutton @click="handleClose">{{ cancelText }}</Sbutton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import Sbutton from './Sbutton.vue';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  visible: {
    type: Boolean,
    default: false
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmDisabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'confirm', 'update:visible']);

const handleClose = () => {
  emit('close');
  emit('update:visible', false);
};

const handleConfirm = () => {
  if (!props.confirmDisabled) {
    emit('confirm');
    emit('update:visible', false);
  }
};

// 监听ESC键关闭对话框
const escHandler = (e) => {
  if (e.key === 'Escape' && props.visible) {
    handleClose();
  }
};

watch(() => props.visible, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', escHandler);
  } else {
    document.removeEventListener('keydown', escHandler);
  }
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 