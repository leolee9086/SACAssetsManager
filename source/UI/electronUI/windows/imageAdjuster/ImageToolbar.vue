<template>
    <div class="tools-sidebar">
        <!-- 几何变换工具组 -->
        <div class="tool-button" @click="canUseGeometryTools && onRotate(-90)" :class="{
            disabled: !canUseGeometryTools,
            active: rotation !== 0
        }" title="向左旋转">
            <span class="icon">↶</span>
        </div>
        <div class="tool-button" @click="canUseGeometryTools && onRotate(90)" :class="{
            disabled: !canUseGeometryTools,
            active: rotation !== 0
        }" title="向右旋转">
            <span class="icon">↷</span>
        </div>
        <div class="tool-button" @click="canUseGeometryTools && onFlip('horizontal')" :class="{
            disabled: !canUseGeometryTools,
            active: flips.horizontal
        }" title="水平翻转">
            <span class="icon">↔</span>
        </div>
        <div class="tool-button" @click="canUseGeometryTools && onFlip('vertical')" :class="{
            disabled: !canUseGeometryTools,
            active: flips.vertical
        }" title="垂直翻转">
            <span class="icon">↕</span>
        </div>
        <div class="tool-button separator"></div>
        <!-- 编辑工具组 -->
        <div class="tool-button" @click="onTogglePerspectiveMode" :class="{ active: perspectiveMode }" title="透视校正">
            <span class="icon">⟁</span>
        </div>
        <div class="tool-button" @click="onToggleResizeMode" :class="{ active: isResizeMode }" title="缩放">
            <span class="icon">⤧</span>
        </div>
        <div class="tool-button" @click="onToggleStackMode" :class="{ active: isStackMode }" title="堆栈">
            <span class="icon">🎚️</span>
        </div>
        <div class="tool-button" @click="onToggleEditMode" :class="{ active: isEditMode }" title="编辑模式">
            <span class="icon">✎</span>
        </div>
        <div class="tool-button" @click="onToggleCropMode" :class="{ active: isCropMode }" title="裁剪">
            <span class="icon">✂</span>
        </div>

        <div class="tool-button separator"></div>

        <!-- 视图模式组 -->
        <div class="tool-button" @click="onToggleProcessedOnlyView" :class="{ active: isProcessedOnlyView }" title="仅处理后">
            <span class="icon">▣</span>
        </div>
        <div class="tool-button" @click="onToggleSplitView" :class="{ active: isSplitViewEnabled }" title="裂像预览">
            <span class="icon">◫</span>
        </div>
    </div>
</template>

<script setup>
defineProps({
    rotation: Number,
    flips: Object,
    perspectiveMode: Boolean,
    isResizeMode: Boolean,
    isStackMode: Boolean,
    isEditMode: Boolean,
    isCropMode: Boolean,
    isProcessedOnlyView: Boolean,
    isSplitViewEnabled: Boolean,
    canUseGeometryTools: Boolean
})

const emit = defineEmits([
    'rotate',
    'flip',
    'toggle-perspective-mode',
    'toggle-resize-mode',
    'toggle-stack-mode',
    'toggle-edit-mode',
    'toggle-crop-mode',
    'toggle-processed-only-view',
    'toggle-split-view'
])

// 事件处理方法
const onRotate = (degrees) => emit('rotate', degrees)
const onFlip = (direction) => emit('flip', direction)
const onTogglePerspectiveMode = () => emit('toggle-perspective-mode')
const onToggleResizeMode = () => emit('toggle-resize-mode')
const onToggleStackMode = () => emit('toggle-stack-mode')
const onToggleEditMode = () => emit('toggle-edit-mode')
const onToggleCropMode = () => emit('toggle-crop-mode')
const onToggleProcessedOnlyView = () => emit('toggle-processed-only-view')
const onToggleSplitView = () => emit('toggle-split-view')
</script>

<style scoped>
.tools-sidebar {
    width: 40px;
    background: #2a2a2a;
    border-radius: 4px;
    margin-right: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 0;
}

.tool-button {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    transition: all 0.2s;
    position: relative;
}

.tool-button:hover {
    background: #3a3a3a;
}

.tool-button.active {
    background: #dd6515;
}

.tool-button .icon {
    font-size: 20px;
}

.separator {
    height: 1px;
    background: #3a3a3a;
    margin: 4px 0;
}

.tool-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: #666;
}

.tool-button.disabled:hover {
    background: transparent;
}
</style>
