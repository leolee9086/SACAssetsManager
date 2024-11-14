<template>
  <div class="gallery-container">
    <button 
      ref="galleryButton"
      class="toolbar-button"
      @click.stop="toggleGallery"
      :class="{ 'active': isOpen }"
    >
      <span class="button-icon">⚡</span>
      <span class="button-text">节点</span>
    </button>

    <div 
      v-show="isOpen" 
      class="node-gallery"
      ref="galleryPanel"
      @click.stop
      :style="panelPosition"
    >
      <div class="gallery-search">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索节点..." 
          @input="filterNodes"
        />
      </div>
      <div class="gallery-categories">
        <div 
          v-for="category in filteredCategories" 
          :key="category.name" 
          class="category"
        >
          <div class="category-header" @click="toggleCategory(category.name)">
            <span class="category-name">{{ category.name }}</span>
            <span class="category-icon">{{ expandedCategories[category.name] ? '▼' : '▶' }}</span>
          </div>
          <div 
            v-show="expandedCategories[category.name]" 
            class="category-items"
          >
            <div 
              v-for="node in category.nodes" 
              :key="node.id"
              class="node-item"
              draggable="true"
              @dragstart="handleDragStart($event, node)"
              @click="showNodeDetails(node)"
            >
              <div class="node-preview">
                <span class="node-type-icon" :class="node.type">
                  {{ node.type === 'function' ? 'fx' : '⚛' }}
                </span>
              </div>
              <div class="node-info">
                <div class="node-title">{{ node.title }}</div>
                <div class="node-description">{{ node.description }}</div>
                <div class="node-metadata" v-if="node.metadata">
                  <div class="source-info">
                    <span class="source-path" v-if="node.metadata?.sourcePath">
                      📁 {{ formatPath(node.metadata.sourcePath) }}
                    </span>
                    <span v-if="node.metadata?.author" class="author">
                      👤 {{ node.metadata.author }}
                    </span>
                    <span v-if="node.metadata?.version" class="version">
                      📌 v{{ node.metadata.version }}
                    </span>
                  </div>
                  <div class="node-details" v-if="selectedNode === node">
                    <div v-if="node.metadata.jsDoc">
                      <div class="input-ports" v-if="Object.keys(node.metadata.jsDoc.inputTypes).length">
                        <div class="section-title">输入端口:</div>
                        <div v-for="(type, name) in node.metadata.jsDoc.inputTypes" :key="name" class="port-item">
                          <span class="port-name">{{ name }}</span>
                          <span class="port-type">{{ type }}</span>
                          <span v-if="node.metadata.jsDoc.defaultValues[name]" class="port-default">
                            默认值: {{ node.metadata.jsDoc.defaultValues[name] }}
                          </span>
                        </div>
                      </div>
                      <div class="output-ports" v-if="Object.keys(node.metadata.jsDoc.outputTypes).length">
                        <div class="section-title">输出端口:</div>
                        <div v-for="(type, name) in node.metadata.jsDoc.outputTypes" :key="name" class="port-item">
                          <span class="port-name">{{ name }}</span>
                          <span class="port-type">{{ type }}</span>
                        </div>
                      </div>
                      <div class="examples" v-if="node.metadata.jsDoc.examples?.length">
                        <div class="section-title">示例:</div>
                        <div v-for="(example, index) in node.metadata.jsDoc.examples" 
                             :key="index" 
                             class="example-item">
                          {{ example }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { 默认函数式节点加载表 } from '../../loader/defaultMap.js';
import { 默认组件式节点注册表 } from '../../loader/defaultMap.js';
import { parseJSDocConfigFromURL } from '../../../../../utils/codeLoaders/js/jsDoc.js';
const searchQuery = ref('');
const expandedCategories = ref({});
const nodeCategories = ref([]);

// 添加面板控制逻辑
const isOpen = ref(false);
const galleryPanel = ref(null);
const galleryButton = ref(null);

// 计算面板位置
const panelPosition = ref({
  top: 'calc(100% + 8px)',
  right: '0px'
});

// 处理点击外部关闭面板
const handleClickOutside = (event) => {
  // 检查点击是否在按钮或面板内
  const isButtonClick = galleryButton.value?.contains(event.target);
  const isPanelClick = galleryPanel.value?.contains(event.target);
  
  // 如果点击在面板或按钮外部，则关闭面板
  if (isOpen.value && !isButtonClick && !isPanelClick) {
    isOpen.value = false;
  }
};
const showAtPosition=(position)=>{
    isOpen.value=true
    panelPosition.value = {
    top: `${position.y}px`,
    left: `${position.x}px`
  };
}
defineExpose({
    showAtPosition
})
// 调整面板位置的函数
const adjustPanelPosition = async () => {
  if (!isOpen.value || !galleryPanel.value || !galleryButton.value) return;
  await nextTick();
  const buttonRect = galleryButton.value.getBoundingClientRect();
  const panelRect = galleryPanel.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  // 初始位置（在按钮下方）
  let top = buttonRect.bottom + 8; // 8px 间距
  let left = buttonRect.left; // 默认与按钮左对齐
  
  // 检查是否超出右边界
  if (left + panelRect.width > viewportWidth) {
    // 如果超出右边界，尝试右对齐
    left = Math.max(8, viewportWidth - panelRect.width - 8);
  }
  // 检查是否超出左边界
  if (left < 8) {
    left = 8; // 保持最小8px的左边距
  }
  // 检查是否超出底部边界
  if (top + panelRect.height > viewportHeight) {
    // 如果底部放不下，尝试放在按钮上方
    top = Math.max(8, buttonRect.top - panelRect.height - 8);
  }
  panelPosition.value = {
    top: `${top}px`,
    left: `${left}px`
  };
};

// 切换面板显示状态
const toggleGallery = async (event) => {
  event.stopPropagation();
  isOpen.value = !isOpen.value;
  
  if (isOpen.value) {
    await adjustPanelPosition();
  }
};

// 监听窗口大小变化
const handleResize = () => {
  if (isOpen.value) {
    adjustPanelPosition();
  }
};

// 生命周期钩子
onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('resize', handleResize);
});

const selectedNode = ref(null);

// 格式化文件路径，只显示最后两级目录
const formatPath = (path) => {
  if (!path) return '未知路径';
  const parts = path.split('/');
  return parts.slice(-2).join('/');
};

// 显示/隐藏节点详情
const showNodeDetails = (node) => {
  selectedNode.value = selectedNode.value === node ? null : node;
};

// 初始化节点分类
onMounted(async () => {
  const categories = {};
  // 处理函数式节点
  for (const moduleConfig of 默认函数式节点加载表) {
    const categoryName = `${moduleConfig.config.componentPrefix}/${moduleConfig.config.moduleName}`;
    
    if (!categories[categoryName]) {
      categories[categoryName] = {
        name: categoryName,
        type: 'function',
        nodes: [],
        metadata: {
          sourcePath: moduleConfig.config?.sourcePath || moduleConfig.path || '未知路径',
          description: moduleConfig.config?.description || ''
        }
      };
    }

    // 为每个函数解析JSDoc
    for (const funcName of moduleConfig.config?.include || Object.keys(moduleConfig.module)) {
      const func = moduleConfig.module[funcName];
      if (typeof func === 'function') {
        // 解析函数的JSDoc
        const jsDocConfig = await parseJSDocConfigFromURL(moduleConfig.path, funcName);
        
        categories[categoryName].nodes.push({
          id: `${categoryName}/${funcName}`,
          title: funcName,
          description: jsDocConfig?.description || '暂无描述',
          type: 'function',
          metadata: {
            sourcePath: moduleConfig.config?.sourcePath || moduleConfig.path || '未知路径',
            sourceFunction: funcName,
            jsDoc: jsDocConfig || {},
            author: jsDocConfig?.tags?.author?.[0],
            version: jsDocConfig?.tags?.version?.[0],
            lastModified: jsDocConfig?.tags?.lastModified?.[0],
            dependencies: jsDocConfig?.tags?.dependencies || [],
            examples: jsDocConfig?.tags?.example || []
          },
          createNode: () => ({
            type: `${categoryName}/${funcName}`,
            function: func,
            name: funcName,
            category: categoryName
          })
        });
      }
    }
  }

  // 处理组件式节点
  for (const [componentKey, componentPath] of Object.entries(默认组件式节点注册表)) {
    const [prefix, ...pathParts] = componentKey.split('/');
    const categoryName = prefix;
    
    if (!categories[categoryName]) {
      categories[categoryName] = {
        name: categoryName,
        type: 'component',
        nodes: [],
        metadata: {
          sourcePath: componentPath || '未知路径'
        }
      };
    }

    categories[categoryName].nodes.push({
      id: componentKey,
      title: pathParts.join('/'),
      description: '组件式节点',
      type: 'component',
      metadata: {
        sourcePath: componentPath || '未知路径',
        componentName: pathParts[pathParts.length - 1],
        props: {},
        events: [],
        slots: []
      },
      createNode: () => ({
        type: componentKey,
        name: pathParts[pathParts.length - 1],
        category: categoryName
      })
    });
  }
  
  nodeCategories.value = Object.values(categories);
  // 默认展开所有分类
  nodeCategories.value.forEach(category => {
    expandedCategories.value[category.name] = true;
  });
});

// 过滤节点
const filteredCategories = computed(() => {
  if (!searchQuery.value) return nodeCategories.value;
  
  return nodeCategories.value.map(category => ({
    ...category,
    nodes: category.nodes.filter(node => 
      node.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0);
});

// 切换分类展开/折叠
const toggleCategory = (categoryName) => {
  expandedCategories.value[categoryName] = !expandedCategories.value[categoryName];
};

const emit = defineEmits(['startDuplicating']);

// 修改处理拖拽开始事件
const handleDragStart = (event, node) => {
  const nodeData = node.createNode();
  
  // 创建预览卡片数据
  const previewCard = {
    id: `preview-${Date.now()}`,
    type:nodeData.type,
    controller: {
      component: nodeData.component || 'div', // 默认使用 div 作为预览组件
      componentProps: {
        isPreview: true,
        ...nodeData.props
      },
      nodeDefine: nodeData
    },
    position: {
      x: 0,
      y: 0,
      width: 150, // 默认宽度
      height: 100 // 默认高度
    }
  };

  // 创建实际卡片数据
  const actualCard = {
    id: `node-${Date.now()}`,
    type:nodeData.type,

    controller: {
      component: nodeData.component || 'div',
      componentProps: nodeData.props || {},
      nodeDefine: nodeData
    },
    position: {
      x: 0,
      y: 0,
      width: 150,
      height: 100
    }
  };

  // 触发父组件的 startDuplicating 事件
  emit('startDuplicating', {
    previewCard,
    actualCard,
    mouseEvent: event,
    sourcePosition: { x: event.clientX, y: event.clientY }
  });

  // 设置拖拽效果
  event.dataTransfer.effectAllowed = 'copy';
  
  // 创建拖拽预览图像
  const preview = document.createElement('div');
  preview.className = 'drag-preview';
  preview.textContent = node.title;
  document.body.appendChild(preview);
  event.dataTransfer.setDragImage(preview, 0, 0);
  
  // 清理预览元素
  requestAnimationFrame(() => {
    document.body.removeChild(preview);
  });
};
</script>

<style scoped>
.gallery-container {
  position: relative;
  z-index: 1000;
}

.toolbar-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  height: 28px;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-border-color);
  border-radius: var(--b3-border-radius);
  color: var(--b3-theme-on-surface);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-button:hover {
  background: var(--b3-list-hover);
  border-color: var(--b3-theme-primary);
}

.toolbar-button.active {
  background: var(--b3-theme-primary);
  color: var(--b3-theme-on-primary);
  border-color: var(--b3-theme-primary);
}

.button-icon {
  font-size: 14px;
}

.button-text {
  font-size: 14px;
}

.node-gallery {
  position: fixed;
  top: calc(100% + 8px);
  right: 0;
  width: 300px;
  height: 500px;
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: var(--b3-border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gallery-search {
  padding: 12px;
  border-bottom: 1px solid var(--b3-border-color);
}

.gallery-search input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: var(--b3-border-radius);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.gallery-categories {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  max-height: calc(500px - 60px); /* 减去搜索框的高度 */
}

.category {
  margin-bottom: 12px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--b3-theme-background);
  border-radius: var(--b3-border-radius);
  cursor: pointer;
}

.category-items {
  padding: 8px 0 8px 16px;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin: 4px 0;
  background: var(--b3-theme-background);
  border-radius: var(--b3-border-radius);
  cursor: move;
  transition: background-color 0.2s;
}

.node-item:hover {
  background: var(--b3-list-hover);
}

.node-preview {
  width: 48px;
  height: 48px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--b3-theme-surface);
  border-radius: var(--b3-border-radius);
}

.node-info {
  flex: 1;
}

.node-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.node-description {
  font-size: 12px;
  color: var(--b3-theme-on-surface-variant);
}

.preview-component {
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.drag-preview {
  position: fixed;
  top: -1000px;
  left: -1000px;
  padding: 8px 12px;
  background: var(--b3-theme-primary);
  color: var(--b3-theme-on-primary);
  border-radius: var(--b3-border-radius);
  pointer-events: none;
  z-index: 9999;
}

.node-metadata {
  margin-top: 8px;
  font-size: 12px;
  color: var(--b3-theme-on-surface-variant);
}

.source-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.source-path, .author, .version {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.node-details {
  margin-top: 8px;
  padding: 8px;
  background: var(--b3-theme-background);
  border-radius: var(--b3-border-radius);
  border: 1px solid var(--b3-border-color);
}

.section-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--b3-theme-on-surface);
}

.port-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  padding: 4px;
  background: var(--b3-theme-surface);
  border-radius: var(--b3-border-radius);
}

.port-name {
  font-weight: 500;
}

.port-type {
  color: var(--b3-theme-primary);
  font-family: monospace;
}

.port-default {
  color: var(--b3-theme-on-surface-variant);
  font-style: italic;
}

.example-item {
  margin: 4px 0;
  padding: 8px;
  background: var(--b3-theme-surface);
  border-radius: var(--b3-border-radius);
  font-family: monospace;
  white-space: pre-wrap;
}
</style>