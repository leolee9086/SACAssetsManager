<template>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-message">{{ error.message ||altMessage }}</div>
        <div class="error-detail" v-if="error.stack">{{ error.stack }}</div>
    </div>
</template>
<script setup>
import { defineProps,toRef } from 'vue';
const props = defineProps(['error','altMessage'])
const error = toRef(props,'error')
const altMessage = toRef(props,'altMessage')
</script>
<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  height: 100%;
  color: var(--b3-card-error-color, #dc3545);
  background: var(--b3-card-error-background, rgba(220, 53, 69, 0.1));
  border-radius: 6px;
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-message {
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
  margin-bottom: 8px;
}

.error-detail {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
  max-height: 100px;
  overflow-y: auto;
  text-align: left;
  width: 100%;
  padding: 8px;
  background: var(--b3-theme-background);
  border-radius: 4px;
  white-space: pre-wrap;
}
</style>