<template>
    <div class="fn__flex-column editor-container">
        <div class="fn__flex fn__flex-1">
            <!-- 左侧工具栏 -->
            <div class="tools-bar">
                <div class="tool-group">
                    <div class="tool-item" :class="{ active: currentTool === 'components' }"
                        @click="handleToolClick('components')">
                        <i class="icon">🧩</i>
                        <span>组件</span>
                    </div>
                    <div class="tool-item" :class="{ active: currentTool === 'pages' }"
                        @click="handleToolClick('pages')">
                        <i class="icon">📄</i>
                        <span>页面</span>
                    </div>
                    <div class="tool-item" :class="{ active: currentTool === 'assets' }"
                        @click="handleToolClick('assets')">
                        <i class="icon">🖼️</i>
                        <span>资源</span>
                    </div>
                </div>
            </div>

            <!-- 左侧面板 -->
            <div class="left-panel" v-if="currentTool === 'components'">
                <div class="section-title">组件库</div>
                <div class="panel-content">
                    <div class="component-categories">
                        <div v-for="category in componentCategories" :key="category.id" class="category-section">
                            <div class="category-header" @click="toggleCategory(category.id)">
                                <span class="category-icon">{{ category.expanded ? '▼' : '▶' }}</span>
                                <span class="category-title">{{ category.name }}</span>
                            </div>
                            <div class="component-grid" v-show="category.expanded">
                                <div v-for="comp in category.components" :key="comp.id" class="component-item"
                                    draggable="true" @dragstart="handleDragStart($event, comp)">
                                    <span class="component-icon">{{ comp.icon }}</span>
                                    <span class="component-name">{{ comp.name }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 添加页面结构面板 -->
            <div class="left-panel" v-if="currentTool === 'layers'">
                <div class="section-title">页面结构</div>
                <div class="panel-content">
                    <div class="component-tree">
                        <template v-for="node in getComponentTree" :key="node.id">
                            <div class="component-tree-node" :style="{ paddingLeft: `${node.level * 20}px` }"
                                :class="{ 'selected': selectedComponent?.id === node.id }"
                                @click="selectComponent(node.id)">
                                <span class="component-icon">{{ getComponentIcon(node.type) }}</span>
                                <span class="component-name">{{ node.name }}</span>
                                <div class="node-actions">
                                    <button class="action-btn delete-btn" @click.stop="deleteComponent(node.id)"
                                        title="删除组件">
                                        <i class="icon">🗑️</i>
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- 主编辑区域 -->
            <div class="fn__flex fn__flex-1 fn__flex-column editor-main">
                <!-- 顶部工具栏 -->
                <div class="editor-toolbar">
                    <div class="toolbar-group">
                        <button class="toolbar-btn" title="撤销" @click="undo">
                            <i class="icon">↩️</i>
                        </button>
                        <button class="toolbar-btn" title="重做" @click="redo">
                            <i class="icon">↪️</i>
                        </button>
                        <div class="toolbar-separator"></div>
                        <button class="toolbar-btn" :class="{ active: isPreviewMode }" title="预览模式"
                            @click="togglePreviewMode">
                            <i class="icon">👁️</i>
                        </button>
                        <div class="toolbar-separator"></div>
                        <button class="toolbar-btn" title="发布" @click="publish">
                            <i class="icon">🚀</i>
                        </button>
                    </div>

                    <!-- 设备选择器 -->
                    <div class="device-selector">
                        <button class="toolbar-btn" :class="{ active: currentDevice === 'desktop' }"
                            @click="switchDevice('desktop')">
                            <i class="icon">🖥️</i>
                        </button>
                        <button class="toolbar-btn" :class="{ active: currentDevice === 'tablet' }"
                            @click="switchDevice('tablet')">
                            <i class="icon">📱</i>
                        </button>
                        <button class="toolbar-btn" :class="{ active: currentDevice === 'mobile' }"
                            @click="switchDevice('mobile')">
                            <i class="icon">📱</i>
                        </button>
                    </div>

                    <!-- 缩放控制 -->
                    <div class="zoom-control">
                        <button class="toolbar-btn" @click="zoomOut">-</button>
                        <span class="zoom-value">{{ (zoom * 100).toFixed(0) }}%</span>
                        <button class="toolbar-btn" @click="zoomIn">+</button>
                    </div>
                </div>

                <!-- 画布容器 -->
                <div class="editor-workspace" @dragover.prevent @dragenter.prevent @drop.prevent="handleDrop">
                    <div class="editor-content">
                        <iframe :ref="el => previewFrame = el" class="preview-frame" @load="handleIframeLoad">
                        </iframe>
                    </div>
                </div>
            </div>

            <!-- 右侧属性面板 -->
            <div class="right-panel">
                <div class="section-title">属性设置</div>
                <div class="panel-content">
                    <template v-if="selectedComponent">
                        <!-- 样式设置 -->
                        <div class="property-section">
                            <h3>样式</h3>
                            <div class="property-group">
                                <div class="property-item">
                                    <label>宽度</label>
                                    <input type="text" v-model="selectedComponent.style.width">
                                </div>
                                <div class="property-item">
                                    <label>高度</label>
                                    <input type="text" v-model="selectedComponent.style.height">
                                </div>
                            </div>
                        </div>

                        <!-- 组件属性 -->
                        <div class="property-section">
                            <h3>属性</h3>
                            <component :is="getPropertyEditor(selectedComponent.type)"
                                v-model="selectedComponent.props" />
                        </div>

                        <!-- 行为设置 -->
                        <div class="property-section" v-if="getComponentBehaviors.length">
                            <h3>交互行为</h3>
                            <div v-for="behaviorType in getComponentBehaviors" :key="behaviorType">
                                <div class="behavior-header">
                                    <span>{{ behaviors[behaviorType].name }}</span>
                                    <div class="switch-toggle">
                                        <input type="checkbox" :id="'behavior-' + behaviorType"
                                            v-model="selectedComponent.behaviors[behaviorType].enabled"
                                            @change="updatePreview" />
                                        <label :for="'behavior-' + behaviorType"></label>
                                    </div>
                                </div>
                                <template v-if="selectedComponent.behaviors[behaviorType].enabled">
                                    <div v-for="(event, eventName) in behaviors[behaviorType].events" :key="eventName"
                                        class="behavior-event">
                                        <div class="event-header">{{ event.name }}</div>
                                        <div class="event-params">
                                            <template v-for="(param, paramName) in event.params" :key="paramName">
                                                <div class="param-item">
                                                    <label>{{ param.name }}</label>
                                                    <input v-if="param.type === 'string'" type="text"
                                                        v-model="selectedComponent.behaviors[behaviorType][eventName][paramName]"
                                                        @change="updatePreview" class="input-control" />
                                                    <input v-else-if="param.type === 'number'" type="number"
                                                        v-model.number="selectedComponent.behaviors[behaviorType][eventName][paramName]"
                                                        @change="updatePreview" class="input-control" />
                                                    <select v-else-if="param.type === 'select'"
                                                        v-model="selectedComponent.behaviors[behaviorType][eventName][paramName]"
                                                        @change="updatePreview" class="select-control">
                                                        <option v-for="option in param.options" :key="option.value"
                                                            :value="option.value">
                                                            {{ option.label }}
                                                        </option>
                                                    </select>
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </template>
                    <div v-else class="empty-tip">
                        请选择一个组件进行编辑
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { componentManager, componentTreeManager, componentConfigs } from './componentConfig.js';
import DefaultPropertyEditor from './DefaultPropertyEditor.vue';
import { behaviors } from './componentConfig.js';
import { dragDropManager } from './dragDropManager.js';


// 状态定义
const currentTool = ref('components');
const currentDevice = ref('desktop');
const zoom = ref(1);
const selectedComponent = ref(null);
const currentPageId = ref(null);
const pageComponents = ref([]); // 存储页面中的组件
let componentIdCounter = 0; // 用于生成组件唯一ID
const isPreviewMode = ref(false);

// 添加 previewFrame ref
const previewFrame = ref(null);

// 模拟数据
const componentCategories = ref([
    {
        id: 'basic',
        name: '基础组件',
        expanded: true, // 默认展开
        components: [
            { id: 'text', name: '文本', icon: '📝' },
            { id: 'image', name: '图片', icon: '🖼️' },
            { id: 'button', name: '按钮', icon: '🔘' },
            { id: 'divider', name: '分割线', icon: '⚡' }
        ]
    },
    {
        id: 'layout',
        name: '布局组件',
        expanded: false,
        components: [
            { id: 'container', name: '容器', icon: '📦' },
            { id: 'grid', name: '网格', icon: '🔲' },
            { id: 'flex', name: '弹性布局', icon: '↔️' }
        ]
    },
    {
        id: 'form',
        name: '表单组件',
        components: [
            { id: 'input', name: '输入框', icon: '✏️' },
            { id: 'select', name: '下拉选择', icon: '▼' },
            { id: 'checkbox', name: '复选框', icon: '☑️' },
            { id: 'radio', name: '单选框', icon: '⭕' },
            { id: 'form', name: '表单', icon: '📋' }
        ]
    },
    {
        id: 'content',
        name: '内容展示',
        components: [
            { id: 'list', name: '列表', icon: '📝' },
            { id: 'table', name: '表格', icon: '🗃️' },
            { id: 'card', name: '卡片', icon: '🎴' },
            { id: 'carousel', name: '轮播图', icon: '🎞️' }
        ]
    },
    {
        id: 'navigation',
        name: '导航组件',
        components: [
            { id: 'menu', name: '菜单', icon: '📑' },
            { id: 'tabs', name: '标签页', icon: '📑' },
            { id: 'breadcrumb', name: '面包屑', icon: '🔗' }
        ]
    }
]);

const pages = ref([
    { id: 'page1', name: '首页' },
    { id: 'page2', name: '关于我们' }
]);

// 计算属性
const getPanelTitle = computed(() => {
    const titles = {
        components: '组件库',
        layers: '图层',
        pages: '页面',
        assets: '资源库'
    };
    return titles[currentTool.value] || '';
});

// 方法定义
const handleToolClick = (tool) => {
    currentTool.value = tool;
};

const switchDevice = (device) => {
    currentDevice.value = device;
    updatePreviewDevice(device);
};

const zoomIn = () => {
    zoom.value = Math.min(zoom.value + 0.1, 2);
    updatePreviewZoom(zoom.value);
};

const zoomOut = () => {
    zoom.value = Math.max(zoom.value - 0.1, 0.2);
    updatePreviewZoom(zoom.value);
};

// 初始化拖拽管理器
onMounted(() => {
    dragDropManager.init(
        updatePreview,
        (component) => selectedComponent.value = component
    );
    console.log('Component mounted');

    // 设置预览页面的URL
    nextTick(() => {
        if (previewFrame.value) {
            const previewUrl = new URL('/plugins/SACAssetsManager/source/UI/pannels/pageEditor/previewer.html', window.location.href);
            previewFrame.value.src = previewUrl.href;
            console.log('Preview URL set:', previewUrl.href);
        } else {
            console.error('Preview frame not available in onMounted');
        }
    });


    // 修改拖拽相关的事件监听
    const editorWorkspace = document.querySelector('.editor-workspace');
    if (editorWorkspace) {
        editorWorkspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
        });
    }

    // 添加 iframe 消息监听
    window.addEventListener('message', handleMessage);
    console.log('Message listener added');
});

// 添加组件卸载时的清理
onUnmounted(() => {
    const editorWorkspace = document.querySelector('.editor-workspace');
    if (editorWorkspace) {
        editorWorkspace.removeEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }
    window.removeEventListener('message', handleMessage);
});

const updatePreviewDevice = (device) => {
    if (previewFrame.value?.contentWindow) {
        previewFrame.value.contentWindow.postMessage({
            type: 'updateDevice',
            device: device
        }, '*');
    }
};

const updatePreviewZoom = (newZoom) => {
    if (previewFrame.value?.contentWindow) {
        previewFrame.value.contentWindow.postMessage({
            type: 'updateZoom',
            zoom: newZoom
        }, '*');
    }
};

// 添加组件hover处理方法
const handleComponentHover = (componentId) => {
    if (previewFrame.value?.contentWindow) {
        previewFrame.value.contentWindow.postMessage({
            type: 'highlightComponent',
            componentId: componentId
        }, '*');
    }
};

// 获取组件支持的行为
const getComponentBehaviors = computed(() => {
    if (!selectedComponent.value) return [];
    const config = componentConfigs[selectedComponent.value.type];
    return config?.behaviors || [];
});

// 初始化组件行为
const initComponentBehaviors = (component) => {
    component.behaviors = componentManager.initComponentBehaviors(component.type);
};

// 切换预览模式
const togglePreviewMode = () => {
    isPreviewMode.value = !isPreviewMode.value;
    // 通知预览框架更新模式
    if (previewFrame.value?.contentWindow) {
        previewFrame.value.contentWindow.postMessage({
            type: 'updateMode',
            isPreviewMode: isPreviewMode.value
        }, '*');
    }
};

// 添加页面结构展示相关代码
const getComponentTree = computed(() =>
    componentTreeManager.buildComponentTree(pageComponents.value)
);

// 获取组件显示名称
const getComponentName = (component) => componentManager.getComponentName(component);
const getComponentIcon = (type) => componentManager.getComponentIcon(type);

// 添加组件树渲染模板
const renderComponentTree = (tree) => {
    return tree.map(node => `
        <div class="component-tree-node" 
             style="padding-left: ${node.level * 20}px"
             :class="{ 'selected': selectedComponent?.id === node.id }"
             @click="selectComponent(node.id)">
            <span class="component-icon">${getComponentIcon(node.type)}</span>
            <span class="component-name">${node.name}</span>
            ${node.children.length ? renderComponentTree(node.children) : ''}
        </div>
    `).join('');
};

// 切换分类展开/折叠
const toggleCategory = (categoryId) => {
    const category = componentCategories.value.find(c => c.id === categoryId);
    if (category) {
        category.expanded = !category.expanded;
    }
};

// 修改 handleDragStart
const handleDragStart = (event, component) => {
    dragDropManager.handleDragStart(event, component);
};

// 修改 handleMessage 函数，添加日志输出以便调试
const handleMessage = (event) => {
    console.log('Received message:', event.data); // 调试日志

    if (event.data.type === 'exportPage') {
        console.log('Export content length:', event.data.content?.length); // 检查内容是否存在
        handleExport(event.data.content);
        return; // 确保导出消息被优先处理
    }

    switch (event.data.type) {
        case 'iframe-dragover':
            dragDropManager.handleIframeDragOver(event.data);
            break;

        case 'iframe-drop':
            dragDropManager.handleIframeDrop(event.data, pageComponents.value);
            break;

        case 'componentSelected':
            const selectedId = event.data.componentId;
            selectedComponent.value = pageComponents.value.find(
                comp => comp.id === selectedId
            );
            break;

        case 'componentHover':
            handleComponentHover(event.data.componentId);
            break;
        case 'menuAction':
            handleMenuAction(event.data);
            break;

    }
};
const handleMenuAction = (data) => {
    const { action, componentId } = data;
    
    switch(action) {
        case 'delete':
            // 递归删除组件及其子组件
            const deleteComponent = (components) => {
                return components.filter(comp => {
                    if (comp.id === componentId) {
                        return false;
                    }
                    if (comp.children) {
                        comp.children = deleteComponent(comp.children);
                    }
                    return true;
                });
            };
            
            pageComponents.value = deleteComponent(pageComponents.value);
            
            // 如果被删除的组件是当前选中的组件，清除选中状态
            if (selectedComponent.value?.id === componentId) {
                selectedComponent.value = null;
            }
            break;
            
        // 可以在这里添加其他菜单操作的处理
        case 'edit':
            // 处理编辑操作
            break;
            
        case 'add':
            // 处理添加操作
            break;
    }
};
// 添加属性编辑器映射
const getPropertyEditor = (componentType) => {
    const editors = {
        text: 'TextPropertyEditor',
        button: 'ButtonPropertyEditor',
        image: 'ImagePropertyEditor'
    };
    return editors[componentType] || 'DefaultPropertyEditor';
};

// 注册组件
const components = {
    DefaultPropertyEditor
};

// 添加 updatePreview 方法
const updatePreview = () => {
    if (previewFrame.value?.contentWindow) {
        // 创建一个可序列化的组件数据副本
        const serializableComponents = JSON.parse(JSON.stringify(pageComponents.value));

        previewFrame.value.contentWindow.postMessage({
            type: 'updateComponents',
            components: serializableComponents,
            selectedId: selectedComponent.value?.id
        }, '*');
    }
};

// 监听组件变化并更新预览
watch(pageComponents, () => {
    updatePreview();
}, { deep: true });

// 监听选中组件变化并更新预览
watch(selectedComponent, () => {
    updatePreview();
});

// 修改导出处理函数
const handleExport = (htmlContent) => {
    console.log('Starting export process...', htmlContent.length);

    if (!htmlContent) {
        console.error('No content to export');
        window.$message?.error('导出失败：没有可导出的内容');
        return;
    }

    try {
        // 创建 Blob 对象
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        console.log('Blob created:', blob.size);

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const fileName = `page-${new Date().getTime()}.html`;

        // 创建并配置下载链接
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;

        // 创建并触发点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: false
        });

        console.log('Triggering download with dispatchEvent...');
        link.dispatchEvent(clickEvent);

        // 清理
        setTimeout(() => {
            URL.revokeObjectURL(url);
            console.log('Cleanup completed');
        }, 100);

        window.$message?.success('页面导出成功！');
    } catch (error) {
        console.error('Export failed:', error);
        window.$message?.error(`导出失败：${error.message}`);
    }
};

</script>

<style scoped>
/* 基础布局样式 */
.editor-container {
    height: 100%;
    width: 100%;
}

/* 合并所有组件相关的基础样式 */
.component-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    background: var(--cc-theme-surface);
    border: 1px solid var(--cc-border-color);
    border-radius: var(--cc-border-radius);
    cursor: move;
    transition: all 0.2s;
}

.component-item:hover {
    background: var(--cc-theme-surface-hover);
    border-color: var(--cc-theme-primary);
    transform: translateY(-2px);
}

.component-icon {
    font-size: 24px;
    margin-bottom: 8px;
}

.component-name {
    font-size: 12px;
    color: var(--cc-text-color);
}

/* 合并网格相关样式 */
.component-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 12px;
    background: #fff;
    transition: all 0.3s ease;
    max-height: 1000px;
    opacity: 1;
}

.component-grid[v-show="false"] {
    max-height: 0;
    opacity: 0;
    padding: 0;
    margin: 0;
}

/* 删除重复的面板样式,保留一个统一的版本 */
.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

/* 删除重复的工具栏按钮样式 */
.toolbar-btn {
    height: 32px;
    min-width: 32px;
    padding: 0 8px;
    border: 1px solid var(--cc-border-color);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: var(--cc-theme-text-secondary);
}

/* 左侧工具栏样式优化 */
.tools-bar {
    width: 80px;
    /* 调整为更宽的工具栏 */
    min-width: 80px;
    background: var(--cc-theme-surface);
    border-right: 1px solid var(--cc-border-color);
    padding: 12px 0;
}

.tool-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tool-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 0;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
    /* 为激活状态的边框做准备 */
}

.tool-item:hover {
    background-color: var(--cc-theme-surface-hover);
}

.tool-item.active {
    background-color: var(--cc-theme-surface-hover);
}

.tool-item.active::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: var(--cc-theme-primary);
}

.tool-item .icon {
    font-size: 20px;
    margin-bottom: 4px;
}

.tool-item span {
    font-size: 12px;
}

/* 左侧面板样式 */
.left-panel {
    width: 280px;
    min-width: 280px;
    background: var(--cc-theme-surface);
    border-right: 1px solid var(--cc-border-color);
    display: flex;
    flex-direction: column;
}

.section-title {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    border-bottom: 1px solid var(--cc-border-color);
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

/* 组件面板样式 */
.components-panel {
    padding: 16px;
}

.component-category {
    margin-bottom: 24px;
}

.category-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--cc-theme-text-secondary, #666);
}

.component-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 4px;
}

.component-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    background: var(--cc-theme-surface-light);
    border: 1px solid var(--cc-border-color);
    border-radius: var(--cc-border-radius);
    cursor: move;
    transition: all 0.2s;
}

.component-item:hover {
    background: var(--cc-theme-surface-hover);
    transform: translateY(-2px);
}

/* 画布区域样式 */
.editor-main {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: #f0f0f0;
}

.editor-toolbar {
    height: 48px;
    padding: 0 16px;
    background: var(--cc-theme-surface);
    border-bottom: 1px solid var(--cc-border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.toolbar-separator {
    width: 1px;
    height: 24px;
    background: var(--cc-border-color);
    margin: 0 8px;
}

.toolbar-btn {
    height: 32px;
    min-width: 32px;
    padding: 0 8px;
    border: 1px solid var(--cc-border-color);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: var(--cc-theme-text-secondary);
}

.toolbar-btn:hover {
    background: var(--cc-theme-surface-hover);
    color: var(--cc-theme-primary);
    border-color: var(--cc-theme-primary);
}

.toolbar-btn.active {
    background: var(--cc-theme-primary-light);
    border-color: var(--cc-theme-primary);
    color: var(--cc-theme-primary);
}

/* 画布容器样式 */
.editor-workspace {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    background-image: linear-gradient(45deg, #80808010 25%, transparent 25%),
        linear-gradient(-45deg, #80808010 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #80808010 75%),
        linear-gradient(-45deg, transparent 75%, #80808010 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    cursor: default;
}

.editor-content {
    position: relative;
    background: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    margin: auto;
    width: 100%;
    height: 100%;
}

/* 右侧属性面板样式 */
.right-panel {
    width: 300px;
    min-width: 300px;
    background: var(--cc-theme-surface);
    border-left: 1px solid var(--cc-border-color);
    display: flex;
    flex-direction: column;
}

.panel-content {
    padding: 16px;
    overflow-y: auto;
}

.property-section {
    margin-bottom: 24px;
    background: var(--cc-theme-surface);
    border-radius: var(--cc-border-radius);
    padding: 16px;
}

.property-section h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--cc-theme-text, #333);
}

.property-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.property-item label {
    width: 80px;
    font-size: 13px;
    color: var(--cc-theme-text-secondary, #666);
}

.property-item input {
    flex: 1;
    padding: var(--cc-space-xs);
    border: 1px solid var(--cc-border-color);
    border-radius: var(--cc-border-radius);
    background: var(--cc-theme-surface-light);
}

/* 预览框架样式 */
.preview-frame {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
    background: white;
    border-radius: 4px;
}

/* 空状态提示 */
.empty-tip {
    text-align: center;
    padding: 40px 20px;
    color: var(--cc-theme-text-secondary, #666);
    font-size: 14px;
}

/* 按钮和操作样式 */
.btn {
    padding: 8px 16px;
    border: 1px solid var(--cc-border-color);
    border-radius: var(--cc-border-radius);
    background: var(--cc-theme-surface-light);
    cursor: pointer;
    transition: all 0.2s;
}

.btn:hover {
    background: var(--cc-theme-surface-hover);
}

.action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: var(--cc-border-radius);
}

.action-btn:hover {
    background: var(--cc-theme-surface-hover);
}

/* 缩放控制样式优化 */
.zoom-control {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--cc-theme-surface-light);
    padding: 2px;
    border-radius: 4px;
    border: 1px solid var(--cc-border-color);
}

.zoom-value {
    padding: 0 8px;
    font-size: 13px;
    color: var(--cc-theme-text-secondary);
    min-width: 60px;
    text-align: center;
}

/* 设备选择器样式 */
.device-selector {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--cc-theme-surface-light);
    padding: 2px;
    border-radius: 4px;
    border: 1px solid var(--cc-border-color);
}

.device-selector .toolbar-btn {
    border: none;
    height: 28px;
    min-width: 28px;
    border-radius: 2px;
}

.device-selector .toolbar-btn:hover {
    background: var(--cc-theme-surface-hover);
}

.device-selector .toolbar-btn.active {
    background: var(--cc-theme-primary-light);
}

.canvas-container {
    background: #f5f5f5;
    min-height: 100%;
    padding: 20px;
}

.layout-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100%;
}

.editor-component {
    transition: all 0.2s ease;
    position: relative;
}

.editor-component:hover {
    outline: 2px solid var(--cc-theme-primary, #1890ff);
}

/* 文本组件特定样式 */
.editor-component.text {
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
}

/* 响应布局 */
@media (max-width: 768px) {
    .layout-grid {
        max-width: 100%;
        padding: 12px;
    }
}

/* 添加组件高亮样式 */
.editor-component.highlight {
    outline: 2px solid #1890ff;
    box-shadow: 0 0 8px rgba(24, 144, 255, 0.2);
}

/* 添加设备响应式样式 */
#app {
    transition: max-width 0.3s ease;
    margin: 0 auto;
    width: 100%;
}

/* 添加缩放过渡效果 */
body {
    transition: zoom 0.3s ease;
}

/* 添加行为编辑器样式 */
.behavior-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.behavior-event {
    margin-bottom: 16px;
    padding: 12px;
    background: var(--cc-theme-surface-light);
    border-radius: 4px;
}

.event-header {
    font-weight: 500;
    margin-bottom: 8px;
}

.event-params {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.param-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.param-item label {
    width: 80px;
    flex-shrink: 0;
}

/* 添加自定义开关样式 */
.switch-toggle {
    position: relative;
    width: 40px;
    height: 20px;
}

.switch-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.switch-toggle label {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 20px;
}

.switch-toggle label:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
}

.switch-toggle input:checked+label {
    background-color: var(--cc-theme-primary);
}

.switch-toggle input:checked+label:before {
    transform: translateX(20px);
}

/* 添加自定义输入框和选择框样式 */
.input-control,
.select-control {
    width: 100%;
    padding: 6px 12px;
    border: 1px solid var(--cc-border-color);
    border-radius: var(--cc-border-radius);
    background: var(--cc-theme-surface-light);
    font-size: 14px;
}

.input-control:focus,
.select-control:focus {
    outline: none;
    border-color: var(--cc-theme-primary);
}

.select-control {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23666' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 24px;
}

/* 添加组件树样式 */
.component-tree {
    padding: 12px;
}

.component-tree-node {
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.component-tree-node:hover {
    background: var(--cc-theme-surface-hover);
}

.component-tree-node.selected {
    background: var(--cc-theme-surface-selected);
}

.component-tree-node .component-icon {
    font-size: 16px;
    margin-right: 8px;
}

.component-tree-node .component-name {
    font-size: 14px;
}

.component-categories {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.category-section {
    border: 1px solid var(--cc-border-color);
    border-radius: 4px;
    overflow: hidden;
}

.category-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--cc-theme-surface);
    cursor: pointer;
    user-select: none;
}

.category-header:hover {
    background: var(--cc-theme-surface-hover);
}

.category-icon {
    margin-right: 8px;
    font-size: 12px;
    transition: transform 0.2s;
}

.category-title {
    font-size: 14px;
    font-weight: 500;
}
</style>