<template>
  <div class="electron-window-launcher">
    <div class="launcher-header">
      <h2>电子窗口工具</h2>
      <div class="search-box">
        <input type="text" v-model="searchQuery" placeholder="搜索窗口..." />
      </div>
    </div>
    
    <div class="window-grid">
      <div 
        v-for="window in filteredWindows" 
        :key="window.id" 
        class="window-card"
        @click="openWindow(window)"
      >
        <div class="window-icon">
          <svg><use :xlink:href="window.icon"></use></svg>
        </div>
        <div class="window-info">
          <div class="window-title">{{ window.title }}</div>
          <div class="window-desc">{{ window.description }}</div>
        </div>
      </div>
    </div>
    
    <div class="file-selector" v-if="showFileSelector">
      <div class="file-selector-header">
        <h3>选择文件（可选）</h3>
        <div class="file-selector-actions">
          <button class="direct-open-btn" @click="directOpen">直接打开</button>
          <button class="close-btn" @click="showFileSelector = false">关闭</button>
        </div>
      </div>
      <div class="file-list">
        <div v-if="fileList.length === 0" class="empty-list">
          没有找到符合条件的文件
        </div>
        <div 
          v-for="file in fileList" 
          :key="file.path" 
          class="file-item"
          @click="selectFile(file)"
        >
          <div class="file-icon">
            <svg v-if="isImageFile(file.name)"><use xlink:href="#iconImage"></use></svg>
            <svg v-else-if="isXmlFile(file.name)"><use xlink:href="#iconFile"></use></svg>
            <svg v-else><use xlink:href="#iconAttachment"></use></svg>
          </div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-size">{{ formatFileSize(file.size) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { plugin } from '../../../pluginSymbolRegistry.js';
import { 打开图片编辑器窗口, 打开图片画板窗口, 打开xbel窗口 } from '../../electronUI/windows/imageEditorPanel.js';
import { 以关键词匹配对象 } from '../../../utils/strings/search.js';

// 窗口列表
const windows = ref([
  {
    id: 'image-editor',
    title: '图片编辑器',
    description: '编辑图片、调整亮度、对比度、色彩等',
    icon: '#iconImage',
    type: 'imageEditor',
    requireFile: false,
    fileType: 'image'
  },
  {
    id: 'draw-board',
    title: '图片画板',
    description: '在图片上绘制和标注',
    icon: '#iconEdit',
    type: 'drawBoard',
    requireFile: false,
    fileType: 'image'
  },
  {
    id: 'xbel-editor',
    title: 'XBEL编辑器',
    description: '编辑XML书签交换语言文件',
    icon: '#iconFile',
    type: 'xbel',
    requireFile: false,
    fileType: 'xbel'
  }
]);

// 搜索
const searchQuery = ref('');
const filteredWindows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return windows.value;
  
  return windows.value.filter(window => 
    以关键词匹配对象(query, window, ['title', 'description'])
  );
});

// 文件选择器
const showFileSelector = ref(false);
const fileList = ref([]);
const selectedWindow = ref(null);

// 格式化文件大小
const formatFileSize = (size) => {
  if (size < 1024) {
    return size + ' B';
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB';
  } else {
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }
};

// 判断文件类型
const isImageFile = (filename) => /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename);
const isXmlFile = (filename) => /\.(xml|xbel)$/i.test(filename);

// 打开窗口
const openWindow = async (window) => {
  // 不再强制要求文件，而是显示一个包含"直接打开"选项的文件选择器
  selectedWindow.value = window;
  await loadFiles(window.fileType);
  showFileSelector.value = true;
};

// 加载文件列表
const loadFiles = async (fileType) => {
  try {
    // 使用Node.js的fs模块直接访问文件系统
    const fs = window.require('fs');
    const path = window.require('path');
    
    // 获取assets目录路径
    const assetsDir = path.join(window.siyuan.config.system.workspaceDir, 'data', 'assets');
    
    // 读取目录内容
    const files = fs.readdirSync(assetsDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => {
        const filePath = path.join(assetsDir, dirent.name);
        const stats = fs.statSync(filePath);
        return {
          name: dirent.name,
          path: filePath,
          size: stats.size,
          mtime: stats.mtime
        };
      });
    
    // 根据文件类型过滤
    if (fileType === 'image') {
      fileList.value = files.filter(file => isImageFile(file.name));
    } else if (fileType === 'xbel') {
      fileList.value = files.filter(file => isXmlFile(file.name));
    } else {
      fileList.value = files;
    }
    
    // 按修改时间排序（最新的在前面）
    fileList.value.sort((a, b) => b.mtime - a.mtime);
    
    // 如果没有文件，显示提示
    if (fileList.value.length === 0) {
      console.warn(`没有找到${fileType}类型的文件`);
    }
  } catch (error) {
    console.error('加载文件列表失败:', error);
    fileList.value = [];
  }
};

// 选择文件并启动窗口
const selectFile = (file) => {
  // 直接使用完整的文件系统路径
  launchWindow(selectedWindow.value, file.path);
  showFileSelector.value = false;
};

// 直接打开窗口（不选择文件）
const directOpen = () => {
  launchWindow(selectedWindow.value, '');
  showFileSelector.value = false;
};

// 启动指定类型的窗口
const launchWindow = (window, filePath) => {
  try {
    // 检查是否有文件路径，如果没有则传递空字符串
    const path = filePath || '';
    
    switch (window.type) {
      case 'imageEditor':
        打开图片编辑器窗口(path);
        break;
      case 'drawBoard':
        打开图片画板窗口(path);
        break;
      case 'xbel':
        打开xbel窗口(path);
        break;
      default:
        console.error('未知的窗口类型:', window.type);
    }
  } catch (error) {
    console.error(`打开窗口失败: ${error.message}`);
  }
};
</script>

<style>
.electron-window-launcher {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.launcher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.launcher-header h2 {
  margin: 0;
  font-size: 18px;
}

.search-box input {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--b3-border-color);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.window-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.window-card {
  display: flex;
  background: var(--b3-theme-surface);
  border-radius: 4px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.window-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.window-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.window-icon svg {
  width: 24px;
  height: 24px;
  color: var(--b3-theme-primary);
}

.window-info {
  flex: 1;
}

.window-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.window-desc {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.file-selector {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-height: 60%;
  background: var(--b3-theme-surface);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--b3-border-color);
}

.file-selector-header h3 {
  margin: 0;
}

.file-selector-actions {
  display: flex;
  gap: 8px;
}

.file-selector-header button {
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.direct-open-btn {
  background: var(--b3-theme-primary);
  color: white;
}

.close-btn {
  background: var(--b3-theme-surface-light);
  color: var(--b3-theme-on-surface);
}

.file-list {
  padding: 8px;
  overflow-y: auto;
  max-height: 300px;
}

.empty-list {
  padding: 20px;
  text-align: center;
  color: var(--b3-theme-on-surface-light);
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
}

.file-item:hover {
  background: var(--b3-theme-background-light);
}

.file-icon {
  margin-right: 12px;
}

.file-icon svg {
  width: 20px;
  height: 20px;
  color: var(--b3-theme-primary);
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.file-size {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}
</style> 