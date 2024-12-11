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
                            <component :is="renderPanelContent(activeLeftPanel)" />
                        </LayoutColumn>
                        <ResizeHandle
                            v-if="activeLeftPanel && leftPanelRef"
                            :target="leftPanelRef.$el"
                            direction="width"
                            @resize="handlePanelResize(activeLeftPanel, $event)"
                        />

                        <!-- 主内容区域 -->
                        <LayoutColumn :autoGrow="true">

                            <LayoutRow :autoGrow="true" class="cc-main-content" :class="{
                                'with-left-panel': activeLeftPanel,
                                'with-right-panel': activeRightPanel
                            }">
                                <!-- 原有的主要内容 -->
                                <!-- ... -->
                                <!-- 主内容区域 -->
                                <LayoutColumn :autoGrow="true">

                                </LayoutColumn>

                            </LayoutRow>
                        </LayoutColumn>
                        <!-- 调整右侧面板和 ResizeHandle 的顺序 -->
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
                            <component :is="renderPanelContent(activeRightPanel)" />
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
import LayoutRow from '../../../../components/common/layout/layoutRow.vue';
import LayoutColumn from '../../../../components/common/layout/layoutColumn.vue';
import LayoutRoot from '../../../../components/common/layout/layoutRoot.vue';
import ResizeHandle from '../../../../components/common/layout/resizeHandle.vue';
// Dock 管理相关状态
const activeLeftPanel = ref(null);
const activeRightPanel = ref(null);

// 添加面板用
const leftPanelRef = ref(null);
const rightPanelRef = ref(null);
const showResizeHandle = ref(false);

// 分别定义左右侧面板
const leftPanels = computed(() => ([
    {
        id: 'fileTree',
        title: '文档树',
        icon: '#iconFiles',
        hotkey: '⌥1',
        width: 349,
        position: 'left'
    },
    {
        id: 'bookmark',
        title: '书签',
        icon: '#iconBookmark',
        hotkey: '⌥3',
        width: 232,
        position: 'left'
    }
]));

const rightPanels = computed(() => ([
    {
        id: 'outline',
        title: '大纲',
        icon: '#iconAlignCenter',
        hotkey: '⌥2',
        width: 250,
        position: 'right'
    },
    {
        id: 'backlinks',
        title: '反向链接',
        icon: '#iconlink',
        hotkey: '⌥4',
        width: 300,
        position: 'right'
    }
]));

// 合并所有面板配置
const allPanels = computed(() => [...leftPanels.value, ...rightPanels.value]);

// 切换面板显示状态
const togglePanel = (panelId) => {
    const panel = allPanels.value.find(p => p.id === panelId);
    if (panel.position === 'left') {
        activeLeftPanel.value = activeLeftPanel.value === panelId ? null : panelId;
    } else {
        activeRightPanel.value = activeRightPanel.value === panelId ? null : panelId;
    }
};


// 渲染左侧 dock 按钮
const renderLeftDockButtons = () => {
    return (
        <LayoutColumn class="cc-left-dock dock dock--vertical" id="dockLeft" autoGrow={false} >
            <div class="dock__items">
                {leftPanels.value.map(panel => (
                    <span
                        key={panel.id}
                        class={[
                            'dock__item',
                            'ariaLabel',
                            { 'dock__item--active': (panel.position === 'left' ? activeLeftPanel.value : activeRightPanel.value) === panel.id }
                        ]}
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
                    >
                        <svg><use xlink:href={panel.icon}></use></svg>
                    </span>
                ))}
            </div>
        </LayoutColumn>
    );
};

// 渲染右侧 dock 按钮
const renderRightDockButtons = () => {
    return (
        <LayoutColumn class="cc-right-dock dock dock--vertical" id="dockRight" autoGrow={false}>
            <div class="dock__items">
                {rightPanels.value.map(panel => (
                    <span
                        key={panel.id}
                        class={[
                            'dock__item',
                            'ariaLabel',
                            { 'dock__item--active': (panel.position === 'right' ? activeRightPanel.value : activeLeftPanel.value) === panel.id }
                        ]}
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
                    >
                        <svg><use xlink:href={panel.icon}></use></svg>
                    </span>
                ))}
            </div>
        </LayoutColumn>
    );
};

// 渲染面板内容
const renderPanelContent = (panelId) => {
    switch (panelId) {
        case 'fileTree':
            return (
                <LayoutColumn class="panel-content" autoGrow={false}>
                    {/* 文件树面板内容 */}
                </LayoutColumn>
            );
        case 'bookmark':
            return (
                <LayoutColumn class="panel-content" autoGrow={false}>
                    {/* 书签面板内容 */}
                </LayoutColumn>
            );
        case 'outline':
            return (
                <LayoutColumn class="panel-content" autoGrow={false}>
                    {/* 大纲面板内容 */}
                </LayoutColumn>
            );
        case 'backlinks':
            return (
                <LayoutColumn class="panel-content" autoGrow={false}>
                    {/* 反向链接面板内容 */}
                </LayoutColumn>
            );
        default:
            return null;
    }
};

// 快捷键处理
const handleHotkey = (e) => {
    if (e.altKey) {
        const panel = allPanels.value.find(p => p.hotkey === `⌥${e.key}`);
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
    
    const defaultWidth = allPanels.value.find(p => p.id === panelId)?.width || 300;
    panelWidths.value.set(panelId, defaultWidth);
    return defaultWidth;
};

// 优化面板拖拽调整大小的处理函数
const handlePanelResize = (panelId, delta) => {
    if (!panelId) return;
    
    const currentWidth = getPanelWidth(panelId);
    let newWidth;
    
    // 根据面板位置处理宽度变化
    const panel = allPanels.value.find(p => p.id === panelId);
    if (panel.position === 'right') {
        newWidth = currentWidth - delta;  // 右侧面板反向处理差值
    } else {
        newWidth = currentWidth + delta;  // 左侧面板正向处理��值
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
</script>

<style>
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

</style>