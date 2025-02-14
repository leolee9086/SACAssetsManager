<template>
  <div class="test-runner">
    <button @click="selectFile" class="select-btn">
      选择测试文件
    </button>

    <div v-if="selectedFile" class="file-info">
      当前文件: {{ selectedFile }}
    </div>

    <div v-if="testProgress" class="progress">
      测试进度: {{ testProgress }}
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { TestGenerator } from './testGenerator.js'

const remote = window.require('@electron/remote')
const testGenerator = new TestGenerator()
const selectedFile = ref('')
const testProgress = ref('')
const error = ref('')

// 设置事件监听
testGenerator.getEmitter().on('progress', (progress) => {
  testProgress.value = progress
})

testGenerator.getEmitter().on('error', (err) => {
  error.value = `测试执行错误: ${err}`
})

const runTest = async (filePath) => {
  try {
    // 先生成测试文件
    await testGenerator.generateTest(
      filePath,
      window.siyuan?.config?.ai?.openAI || {
        endpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-3.5-turbo'
      }
    )
    
    // 然后运行测试
    await testGenerator.runTest(filePath)
  } catch (err) {
    error.value = err.message
  }
}

// 监听测试事件
testGenerator.getEmitter().on('test-start', (msg) => {
  testProgress.value = msg
})

testGenerator.getEmitter().on('test-case', (msg) => {
  testProgress.value = `正在测试: ${msg}`
})

testGenerator.getEmitter().on('test-pass', (msg) => {
  testProgress.value = `通过: ${msg}`
})

testGenerator.getEmitter().on('test-fail', (msg) => {
  error.value = `失败: ${msg}`
})

testGenerator.getEmitter().on('test-end', (msg) => {
  testProgress.value = msg
})

const selectFile = async () => {
  try {
    const result = await remote.dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'JavaScript', extensions: ['js'] }
      ]
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      selectedFile.value = filePath
      
      if (testGenerator.checkTestFileExists(filePath)) {
        error.value = '测试文件已存在'
        testProgress.value = ''
      } else {
        error.value = ''
        runTest(filePath)
      }
    }
  } catch (err) {
    error.value = `选择文件时发生错误: ${err.message}`
  }
}
</script>

<style scoped>
.test-runner {
  padding: 20px;
}

.select-btn {
  margin-bottom: 15px;
}

.file-info {
  margin-bottom: 10px;
}

.progress {
  color: #2c3e50;
}

.error {
  color: #dc3545;
  margin-top: 10px;
}
</style>
