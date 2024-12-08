<template>
  <div class="cc-content-viewer">
    <!-- 简化的数据源选择面板 -->
    <div class="cc-source-panel">
      <div class="cc-button-group">
        <button class="cc-button" @click="showFileInput">导入文件</button>
        <button class="cc-button" @click="loadFromClipboard">从剪贴板导入</button>
      </div>
      
      <!-- 文件拖放区域 -->
      <FileDropZone
        variant="dashed"
        :accepted-types="['.xbel', '.xml', '.html']"
        :message="'拖放XBEL或Edge书签文件'"
        @files-dropped="handleFilesDropped"
        @error="handleError"
      >
        <template #icon>
          <CCIcon name="upload" :size="24" />
        </template>
      </FileDropZone>
      
      <input 
        type="file" 
        ref="fileInput"
        accept=".xbel,.xml,.html"
        @change="handleFileSelect"
        style="display: none"
      >
    </div>

    <!-- 状态显示 -->
    <div v-if="loading" class="cc-loading">加载中...</div>
    <div v-if="error" class="cc-alert cc-alert--error">{{ error }}</div>

    <!-- 书签内容展示 -->
    <div v-if="bookmarks" class="cc-content-tree">
      <h3 class="cc-content__title">{{ bookmarks.title || '书签' }}</h3>
      <BookmarkNode 
        v-for="node in bookmarks.children"
        :key="node.id || node.href"
        :node="node"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { fromFile, fromClipboard, fromEdgeHTML, fromEdgeHTMLPath } from '../../../../../utils/xbel/loaders.js';
import BookmarkNode from './BookmarkNode.vue';
import FileDropZone from '../../../../components/common/inputters/fileDropZone.vue';
import CCIcon from '../../../../components/common/baseComponents/icons.vue';

// 核心状态
const bookmarks = ref(null);
const loading = ref(false);
const error = ref(null);
const fileInput = ref(null);

// 统一的加载处理
const handleLoad = async (loadPromise) => {
  try {
    loading.value = true;
    error.value = null;
    bookmarks.value = await loadPromise;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// 文件处理
const showFileInput = () => fileInput.value?.click();

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const isHtml = file.name.toLowerCase().endsWith('.html');
    // 对于HTML文件，使用file.path可能是undefined，需要使用file读取内容
    if (isHtml) {
      const content = await file.text();
      await handleLoad(fromEdgeHTML(content));
    } else {
      await handleLoad(fromFile(file));
    }
  } catch (err) {
    error.value = `文件处理失败: ${err.message}`;
  }
  event.target.value = '';
};

const handleFilesDropped = async (files) => {
  const file = Array.isArray(files) ? files[0] : files;
  const isHtml = file.name.toLowerCase().endsWith('.html');
  
  try {
    if (isHtml) {
      const content = await file.text();
      await handleLoad(fromEdgeHTML(content));
    } else {
      await handleLoad(fromFile(file));
    }
  } catch (err) {
    error.value = `文件处理失败: ${err.message}`;
  }
};

const handleError = (err) => {
  error.value = err.message;
};

const loadFromClipboard = () => handleLoad(fromClipboard());
</script>

<style>
.cc-content-tree {
  margin-top: var(--cc-space-xl);
}

.cc-content__title {
  color: var(--cc-theme-on-background);
  margin-bottom: var(--cc-space-md);
}
</style>
