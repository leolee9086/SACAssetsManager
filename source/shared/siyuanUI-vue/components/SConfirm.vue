<template>
  <SDialog 
    :title="title" 
    :width="width" 
    :disable-close="disableClose"
    @close="onCancel"
    ref="dialogRef"
  >
    <div class="b3-dialog__content">{{ message }}</div>
    <template #action>
      <button 
        v-if="showCancel" 
        class="b3-button b3-button--cancel" 
        @click="onCancel"
      >
        {{ cancelText }}
      </button>
      <div class="fn__space"></div>
      <button 
        class="b3-button" 
        :class="{'b3-button--text': textConfirm, 'b3-button--primary': !textConfirm}" 
        @click="onConfirm"
      >
        {{ confirmText }}
      </button>
    </template>
  </SDialog>
</template>

<script setup>
import { ref } from 'vue';
import SDialog from './SDialog.vue';

const props = defineProps({
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  width: {
    type: String,
    default: '520px'
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  disableClose: {
    type: Boolean,
    default: false
  },
  textConfirm: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['confirm', 'cancel']);
const dialogRef = ref(null);

const onConfirm = () => {
  emit('confirm');
  dialogRef.value.close();
};

const onCancel = () => {
  emit('cancel');
  dialogRef.value.close();
};
</script> 