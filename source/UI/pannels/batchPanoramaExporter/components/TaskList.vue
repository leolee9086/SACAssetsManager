<template>
  <div class="tasks-section">
    <div class="section-header">
      <h3>批处理任务</h3>
      <div class="header-actions">
        <button class="action-btn primary" 
                @click="$emit('start-export')" 
                :disabled="!canStartExport || isExporting">
          <i class="icon">🚀</i>
          {{ isExporting ? '导出中...' : '开始批量导出' }}
        </button>
      </div>
    </div>
    
    <div class="tasks-container">
      <div v-if="tasks.length === 0" class="empty-tip">
        任务列表为空。设置导出选项后点击"开始批量导出"
      </div>
      <div v-else class="task-list">
        <div v-for="(task, index) in tasks" :key="index" 
             class="task-item" 
             :class="{'task-completed': task.status === 'completed', 'task-error': task.status === 'error'}">
          <div class="task-info">
            <div class="task-name">
              <span class="file-name">{{ task.fileName }}</span>
              <span v-if="task.profileIndex !== undefined" class="profile-badge">配置 #{{ task.profileIndex + 1 }}</span>
            </div>
            <div class="task-status">{{ getTaskStatusText(task) }}</div>
          </div>
          <div class="task-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{width: `${task.progress * 100}%`}"></div>
            </div>
            <div class="progress-details">
              <div class="progress-value">{{ Math.round(task.progress * 100) }}%</div>
              <div v-if="task.stage" class="stage-info">
                {{ task.stage }} 
                <span v-if="task.currentFrame && task.totalFrames">
                  ({{ task.currentFrame }}/{{ task.totalFrames }} 帧)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="isExporting" class="overall-progress">
      <div class="progress-info">
        <div>总体进度：{{ Math.round(overallProgress * 100) }}%</div>
        <div>已完成：{{ completedCount }}/{{ totalCount }}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{width: `${overallProgress * 100}%`}"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import { getTaskStatusText } from '../utils/common.js';

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  },
  isExporting: {
    type: Boolean,
    default: false
  },
  canStartExport: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['start-export']);

// 计算总体进度
const overallProgress = computed(() => {
  if (props.tasks.length === 0) return 0;
  
  const totalProgress = props.tasks.reduce((sum, task) => sum + task.progress, 0);
  return totalProgress / props.tasks.length;
});

// 计算已完成任务数
const completedCount = computed(() => {
  return props.tasks.filter(task => task.status === 'completed').length;
});

// 计算总任务数
const totalCount = computed(() => {
  return props.tasks.length;
});
</script>

<style scoped>
.tasks-section {
  background: var(--cc-theme-surface);
  border-radius: 8px;
  border: 1px solid var(--cc-border-color);
}

.section-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--cc-border-color);
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  background: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.action-btn:hover {
  background: var(--cc-theme-surface-hover);
}

.action-btn.primary {
  background: var(--cc-theme-primary);
  color: white;
  border-color: var(--cc-theme-primary);
}

.action-btn.primary:hover {
  background: var(--cc-theme-primary-hover);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tasks-container {
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-tip {
  padding: 32px;
  text-align: center;
  color: var(--cc-theme-on-surface-variant);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  padding: 12px;
  border-radius: 4px;
  background: var(--cc-theme-surface-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item.task-completed {
  border-left: 3px solid var(--cc-theme-success);
}

.task-item.task-error {
  border-left: 3px solid var(--cc-theme-error);
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-badge {
  font-size: 12px;
  padding: 2px 6px;
  background-color: var(--cc-theme-secondary);
  color: white;
  border-radius: 10px;
}

.task-status {
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
}

.progress-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: var(--cc-theme-primary);
  border-radius: 4px;
  transition: width 0.3s linear;
}

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.progress-value {
  font-weight: 500;
}

.stage-info {
  color: var(--cc-theme-on-surface-variant);
}

.overall-progress {
  padding: 16px;
  border-top: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.icon {
  display: inline-block;
  width: 20px;
  text-align: center;
}
</style> 