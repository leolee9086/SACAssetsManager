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
                        <NumberInput
                            v-model="zoom"
                            :min="0.2"
                            :max="2"
                            :step="0.1"
                            unit="%"
                            :precision="0"
                            @update:modelValue="updatePreviewZoom"
                        />
                    </div>
                </div>

                <!-- 画布容器 -->
                <div class="editor-workspace" @dragover.prevent @dragenter.prevent @drop.prevent="handleDrop">
                    <div class="editor-content-full">
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
                                    <label>��度</label>
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
import { buildExportContent } from './exportContentFrame.js';
import NumberInput from '../../components/NumberInput.vue';


// 状态定义
const currentTool = ref('components');
const currentDevice = ref('desktop');
const zoom = ref(1);
const selectedComponent = ref(null);
const pageComponents = ref([]); // 存储页面中的组件
const isPreviewMode = ref(false);
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
            { id: 'checkbox', name: '复选框', icon: '��️' },
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



// 方法定义
const handleToolClick = (tool) => {
    currentTool.value = tool;
};

const switchDevice = (device) => {
    currentDevice.value = device;
    updatePreviewDevice(device);
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

    // 添加消息监听器
    window.addEventListener('message', (event) => {
        if (event.data.type === 'componentSelected') {
            handleComponentSelect(event.data.componentId);
        }
        // ... 其他消息处理 ...
    });
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
    console.log('Starting export process...');

    if (!htmlContent) {
        console.error('No content to export');
        window.$message?.error('导出失败：没有可导出的内容');
        return;
    }

    try {
        // 添加必要的依赖和样式
        const exportContent = buildExportContent(getComponentStyles,handleBehavior,htmlContent)

        // 创建并下载文件
        const blob = new Blob([exportContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const fileName = `page-${new Date().getTime()}.html`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        window.$message?.success('页面导出成功！');
    } catch (error) {
        console.error('Export failed:', error);
        window.$message?.error(`导出失败：${error.message}`);
    }
};

// 获取组件样式
const getComponentStyles = () => {
    // 从 componentConfigs 中提取所有组件的基础样式
    return Object.values(componentConfigs)
        .map(config => config.defaultStyle)
        .filter(Boolean)
        .map(style => styleObjectToCss(style))
        .join('\n');
};

// 样式对象转CSS
const styleObjectToCss = (styleObj) => {
    return Object.entries(styleObj)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n');
};

// 添加组件选择处理函数
const handleComponentSelect = (componentId) => {
    // 从 pageComponents 中找到对应的组件
    selectedComponent.value = pageComponents.value.find(
        comp => comp.id === componentId
    );
};

</script>

<style scoped>
/* 只保留特定的编辑器布局样式 */
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

/* 预览框架特定样式 */
.preview-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
    border-radius: 4px;
}

/* 工具栏分隔符 */
.toolbar-separator {
    width: 1px;
    height: 24px;
    background: var(--cc-border-color);
    margin: 0 8px;
}

/* 缩放控制特定样式 */
.zoom-value {
    padding: 0 8px;
    font-size: 13px;
    min-width: 60px;
    text-align: center;
}

/* 节点操作按钮 */
.node-actions {
    opacity: 0;
    transition: opacity 0.2s;
}

.component-tree-node:hover .node-actions {
    opacity: 1;
}

/* 删除按钮特定样式 */
.delete-btn {
    padding: 2px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--cc-theme-error);
}

.delete-btn:hover {
    background: rgba(255, 0, 0, 0.1);
}

/* 编辑器主区域特定布局 */
.editor-main {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
}

/* 编辑器工具栏特定布局 */
.editor-toolbar {
    height: 48px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

/* 编辑器内容区域样式 */
.editor-content-full {
    width: 100%;
    height: 100%;
    position: relative;
}
</style>