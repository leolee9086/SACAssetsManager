import { computed, ref, watch } from '../../../../../../static/vue.esm-browser.js'
export const previewState = ref({
    lastFullRenderTime: 0,
    lastAdjustmentTime: 0,
    isAdjusting: false,
    previewTimeout: null,
    thumbnailCache: null,
    pendingFullRender: false,
    currentController: new AbortController(),  // 确保初始化时就有 controller
    renderVersion: 0
});
export const 重置所有状态 = () => {
    previewState.value.lastFullRenderTime = 0
    previewState.value.lastAdjustmentTime = 0
    previewState.value.isAdjusting = false
    previewState.value.previewTimeout = null
    previewState.value.thumbnailCache = null
    previewState.value.pendingFullRender = false
    previewState.value.currentController = new AbortController()
    previewState.value.renderVersion = 0
}

export { 历史队列, 文件历史管理器 } from './globalHistory.js'
export { effectStack, 效果堆栈管理器 } from './effectStack.js'
export { cropBox, 裁剪框控制器 } from './cropBoxController.js'
export const $hasGeometryChanges = (editorState, perspectiveMode, isResizeMode, isCropMode, isStackMode) => {
    const activeMode = editorState.value.activeMode
    if (!activeMode) return false
    switch (activeMode) {
        case 'perspective':
            return perspectiveMode.value  /* 检查是否有透视变换 */
        case 'resize':
            return isResizeMode.value  /* 检查是否修改了尺寸 */
        case 'crop':
            return isCropMode.value /* 检查是否设置了裁剪区域 */
        case 'stack':
            return isStackMode.value  /* 检查是否有堆栈更改 */
        default:
            return false
    }
}

export const $isViewModeLocked = (editorState) => {
    ['perspective', 'resize', 'crop'].includes(editorState.value.activeMode)

}

export const $perspectiveModeState = (editorState, stateTransition, isStackMode, viewState) => {
    return {
        get: () => editorState.value.geometry.perspective,
        set: async (val) => {
            if (!await stateTransition.value.lock()) {
                stateTransition.value.pending = { mode: 'perspective', value: val }
                return
            }

            try {
                if (val) {
                    // 如果当前是堆栈模式,先退出
                    if (isStackMode.value) {
                        isStackMode.value = false
                    }
                    editorState.value.activeMode = 'perspective'
                    viewState.value.mode = 'processed'
                } else {
                    editorState.value.activeMode = null
                }
                editorState.value.geometry.perspective = val
            } finally {
                stateTransition.value.unlock()
            }
        }
    }
}


export const $isResizeMode = (editorState, stateTransition, viewState, isStackMode) => {
    return computed({
        get: () => editorState.value.geometry.resize,
        set: async (val) => {
            if (!await stateTransition.value.lock()) {
                stateTransition.value.pending = { mode: 'resize', value: val }
                return
            }
            try {
                if (val) {
                    if (isStackMode.value) {
                        isStackMode.value = false
                    }
                    editorState.value.activeMode = 'resize'
                    viewState.value.mode = 'processed'
                } else {
                    editorState.value.activeMode = null
                }
                editorState.value.geometry.resize = val
            } finally {
                stateTransition.value.unlock()
            }
        }
    })
}



export const $isStackMode = (
    editorState,
    stateTransition,
    imageAdjuster,
    imagePath,
    outputFormat,
    currentSharpObject,
    覆盖保存,
    添加新文件,
    loadSavedSettings
) => {
    return computed({
        get: () => editorState.value.geometry.stack,
        set: async (val) => {
            // 如果状态正在转换中,将请求加入队列
            if (!await stateTransition.value.lock()) {
                stateTransition.value.pending = { mode: 'stack', value: val }
                return
            }

            try {
                // 如果当前是堆栈模式且要退出
                if (editorState.value.geometry.stack && !val) {
                    try {
                        // 检查 imageAdjuster 引用是否存在
                        if (!imageAdjuster.value) {
                            throw new Error('图像调节器未初始化')
                        }

                        // 保存当前堆栈状态
                        const stackSettings = imageAdjuster.value?.getCurrentSettings()
                        if (stackSettings) {
                            // 生成过程文件路径
                            const processFilePath = imagePath.value.replace(/\.[^.]+$/, '_process.json')
                            // 保存过程文件
                            await 覆盖保存(processFilePath, JSON.stringify(stackSettings, null, 2))

                            // 应用当前效果并生成新图像
                            const processedImage = await currentSharpObject.value
                            const outputBuffer = await processedImage[outputFormat.value]().toBuffer()

                            // 生成新的输出文件路径
                            const outputPath = imagePath.value.replace(/\.[^.]+$/, '_stacked.' + outputFormat.value)
                            await 覆盖保存(outputPath, outputBuffer)

                            // 加载新图像
                            await 添加新文件(outputPath)

                            // 加载保存的处理设置
                            await loadSavedSettings(stackSettings)
                        }
                    } catch (error) {
                        console.error('保存堆栈状态失败:', error)
                        alert('保存堆栈状态失败: ' + error.message)
                        return
                    }
                }

                // 更新状态
                editorState.value.activeMode = val ? 'stack' : null
                editorState.value.geometry.stack = val
            } finally {
                stateTransition.value.unlock()
            }
        }

    })
}



export const $isEditMode = (editorState, stateTransition, isStackMode) => computed({
    get: () => editorState.value.activeMode === 'edit',
    set: async (val) => {
        if (!await stateTransition.value.lock()) {
            stateTransition.value.pending = { mode: 'edit', value: val }
            return
        }
        try {
            if (val) {
                // 如果当前是堆栈模式,先退出
                if (isStackMode.value) {
                    isStackMode.value = false
                }
                editorState.value.activeMode = 'edit'
            } else {
                editorState.value.activeMode = null
            }
        } finally {
            stateTransition.value.unlock()
        }
    }
})


export const $是否裁剪模式状态量 = (editorState, stateTransition, isStackMode, viewState, 初始化裁剪框) => {
    // 创建响应式引用
    const isCropMode = ref(editorState.value.geometry.crop)
    // 创建监听器处理状态变化
    watch(isCropMode, async (val) => {
        if (!await stateTransition.value.lock()) {
            stateTransition.value.pending = { mode: 'crop', value: val }
            return
        }
        try {
            if (val) {
                if (isStackMode.value) {
                    isStackMode.value = false
                }
                editorState.value.activeMode = 'crop'
                viewState.value.mode = 'processed'
                初始化裁剪框()
            } else {
                editorState.value.activeMode = null
            }
            editorState.value.geometry.crop = val
        } finally {
            stateTransition.value.unlock()
        }
    })
    return isCropMode
}


import { useResizeOptions } from './resize/useResizeOptions.js';
import { useFlips } from './resize/useFlips.js';
import { getImageDisplayRect } from '../utils/css.js';
export { useResizeOptions, useFlips }
export const $getSplitLineStyle = (getContainer, viewState) => {
    const container = getContainer();
    if (!container || viewState.value.mode !== 'split') {
        return { display: 'none' };
    }
    const splitX = container.getBoundingClientRect().width *
        (viewState.value.options.split.position / 100);
    return {
        position: 'absolute',
        left: `${splitX}px`,
        top: '0',
        height: '100%',
        transform: 'translateX(-1px)',
        pointerEvents: 'auto',
        cursor: 'col-resize',
        zIndex: 10
    };
}


export const AddSplitControllerToView = (getContainer,getImageInfo,getSacle,getOffset, viewState) => {
    const handleDrag = (moveEvent) => {
        const container = getContainer();
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = moveEvent.clientX - rect.left;
        const percentage = (mouseX / rect.width) * 100;
        viewState.value.options.split.position = Math.max(0, Math.min(100, percentage));
    };
    const handleDragEnd = () => {
        viewState.value.options.split.isDragging = false;
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
    };
    const handleSplitDrag = (e) => {
        e.preventDefault();
        viewState.value.options.split.isDragging = true;
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
    }
    const getSplitLineStyle=computed(
        () => $getSplitLineStyle(getContainer, viewState)
    )
    const getClipStyle = computed(() => {
        if (viewState.value.mode !== 'split') {
            return {};
        }
        const container = getContainer();
        if (!container) return {};
    
        const rect = container.getBoundingClientRect();
        const imageRect = getImageDisplayRect(rect, getImageInfo(), getSacle(), getOffset());
        const splitX = rect.width * (viewState.value.options.split.position / 100);
        let clipPercentage;
        if (imageRect.scaledWidth === 0) {
            clipPercentage = viewState.value.options.split.position;
        } else {
            const imageLeft = imageRect.actualLeft;
            const imageRight = imageLeft + imageRect.scaledWidth;
            clipPercentage = Math.max(0, Math.min(100,
                ((splitX - imageLeft) / (imageRight - imageLeft)) * 100
            ));
        }
        return {
            clipPath: `inset(0 ${100 - clipPercentage}% 0 0)`,
            willChange: 'clip-path'
        };
    });
    
    return {
        handleDrag, 
        handleDragEnd,
        handleSplitDrag,
        getSplitLineStyle,
        getClipStyle
    }
}


