<template>
  <div class="output-settings">
    <div class="setting-item">
      <label>输出目录</label>
      <div class="output-path-selector">
        <input type="text" v-model="outputDirValue" readonly placeholder="点击选择输出目录" />
        <button class="action-btn" @click="selectOutputDir">
          <i class="icon">📁</i>
          选择
        </button>
      </div>
    </div>

    <div class="setting-item">
      <div class="checkbox-wrapper">
        <input type="checkbox" id="createSubDirs" v-model="createSubDirsValue">
        <label for="createSubDirs">为每个文件创建子目录</label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue';
import { showWarningMessage } from '../utils/fileUtils.js';

const props = defineProps({
  outputDir: {
    type: String,
    default: ''
  },
  createSubDirs: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:outputDir', 'update:createSubDirs']);

// 本地状态
const outputDirValue = ref(props.outputDir);
const createSubDirsValue = ref(props.createSubDirs);

// 监听属性变化
watch(() => props.outputDir, (newValue) => {
  outputDirValue.value = newValue;
});

watch(() => props.createSubDirs, (newValue) => {
  createSubDirsValue.value = newValue;
});

// 监听本地状态变化并发射事件
watch(outputDirValue, (newValue) => {
  emit('update:outputDir', newValue);
});

watch(createSubDirsValue, (newValue) => {
  emit('update:createSubDirs', newValue);
});

// 选择输出目录
const selectOutputDir = async () => {
  try {
    // 增强Electron环境检测
    const isElectronEnv = !!(window.electron || 
                           (window.require && window.require('electron')) || 
                           window.process?.versions?.electron);
    
    if (isElectronEnv) {
      // 确保获取electron对象
      const electron = window.electron || 
                      (window.require ? window.require('electron') : null);
      
      if (electron) {
        console.log('使用Electron API选择目录');
        // 使用Electron的对话框API
        try {
          const dialog = window.require('@electron/remote').dialog;
          const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: '选择输出目录'
          });
          
          if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            outputDirValue.value = result.filePaths[0];
            console.log('已选择目录:', outputDirValue.value);
            // 确保立即触发更新事件
            emit('update:outputDir', outputDirValue.value);
          }
          return;
        } catch (electronErr) {
          console.error('Electron对话框错误:', electronErr);
          // 如果Electron方法失败，回退到手动输入
        }
      }
    }
    
    // 回退到手动输入方式
    console.log('使用手动输入方式选择输出目录');
    
    // 创建一个输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = outputDirValue.value || '全景视频导出';
    input.style.width = '100%';
    input.style.padding = '10px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.marginBottom = '15px';
    
    // 创建一个按钮
    const button = document.createElement('button');
    button.textContent = '确定';
    button.style.padding = '8px 15px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    // 创建容器
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = 'rgba(0,0,0,0.5)';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.zIndex = '9998';
    
    const inputContainer = document.createElement('div');
    inputContainer.style.backgroundColor = 'white';
    inputContainer.style.padding = '25px';
    inputContainer.style.borderRadius = '8px';
    inputContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    inputContainer.style.width = '350px';
    inputContainer.style.maxWidth = '90%';
    
    const label = document.createElement('div');
    label.textContent = '请输入输出目录名称:';
    label.style.marginBottom = '15px';
    label.style.fontWeight = 'bold';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.appendChild(button);
    
    inputContainer.appendChild(label);
    inputContainer.appendChild(input);
    inputContainer.appendChild(buttonContainer);
    container.appendChild(inputContainer);
    
    document.body.appendChild(container);
    
    // 聚焦到输入框
    input.focus();
    
    return new Promise((resolve) => {
      // 点击确定按钮时
      button.onclick = () => {
        const value = input.value.trim();
        if (value) {
          outputDirValue.value = value;
          console.log('已设置输出目录:', outputDirValue.value);
          // 确保立即触发更新事件
          emit('update:outputDir', outputDirValue.value);
        } else {
          // 如果用户未输入，设置默认值
          outputDirValue.value = '全景视频导出';
          console.log('未输入目录名，使用默认值:', outputDirValue.value);
          // 确保立即触发更新事件
          emit('update:outputDir', outputDirValue.value);
        }
        document.body.removeChild(container);
        resolve();
      };
      
      // 点击背景时关闭
      container.onclick = (e) => {
        if (e.target === container) {
          document.body.removeChild(container);
          resolve();
        }
      };
      
      // 按ESC键关闭
      window.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
          document.body.removeChild(container);
          window.removeEventListener('keydown', handler);
          resolve();
        }
        if (e.key === 'Enter') {
          button.click();
          window.removeEventListener('keydown', handler);
        }
      });
    });
  } catch (error) {
    console.error('选择输出目录失败:', error);
    showWarningMessage(`选择输出目录失败: ${error.message}`);
    
    // 出错时设置默认值，确保不会阻塞流程
    if (!outputDirValue.value) {
      outputDirValue.value = '全景视频导出';
      console.log('设置默认输出目录:', outputDirValue.value);
      // 确保立即触发更新事件
      emit('update:outputDir', outputDirValue.value);
    }
  }
};
</script>

<style scoped>
.output-settings {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-size: 14px;
  font-weight: 500;
}

.output-path-selector {
  display: flex;
  gap: 8px;
}

.output-path-selector input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid var(--cc-border-color);
  background: var(--cc-theme-surface-light);
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

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  display: inline-block;
  width: 20px;
  text-align: center;
}
</style> 