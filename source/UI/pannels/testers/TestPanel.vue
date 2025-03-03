<template>
  <section class="test-panel">
    <div class="panel-header">
      <h2>{{ title }}</h2>
      <div class="panel-actions" v-if="$slots.actions">
        <slot name="actions"></slot>
      </div>
    </div>
    
    <div class="panel-content">
      <slot></slot>
    </div>
    
    <div class="panel-footer" v-if="$slots.footer">
      <slot name="footer"></slot>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  collapsed: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.test-panel {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.panel-header h2 {
  color: #0078d7;
  margin: 0;
}

.panel-content {
  margin-bottom: 15px;
}

.panel-footer {
  border-top: 1px solid #eee;
  padding-top: 15px;
  margin-top: 10px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .panel-actions {
    margin-top: 10px;
    width: 100%;
  }
}
</style> 