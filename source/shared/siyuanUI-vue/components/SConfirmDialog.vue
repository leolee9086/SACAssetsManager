<template>
  <SDialog 
    :title="title" 
    :visible="visible" 
    :width="width"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @update:visible="$emit('update:visible', $event)"
  >
    {{ text }}
  </SDialog>
</template>

<script setup>
import { computed } from 'vue';
import SDialog from './SDialog.vue';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: ''
  },
  visible: {
    type: Boolean,
    default: false
  },
  width: {
    type: String,
    default: () => isMobile() ? '92vw' : '520px'
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  }
});

const emit = defineEmits(['confirm', 'cancel', 'update:visible']);

function isMobile() {
  return window.innerWidth <= 768;
}

const handleConfirm = () => {
  if (!props.text && !props.title) {
    emit('confirm');
    return;
  }
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};
</script> 