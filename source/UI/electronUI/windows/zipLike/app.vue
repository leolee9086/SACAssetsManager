<template>
  <div class="zip-viewer">
    <div class="file-picker">
      <button @click="openFileDialog" class="open-button">选择ZIP文件</button>
      <span v-if="currentFile">当前文件: {{ currentFile }}</span>
      <input type="file" ref="fileInput" @change="handleFileChange" accept=".zip,.rar,.7z" style="display:none" />
    </div>
    
    <div class="file-list" v-if="files.length > 0">
      <h3>文件列表 ({{ files.length }} 个文件)</h3>
      <div class="list-container">
        <div v-for="file in files" :key="file.name" class="file-item">
          <span class="file-icon">📄</span>
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
          <button @click="extractFile(file)" class="extract-button">提取</button>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <p>请选择一个ZIP文件以查看其内容</p>
    </div>
  </div>
</template>

<script>
// 从项目中导入JSZip
import('../../../../../static/jszip.js').then(module => {
  window.JSZip = module.default || module;
}).catch(error => {
  console.error('加载JSZip库失败:', error);
});

export default {
  data() {
    return {
      files: [],
      currentFile: '',
      JSZip: null
    };
  },
  mounted() {
    // 如果提供了文件路径，则自动加载
    if (window.imagePath) {
      this.loadZipFromPath(window.imagePath);
    }
  },
  methods: {
    openFileDialog() {
      this.$refs.fileInput.click();
    },
    async handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.currentFile = file.name;
        await this.processZipFile(file);
      }
    },
    async loadZipFromPath(filePath) {
      try {
        if (!filePath) return;
        
        const fs = window.require('fs');
        const path = window.require('path');
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          console.error('文件不存在:', filePath);
          return;
        }
        
        this.currentFile = path.basename(filePath);
        const fileData = fs.readFileSync(filePath);
        const buffer = Buffer.from(fileData);
        
        await this.processZipFile(buffer);
      } catch (error) {
        console.error('加载ZIP文件失败:', error);
      }
    },
    async processZipFile(fileOrBuffer) {
      try {
        // 确保JSZip已加载
        if (!window.JSZip) {
          console.warn('等待JSZip库加载...');
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!window.JSZip) {
            throw new Error('JSZip库未加载');
          }
        }
        
        const zip = new window.JSZip();
        const content = await zip.loadAsync(fileOrBuffer);
        
        this.files = Object.keys(content.files)
          .filter(name => !content.files[name].dir)  // 过滤掉目录
          .map(fileName => ({
            name: fileName,
            size: content.files[fileName]._data ? content.files[fileName]._data.uncompressedSize : 0,
            ref: content.files[fileName]
          }));
      } catch (error) {
        console.error('处理ZIP文件失败:', error);
      }
    },
    async extractFile(file) {
      try {
        const content = await file.ref.async('nodebuffer');
        
        const fs = window.require('fs');
        const path = window.require('path');
        const { dialog } = window.require('@electron/remote');
        
        const result = await dialog.showSaveDialog({
          title: '保存文件',
          defaultPath: file.name
        });
        
        if (!result.canceled && result.filePath) {
          fs.writeFileSync(result.filePath, content);
          alert(`文件已保存到 ${result.filePath}`);
        }
      } catch (error) {
        console.error('提取文件失败:', error);
      }
    },
    formatSize(size) {
      if (size < 1024) return size + ' B';
      if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
      return (size / (1024 * 1024)).toFixed(2) + ' MB';
    }
  }
};
</script>

<style scoped>
.zip-viewer {
  padding: 20px;
  font-family: var(--b3-font-family);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-picker {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.open-button {
  padding: 8px 16px;
  background-color: var(--b3-theme-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.file-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-container {
  overflow-y: auto;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  padding: 10px;
  flex: 1;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--b3-border-color);
}

.file-item:last-child {
  border-bottom: none;
}

.file-icon {
  margin-right: 10px;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  margin: 0 10px;
  color: var(--b3-theme-on-surface-light);
}

.extract-button {
  padding: 4px 8px;
  background-color: var(--b3-theme-background-light);
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  cursor: pointer;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  color: var(--b3-theme-on-surface-light);
}
</style>
