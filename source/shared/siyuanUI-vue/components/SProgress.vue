<template>
  <div v-if="visible" class="s-progress" :style="{ zIndex }">
    <div class="b3-dialog__scrim" style="opacity: 1"></div>
    <div class="b3-dialog__loading">
      <div v-if="showProgress" style="text-align: right">{{ current }}/{{ total }}</div>
      <div style="margin: 8px 0;height: 8px;border-radius: var(--b3-border-radius);overflow: hidden;background-color:#fff;">
        <div v-if="showProgress" 
          :style="{ width: `${(current / total) * 100}%`, transition: 'var(--b3-transition)', backgroundColor: 'var(--b3-theme-primary)', height: '8px' }">
        </div>
        <div v-else
          style="background-color: var(--b3-theme-primary);height: 8px;background-image: linear-gradient(-45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.2) 75%, transparent 75%, transparent);animation: stripMove 450ms linear infinite;background-size: 50px 50px;">
        </div>
      </div>
      <div>{{ message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  zIndex: {
    type: Number,
    default: () => window.siyuan ? ++window.siyuan.zIndex : 999
  }
});

const visible = ref(false);
const showProgress = ref(false);
const current = ref(0);
const total = ref(0);
const message = ref('');

const showLoading = (msg) => {
  visible.value = true;
  showProgress.value = false;
  message.value = msg;
};

const updateProgress = (msg, curr, tot) => {
  visible.value = true;
  showProgress.value = true;
  message.value = msg;
  current.value = curr;
  total.value = tot;
};

const close = () => {
  visible.value = false;
};

defineExpose({
  showLoading,
  updateProgress,
  close
});
</script>

<style scoped>
.s-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

@keyframes stripMove {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 50px 50px;
  }
}
</style> 