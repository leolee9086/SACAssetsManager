<template>
  <div class="task-dialog">
    <div class="progress-bar">
      <div class="progress" :style="{ width: progress + '%' }"></div>
    </div>
    <p>{{ taskDescription }}</p>
    <p>{{ currentMessage }}</p>
    <p>已完成: {{ completedTasks }} / {{ totalTasks }}</p>
    <div class="task-controls">
      <button @click="togglePause" :disabled="isCompleted">
        {{ isPaused ? '恢复' : '暂停' }}
      </button>
      <button @click="cancelTask" :disabled="isCompleted">
        {{ isCompleted ? '完成' : '取消任务' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, inject } from 'vue'

const appData = inject('appData')
const {
  taskTitle, taskDescription, taskController
} = appData

const progress = ref(0)
const completedTasks = ref(0)
const totalTasks = ref(0)
const currentMessage = ref('')
const isCompleted = computed(() => completedTasks.value === totalTasks.value && totalTasks.value > 0)

const updateProgress = () => {
  progress.value = taskController.getProgress()
}

const onTaskAdded = ({ totalTasks: newTotal }) => {
  totalTasks.value = newTotal
  updateProgress()
}
const isPaused = ref(false)

const togglePause = () => {
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    taskController.pause()
  } else {
    taskController.resume()
  }
}

const cancelTask = () => {
  if (!isCompleted.value) {
    taskController.destroy()
  }
  appData.$dialog.destroy()
}

const onTaskCompleted = ({ completedTasks: completed, totalTasks: total, result }) => {
  completedTasks.value = completed
  totalTasks.value = total
  console.log(result)
  if (result && result.message) {
    currentMessage.value = result.message
  }
  updateProgress()
}

const onAllTasksCompleted = () => {
  updateProgress()
}


onMounted(() => {
  taskController.on('taskAdded', onTaskAdded)
  taskController.on('taskCompleted', onTaskCompleted)
  taskController.on('allTasksCompleted', onAllTasksCompleted)
  taskController.on('paused', () => isPaused.value = true)
  taskController.on('resumed', () => isPaused.value = false)

  taskController.on('destoy', appData.$dialog.destroy
  )

  // 初始化进度
  totalTasks.value = taskController.totalTasks
  completedTasks.value = taskController.completedTasks
  updateProgress()
})

onUnmounted(() => {
  taskController.off('taskAdded', onTaskAdded)
  taskController.off('taskCompleted', onTaskCompleted)
  taskController.off('allTasksCompleted', onAllTasksCompleted)
  taskController.off('paused')
  taskController.off('resumed')

})

defineExpose({
  updateProgress
})
</script>

<style scoped>
.task-controls {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}
</style>