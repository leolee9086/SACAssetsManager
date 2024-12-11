<template>

    <LayoutRoot :fullscreen="false" class="cc-layout-root">
        <!-- 左侧 Dock 按钮区域 -->
        <LayoutColumn :autoGrow="true">
            <LayoutRow :autoGrow="true">
            <component :is="renderLeftDockButtons" />
            <LayoutColumn :autoGrow="true">
                <LayoutColumn :autoGrow="true">

                    <LayoutRow class="cc-content-viewer" :autoGrow="true">
                        <!-- 左侧面板区域 -->
                        <LayoutColumn v-if="activeLeftPanel"
                            ref="leftPanelRef"
                            class="cc-panel cc-panel-left" :autoGrow="false"
                            :style="{ width: `${getPanelWidth(activeLeftPanel)}px` }"
                        >
                            <Wnd
                                id="leftPanel"
                                :tabs="getLeftPanelTabs()"
                                :renderers="leftPanelRenderers"
                                :config="{
                                    singleTab: true,
                                    hideControls: true,
                                    closable: false
                                }"
                                @tab-switch="handleTabSwitch"
                            />
                        </LayoutColumn>
                        <ResizeHandle
                            v-if="activeLeftPanel && leftPanelRef"
                            :target="leftPanelRef.$el"
                            direction="width"
                            @resize="handlePanelResize(activeLeftPanel, $event)"
                        />

                        <!-- 主内容区域 -->
                        <LayoutColumn :autoGrow="true">
                            <Wnd
                                id="mainEditor"
                                :tabs="editorTabs"
                                :renderers="editorRenderers"
                                :config="{
                                    singleTab: false,
                                    closable: true,
                                    floatable: true
                                }"
                                @tab-switch="handleEditorTabSwitch"
                                @tab-close="handleEditorTabClose"
                            />
                        </LayoutColumn>

                        <!-- 右侧面板区域 -->
                        <ResizeHandle
                            v-if="activeRightPanel && rightPanelRef"
                            :target="rightPanelRef.$el"
                            direction="width"
                            @resize="handlePanelResize(activeRightPanel, $event)"
                        />
                        <LayoutColumn v-if="activeRightPanel"
                            ref="rightPanelRef"
                            class="cc-panel cc-panel-right"
                            :autoGrow="false"
                            :style="{ width: `${getPanelWidth(activeRightPanel)}px` }"
                        >
                            <Wnd
                                id="rightPanel"
                                :tabs="getRightPanelTabs()"
                                :renderers="rightPanelRenderers"
                                :config="{
                                    singleTab: true,
                                    hideControls: true,
                                    closable: false
                                }"
                                @tab-switch="handleTabSwitch"
                            />
                        </LayoutColumn>
                    </LayoutRow>
                </LayoutColumn>

            </LayoutColumn>
            <!-- 右侧 Dock 按钮区域 -->
            <component :is="renderRightDockButtons" />
            <!-- 添加底部状态栏 -->
            </LayoutRow>
            <LayoutRow class="cc-status-bar" :autoGrow="false">
                <div class="status-bar-left">
                    <span class="status-item">就绪</span>
                </div>
                <div class="status-bar-right">
                    <span class="status-item">UTF-8</span>
                    <span class="status-item">行: 1, 列: 1</span>
                </div>
            </LayoutRow>
        </LayoutColumn>
    </LayoutRoot>
</template>

<script setup lang="jsx">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import LayoutRow from '../../../components/common/layout/layoutRow.vue';
import LayoutColumn from '../../../components/common/layout/layoutColumn.vue';
import LayoutRoot from '../../../components/common/layout/layoutRoot.vue';
import ResizeHandle from '../../../components/common/layout/resizeHandle.vue';
import Wnd from '../../../components/common/layout/wnd.vue';
import { createRenderer } from '../renderers/registry.js';
import { RendererType } from '../renderers/base.js';

// Dock 管理相关状态
const activeLeftPanel = ref(null);
const activeRightPanel = ref(null);

// 添加面板用
const leftPanelRef = ref(null);
const rightPanelRef = ref(null);
const showResizeHandle = ref(false);

// 定义面板配置
const panelConfig = {
  left: [
    {
      id: 'fileTree',
      title: '文档树',
      icon: '#iconFiles',
      hotkey: '⌥1',
      width: 349,
      position: 'left',
      rendererType: RendererType.FILE_TREE,
      rendererOptions: {}
    },
    {
      id: 'bookmark',
      title: '书签',
      icon: '#iconBookmark',
      hotkey: '⌥3',
      width: 232,
      position: 'left',
      rendererType: RendererType.BOOKMARK,
      rendererOptions: {}
    }
  ],
  right: [
    {
      id: 'outline',
      title: '大纲',
      icon: '#iconAlignCenter',
      hotkey: '⌥2',
      width: 250,
      position: 'right',
      rendererType: RendererType.OUTLINE,
      rendererOptions: {}
    },
    {
      id: 'backlinks',
      title: '反向链接',
      icon: '#iconlink',
      hotkey: '⌥4',
      width: 300,
      position: 'right',
      rendererType: RendererType.BACKLINKS,
      rendererOptions: {}
    }
  ]
};

// 创建面板渲染器
const createPanelRenderers = (panels) => {
  const renderers = {};
  panels.forEach(panel => {
    renderers[panel.id] = createRenderer(panel.rendererType, panel.rendererOptions);
  });
  return renderers;
};

// 左侧面板渲染器
const leftPanelRenderers = computed(() => 
  createPanelRenderers(panelConfig.left)
);

// 右侧面板渲染器
const rightPanelRenderers = computed(() => 
  createPanelRenderers(panelConfig.right)
);

// 编辑器标签页
const editorTabs = ref([
  { 
    id: 'editor1', 
    title: '文档1.md',
    rendererType: RendererType.EDITOR,
    rendererOptions: {
      value: '# 文档1',
      vditorOptions: {
        // Vditor特定选项
      }
    }
  }
]);

// 编辑器渲染器
const editorRenderers = computed(() => {
  const renderers = {};
  editorTabs.value.forEach(tab => {
    renderers[tab.id] = createRenderer(
      tab.rendererType, 
      tab.rendererOptions
    );
  });
  return renderers;
});

// 获取面板标签页配置
const getLeftPanelTabs = () => {
  if (!activeLeftPanel.value) return [];
  // 只返回当前激活的面板配置
  const activePanel = panelConfig.left.find(p => p.id === activeLeftPanel.value);
  return activePanel ? [activePanel] : [];
};

// 同样修改右侧面板的获取方法
const getRightPanelTabs = () => {
  if (!activeRightPanel.value) return [];
  // 只返回当前激活的面板配置
  const activePanel = panelConfig.right.find(p => p.id === activeRightPanel.value);
  return activePanel ? [activePanel] : [];
};

// 渲染左侧 dock 按钮
const renderLeftDockButtons = () => (
    <LayoutColumn class="cc-left-dock dock dock--vertical" id="dockLeft" autoGrow={false}>
        <div class="dock__items">
            {panelConfig.left.map(panel => (
                <span
                    key={panel.id}
                    class={{
                        'dock__item': true,
                        'ariaLabel': true,
                        'dock__item--active': activeLeftPanel.value === panel.id
                    }}
                    data-height="0"
                    data-width={panel.width}
                    data-type={panel.id}
                    data-hotkey={panel.hotkey}
                    data-title={panel.title}
                    onClick={() => togglePanel(panel.id)}
                    aria-label={`
                        <span style='white-space:pre'>${panel.title} ${panel.hotkey}
                        单击 <span class='ft__on-surface ft__nowrap'>展开/最小化</span>
                        右键/拖拽 <span class='ft__on-surface ft__nowrap'>调整位置</span></span>
                    `}
                    draggable={true}
                    onDragstart={event => handleDragStart(event, panel)}
                    onDragend={event => handleDragEnd(event)}
                    onDragover={event => handleDragOver(event, panel.position)}
                    onDrop={event => handleDrop(event, panel.position)}
                >
                    <svg><use xlinkHref={panel.icon}></use></svg>
                </span>
            ))}
        </div>
    </LayoutColumn>
);

// 渲染右侧 dock 按钮
const renderRightDockButtons = () => (
    <LayoutColumn class="cc-right-dock dock dock--vertical" id="dockRight" autoGrow={false}>
        <div class="dock__items">
            {panelConfig.right.map(panel => (
                <span
                    key={panel.id}
                    class={{
                        'dock__item': true,
                        'ariaLabel': true,
                        'dock__item--active': activeRightPanel.value === panel.id
                    }}
                    data-height="0"
                    data-width={panel.width}
                    data-type={panel.id}
                    data-hotkey={panel.hotkey}
                    data-title={panel.title}
                    onClick={() => togglePanel(panel.id)}
                    aria-label={`
                        <span style='white-space:pre'>${panel.title} ${panel.hotkey}
                        单击 <span class='ft__on-surface ft__nowrap'>展开/最小化</span>
                        右键/拖拽 <span class='ft__on-surface ft__nowrap'>调整位置</span></span>
                    `}
                    draggable={true}
                    onDragstart={event => handleDragStart(event, panel)}
                    onDragend={event => handleDragEnd(event)}
                    onDragover={event => handleDragOver(event, panel.position)}
                    onDrop={event => handleDrop(event, panel.position)}
                >
                    <svg><use xlinkHref={panel.icon}></use></svg>
                </span>
            ))}
        </div>
    </LayoutColumn>
);

// 切换面板显示状态
const togglePanel = (panelId) => {
  // 在所有面板中查找匹配的面板
  const panel = [...panelConfig.left, ...panelConfig.right].find(p => p.id === panelId);
  if (!panel) return;

  if (panel.position === 'left') {
    // 如果点击的是当前激活的左侧面板，则关闭它
    if (activeLeftPanel.value === panelId) {
      activeLeftPanel.value = null;
    } else {
      // 否则激活新面板
      activeLeftPanel.value = panelId;
    }
  } else {
    // 如果点击的是当前激活的右侧面板，则关闭它
    if (activeRightPanel.value === panelId) {
      activeRightPanel.value = null;
    } else {
      // 否则激活新面板
      activeRightPanel.value = panelId;
    }
  }
};

// 快捷键处理
const handleHotkey = (e) => {
    if (e.altKey) {
        const panel = panelConfig.left.find(p => p.hotkey === `⌥${e.key}`);
        if (panel) {
            togglePanel(panel.id);
        }
    }
};

// 面板宽度状态管理
const panelWidths = ref(new Map());

// 获取面板宽度
const getPanelWidth = (panelId) => {
  const savedWidth = panelWidths.value.get(panelId);
  if (savedWidth) return savedWidth;
  
  // 从配置中查找默认宽度
  const panel = [...panelConfig.left, ...panelConfig.right].find(p => p.id === panelId);
  const defaultWidth = panel?.width || 300;
  
  panelWidths.value.set(panelId, defaultWidth);
  return defaultWidth;
};

// 优化面板拖拽调整大小的处理函数
const handlePanelResize = (panelId, delta) => {
  if (!panelId) return;
  
  // 查找面板配置
  const panel = [...panelConfig.left, ...panelConfig.right].find(p => p.id === panelId);
  if (!panel) return;
  
  const currentWidth = getPanelWidth(panelId);
  let newWidth;
  
  // 根据面板位置处理宽度变化
  if (panel.position === 'right') {
    newWidth = currentWidth - delta;  // 右侧面板反向处理差值
  } else {
    newWidth = currentWidth + delta;  // 左侧面板正向处理差值
  }
  
  // 限制宽度范围
  newWidth = Math.min(Math.max(newWidth, 200), 800);
  
  // 更新状态
  panelWidths.value.set(panelId, newWidth);
  panelWidths.value = new Map(panelWidths.value);
  
  // 保存到 localStorage
  debounceSavePanelWidths();
};

// 添加 debounce 工具函数
function debounce(fn, wait) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, wait);
    };
}

// 防抖保存
const debounceSavePanelWidths = debounce(() => {
    try {
        const widthsData = Array.from(panelWidths.value.entries());
        localStorage.setItem('panelWidths', JSON.stringify(widthsData));
    } catch (e) {
        console.error('Failed to save panel widths:', e);
    }
}, 300);

// 初始化时加载保存的面板宽度
onMounted(() => {
    try {
        const savedWidths = localStorage.getItem('panelWidths');
        if (savedWidths) {
            panelWidths.value = new Map(JSON.parse(savedWidths));
        }
    } catch (e) {
        console.error('Failed to load panel widths:', e);
    }
});

onMounted(() => {
    window.addEventListener('keydown', handleHotkey);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleHotkey);
});

// 监听面板显示状态
watch(() => activeLeftPanel.value, async (newVal) => {
    if (newVal) {
        await nextTick();
        showResizeHandle.value = true;
    } else {
        showResizeHandle.value = false;
    }
});

// 处理编辑器标签页切换
const handleEditorTabSwitch = (tabId) => {
    console.log('Editor tab switched:', tabId);
    // 这里可以添加额外的编辑器切换逻辑
};

// 处理编辑器标签页关闭
const handleEditorTabClose = (tabId) => {
    editorTabs.value = editorTabs.value.filter(tab => tab.id !== tabId);
    // 编辑器实例的清理现在由 Wnd 组件通过 renderer 的 unmount 方法处理
};

// 组件卸载时的清理
onUnmounted(() => {
    // 不再需要手动清理编辑器实例，因为 Wnd 组件会处理
});

// 处理标签页切换
const handleTabSwitch = (tabId) => {
    console.log('Panel tab switched:', tabId);
};

// 拖拽相关状态
const draggedPanel = ref(null);
const dragTarget = ref(null);

// 处理拖拽开始
const handleDragStart = (e, panel) => {
  draggedPanel.value = panel;
  e.dataTransfer.effectAllowed = 'move';
  // 设置一个透明的拖拽图像
  const dragImage = document.createElement('div');
  dragImage.style.opacity = '0';
  document.body.appendChild(dragImage);
  e.dataTransfer.setDragImage(dragImage, 0, 0);
  setTimeout(() => document.body.removeChild(dragImage), 0);
};

// 处理拖拽结束
const handleDragEnd = () => {
  draggedPanel.value = null;
  dragTarget.value = null;
};

// 处理拖拽悬停
const handleDragOver = (e, targetPosition) => {
  e.preventDefault();
  dragTarget.value = targetPosition;
};

// 处理拖拽放置
const handleDrop = (e, targetPosition) => {
  e.preventDefault();
  if (!draggedPanel.value) return;

  const panel = [...panelConfig.left, ...panelConfig.right].find(p => p.id === draggedPanel.value.id);
  if (!panel) return;

  // 更新面板位置
  panel.position = targetPosition;
  
  // 更新激活状态
  if (targetPosition === 'left') {
    if (activeRightPanel.value === panel.id) {
      activeRightPanel.value = null;
    }
    activeLeftPanel.value = panel.id;
  } else {
    if (activeLeftPanel.value === panel.id) {
      activeLeftPanel.value = null;
    }
    activeRightPanel.value = panel.id;
  }
};
</script>

<style>
@import "https://esm.sh/vditor/dist/index.css";

.cc-content-viewer {
    overflow: hidden;
    flex: 1;
    display: flex;
    width: 100%;
    min-width: 0;
}

.cc-left-panel {
    padding: var(--cc-space-md);
    border-right: 1px solid var(--cc-border-color);
    background: var(--cc-background-secondary);
}

.cc-right-panel {
    flex: 1;
    padding: var(--cc-space-md);
    overflow-y: auto;
}

/* 移除不再需要的flex相关样式 */
.cc-button-group,
.cc-source-panel {
    width: 100%;
}

/* 其他样式保持不变 */
.cc-loading {
    padding: var(--cc-space-sm);
    text-align: center;
    color: var(--cc-theme-primary);
}

.cc-alert {
    padding: var(--cc-space-sm);
    border-radius: var(--cc-radius-sm);
}

.cc-alert--error {
    background-color: var(--cc-theme-error-light);
    color: var(--cc-theme-error);
    border: 1px solid var(--cc-theme-error);
}

.cc-button {
    padding: var(--cc-space-sm) var(--cc-space-md);
    border-radius: var(--cc-radius-sm);
    background-color: var(--cc-theme-primary);
    color: var(--cc-theme-on-primary);
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
}

.cc-button:hover {
    background-color: var(--cc-theme-primary-dark);
}

.cc-copy-button {
    margin-left: var(--cc-space-sm);
    padding: var(--cc-space-xs) var(--cc-space-sm);
    background-color: var(--cc-theme-secondary);
    color: var(--cc-theme-on-secondary);
    border: none;
    cursor: pointer;
    border-radius: var(--cc-radius-sm);
}

.cc-copy-button:hover {
    background-color: var(--cc-theme-secondary-dark);
}

/* 添加新的样式 */
.cc-panel {
    position: relative;
    min-width: 200px;
    max-width: 800px;
    will-change: width;
    transform: translateZ(0);
}

.cc-panel-right {
    /* 移除所有边界线相关样式 */
}

.cc-main-content {
    flex: 1;
    transition: margin 0.3s ease;
}



.dock {
    display: flex;
    flex-direction: column;
}

.cc-left-dock {
    border-right: 1px solid var(--cc-border-color);
}

.cc-right-dock {
    border-left: 1px solid var(--cc-border-color);
}

.dock__item {
    cursor: pointer;
    padding: 8px;
    transition: background-color 0.3s;
}

.dock__item--active {
    background-color: var(--cc-theme-primary-light);
}

/* 左侧面板动画 */
.slide-left-enter-active,
.slide-left-leave-active {
    display: none;
}

.slide-right-enter-active,
.slide-right-leave-active {
    display: none;
}

:deep(.cc-layout-root) {
    display: flex;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

/* 添加状态栏样式 */
.cc-status-bar {
    height: 22px;
    background-color: var(--cc-background-secondary);
    border-top: 1px solid var(--cc-border-color);
    padding: 0 var(--cc-space-sm);
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--cc-text-secondary);
}

.status-bar-left,
.status-bar-right {
    display: flex;
    align-items: center;
    gap: var(--cc-space-sm);
}

.status-item {
    padding: 0 var(--cc-space-sm);
}



.cc-panel:hover .layout__resize {
    opacity: 1;
}

.layout__resize {
    touch-action: none;
    user-select: none;
}

/* 添加Vditor容器样式 */
.vditor-container {
    height: 100%;
    width: 100%;
}

/* 确保Wnd内容区域正确显�� */
.cc-wnd__content {
    height: 100%;
    overflow: auto;
}
</style>