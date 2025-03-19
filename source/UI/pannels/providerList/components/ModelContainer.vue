<template>
  <div class="model-container fn__flex-column" v-if="providerId">
    <div class="model-header">
      <h2>{{ providerName }}</h2>
    </div>
    <div class="fn__flex-column">
      <model-list :provider-id="providerId" class="provider-models" />
    </div>
  </div>
</template>

<script setup>
import ModelList from '../modelList.vue'

defineProps({
  providerId: {
    type: String,
    default: ''
  },
  providerName: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.model-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.provider-models {
  height: 100%;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.model-header h2 {
  font-size: 18px;
  margin: 0;
}
</style> 