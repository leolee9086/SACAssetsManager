<template>
  <div class="verdaccio-container">
    <iframe
      v-if="isServerRunning"
      src="http://localhost:4873"
      class="verdaccio-frame"
      frameborder="0"
    ></iframe>
    <div v-else class="loading-state">
      <span>正在启动 Verdaccio 服务器...</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'VerdaccioPanel',
  setup() {
    const isServerRunning = ref(false)

    const checkServerStatus = async () => {
      try {
        const response = await fetch('http://localhost:4873')
        isServerRunning.value = response.ok
      } catch (error) {
        isServerRunning.value = false
      }
    }

    onMounted(async () => {
      // 导入并启动服务器
      await import('./verdaccioServer/index.js')
      
      // 轮询检查服务器状态，直到启动成功
      const interval = setInterval(async () => {
        await checkServerStatus()
        if (isServerRunning.value) {
          clearInterval(interval)
        }
      }, 1000)
    })

    return {
      isServerRunning
    }
  }
}
</script>

<style scoped>
.verdaccio-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.verdaccio-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 16px;
  color: #666;
}
</style>
