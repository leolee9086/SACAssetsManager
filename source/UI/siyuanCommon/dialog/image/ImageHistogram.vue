<template>
    <div class="histogram-wrapper" style="height: calc(100vh - 71px)">
        <!-- 左侧图像预览区域 -->
        <div class="toolbar">
            <button class="open-file-btn" @click="openNewFile">
                打开文件
            </button>
        </div>
        <div class="preview-section">
            <div class="image-container" 
                 @wheel="handleWheel"
                 @mousedown="handleMouseDown"
                 @mousemove="handleMouseMove"
                 @mouseup="handleMouseUp"
                 @mouseleave="handleMouseUp">
                <div class="comparison-container" ref="comparisonContainer">
                    <!-- 原始图像 -->
                    <img ref="processedImg"
                         :style="getImageStyle()" 
                         alt="处理后图像" />
                    <!-- 处理后的图像 -->
                    <img ref="originalImg" 
                         :style="[getImageStyle(), getClipStyle()]" 
                         alt="原始图像" />
                    <!-- 分割线 -->
                    <div class="split-line" 
                         :style="getSplitLineStyle"
                         @mousedown.stop="handleSplitDrag">
                        <div class="split-handle"></div>
                    </div>
                </div>
            </div>
            <div class="image-info">
                <div class="info-item">图像路径: {{ imagePath }}</div>
                <div class="info-item">原始尺寸: {{ originalImageInfo?.width || 0 }}*{{ originalImageInfo?.height || 0 }}</div>
            </div>
        </div>

        <!-- 右侧控制面板 -->
        <div class="control-section">
            <HistogramPanel v-model:channels="channels" :sharp-object="currentSharpObject"
                @histogram-updated="handleHistogramUpdate" />

            <ImageAdjuster ref="imageAdjuster" @update:processing="handleProcessingUpdate" />
        </div>

        <!-- 添加性能监控面板 -->
        <div class="performance-panel">
            <div class="performance-item">
                处理时间: {{ performanceStats.processingTime || 0 }} ms
            </div>
            <div class="performance-item">
                内存使用: {{ performanceStats.memoryUsage || 0 }} MB
            </div>
        </div>
    </div>
</template>

<script setup>
import HistogramPanel from './HistogramPanel.vue';
import ImageAdjuster from './ImageAdjuster.vue';
import { ref, computed, inject, toRef, onUnmounted } from 'vue';
import { onMounted, shallowRef } from '../../../../../static/vue.esm-browser.js';
import { fromFilePath } from '../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';
import { requirePluginDeps } from '../../../../utils/module/requireDeps.js';
const sharp = requirePluginDeps('sharp')
const originalImageInfo = ref({})
const openNewFile = async () => {
    try {
        // 确保 controller 存在
        if (!previewState.value.currentController) {
            previewState.value.currentController = new AbortController();
        }

        // 取消当前正在进行的所有处理
        previewState.value.currentController.abort();
        previewState.value.currentController = new AbortController();

        const result = await window.require("@electron/remote").dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: '图像文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const newPath = result.filePaths[0];
            
            // 重置所有状态
            previewState.value = {
                lastFullRenderTime: 0,
                lastAdjustmentTime: 0,
                isAdjusting: false,
                previewTimeout: null,
                thumbnailCache: null,
                pendingFullRender: false,
                currentController: new AbortController(),
                renderVersion: 0
            };
            
            // 清理当前的 Sharp 对象
            if (currentSharpObject.value) {
                currentSharpObject.value = null;
            }

            // 更新路径
            imagePath.value = newPath;

            try {
                // 创建新的 Sharp 对象并获取元数据
                const originalImage = await fromFilePath(newPath);
                const metadata = await originalImage.metadata();
                
                // 更新图像信息
                originalImageInfo.value = {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format
                };

                // 设置新的 Sharp 对象
                currentSharpObject.value = originalImage;
                
                // 生成预览
                await generatePreview(originalImage);

                // 重置调整器
                await resetAdjustments();
                
            } catch (error) {
                console.error('处理新图像失败:', error);
                throw error;
            }
        }
    } catch (error) {
        console.error('打开文件失败:', error);
        // 可以在这里添加用户提示
        alert('打开文件失败，请重试');
    }
};




const appData = inject('appData')
const histogram = ref({})
const imagePath = toRef(appData.imagePath || window.imagePath)
const comparisonContainer = ref(null)
const originalImg = ref(null)
const processedImg = ref(null)
const info = ref({})
const channels = ref([
    { key: 'r', label: 'R', color: '#ff0000', visible: true },
    { key: 'g', label: 'G', color: '#00ff00', visible: true },
    { key: 'b', label: 'B', color: '#0000ff', visible: true },
    { key: 'brightness', label: '亮度', color: 'white', visible: true } // 添加亮度
]);

const imageAdjuster = ref(null);
const currentProcessing = ref(null);
const currentSharpObject = shallowRef(null);

// 添加性能监控相关的响应式数据
const performanceStats = ref({
    processingTime: 0,
    memoryUsage: 0,
    isProcessing: false
});

// 添加预览控制状态
const previewState = ref({
    lastFullRenderTime: 0,
    lastAdjustmentTime: 0,
    isAdjusting: false,
    previewTimeout: null,
    thumbnailCache: null,
    pendingFullRender: false,
    currentController: new AbortController(),  // 确保初始化时就有 controller
    renderVersion: 0
});

// 处理直方图更新
const handleHistogramUpdate = (result) => {
    info.value = result.info;
};

// 添加动态降级配置
const resolutionConfig = {
    maxPreviewSize: 1920,
    minPreviewSize: 480,
    adjustmentThreshold: {
        rapid: 100,    // 100ms内多次调整
        normal: 300,   // 300ms内多次调整
        slow: 500      // 500ms内多次调整
    },
    // 不同调整频率对应的降级尺寸
    resolutionLevels: {
        rapid: 480,    // 快速调整时使用最小尺寸
        normal: 960,   // 正常调整时使用中等尺寸
        slow: 1440,    // 缓慢调整时使用较大尺寸
        final: 1920    // 最终预览尺寸
    }
};

// 添加动态分辨率控制
const getDynamicResolution = () => {
    const now = performance.now();
    const timeSinceLastAdjustment = now - previewState.value.lastAdjustmentTime;
    
    // 更激进的降级策略
    if (timeSinceLastAdjustment < resolutionConfig.adjustmentThreshold.rapid) {
        return resolutionConfig.resolutionLevels.rapid;  // 480
    } else if (timeSinceLastAdjustment < resolutionConfig.adjustmentThreshold.normal) {
        return Math.min(
            resolutionConfig.resolutionLevels.normal,  // 960
            previewState.value.currentResolution || Infinity
        );
    }
    return resolutionConfig.resolutionLevels.slow;  // 1440
};


// 修处理更新函数
const handleProcessingUpdate = async (processingPipeline) => {
    if (!processingPipeline) return;

    try {
        // 即取消之前的处理
        if (previewState.value.currentController) {
            previewState.value.currentController.abort();
        }
        previewState.value.currentController = new AbortController();
        const { signal } = previewState.value.currentController;

        // 更新版本号
        const currentVersion = ++previewState.value.renderVersion;

        // 获取图像尺寸
        const isLargeImage = originalImageInfo.value.width > 4096 || 
                           originalImageInfo.value.height > 4096;


        if (isLargeImage) {
            // 大图像使用渐进式渲染
            // 记录调整时间
            previewState.value.lastAdjustmentTime = performance.now();
            previewState.value.isAdjusting = true;

            // 清除之前的定时器
            if (previewState.value.previewTimeout) {
                clearTimeout(previewState.value.previewTimeout);
                previewState.value.previewTimeout = null;
            }

            // 立即进行低分辨率渲染
            const lowResProcessing = async () => {
                try {
                    const resolution = getDynamicResolution();
                    const originalImage = await fromFilePath(imagePath.value);
                    const lowResBuffer = await originalImage
                        .resize(resolution, resolution, { 
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .toBuffer();

                    if (signal.aborted) return;

                    let processedImg = await sharp(lowResBuffer);
                    processedImg = await processingPipeline(processedImg);

                    if (signal.aborted) return;

                    currentSharpObject.value = processedImg;
                    await generatePreview(processedImg);

                    previewState.value.currentResolution = resolution;

                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('低分辨率处理失败:', error);
                    }
                    throw error;
                }
            };

            // 执行渐进式渲染逻辑
            await lowResProcessing();
            if (currentVersion !== previewState.value.renderVersion) return;

            // 定义分辨率提升函数
            const upgradeResolution = async () => {
                if (signal.aborted) return;

                const currentRes = previewState.value.currentResolution;
                const nextLevel = Object.values(resolutionConfig.resolutionLevels)
                    .filter(size => size > currentRes)
                    .sort((a, b) => a - b)[0];

                if (nextLevel && nextLevel <= resolutionConfig.maxPreviewSize) {
                    try {
                        const originalImage = await fromFilePath(imagePath.value);
                        const higherResBuffer = await originalImage
                            .resize(nextLevel, nextLevel, { 
                                fit: 'inside',
                                withoutEnlargement: true 
                            })
                            .toBuffer();

                        if (signal.aborted) return;

                        let processedImg = await sharp(higherResBuffer);
                        processedImg = await processingPipeline(processedImg);

                        if (signal.aborted) return;

                        currentSharpObject.value = processedImg;
                        await generatePreview(processedImg);
                        previewState.value.currentResolution = nextLevel;

                        // 继续提升分辨率
                        previewState.value.previewTimeout = setTimeout(upgradeResolution, 200);
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error('分辨率提升失败:', error);
                        }
                    }
                } else {
                    // 最终渲染原图
                    previewState.value.isAdjusting = false;
                    await processWithFullResolution(processingPipeline, signal);
                }
            };

            // 延迟开始分辨率提升
            previewState.value.previewTimeout = setTimeout(upgradeResolution, 300);

        } else {
            // 小图像直接进行全分辨率渲染
            try {
                const originalImage = await fromFilePath(imagePath.value);
                let processedImg = await processingPipeline(originalImage);

                if (signal.aborted) return;

                currentSharpObject.value = processedImg;
                await generatePreview(processedImg);

            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('图像处理失败:', error);
                }
                throw error;
            }
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('渲染已消');
        } else {
            console.error('处理图像失败:', error);
        }
    }
};

// 添加全分辨率处理函数
const processWithFullResolution = async (processingPipeline, signal) => {
    const startTime = performance.now();

    try {
        // 如果已经被取消，直接返回
        if (signal.aborted) return;

        // 重要：这里移除了额外的时间检查，因为已经在上层确保了时机
        let processedImg = await fromFilePath(imagePath.value);

        // 检查是否已取消
        if (signal.aborted) return;

        processedImg = await processingPipeline(processedImg);

        // 最终检查是否已取消
        if (signal.aborted) return;

        // 更新预览和记录渲染时间
        currentSharpObject.value = processedImg;
        await generatePreview(processedImg);
        previewState.value.lastFullRenderTime = performance.now() - startTime;

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('全分辨率处理失败:', error);
        }
        throw error;
    }
};

onMounted(async () => {
    try {
        // 初始化预览状态
        if (!previewState.value.currentController) {
            previewState.value.currentController = new AbortController();
        }

        // 初始化 Sharp 对象
        const sharpObj = await fromFilePath(imagePath.value);
        currentSharpObject.value = sharpObj;
        
        // 获取元数据
        const metadata = await sharpObj.metadata();
        originalImageInfo.value = {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
        };

        // 生成初始预览
        await generatePreview(sharpObj);

        // 初始化处理管道
        const initialProcessing = async (img) => img.clone();
        await handleProcessingUpdate(initialProcessing);

    } catch (error) {
        console.error('组件初始化失败:', error);
    }
});

// 导出保存当前设置的方法
const saveCurrentSettings = () => {
    return imageAdjuster.value?.getCurrentSettings();
};

// 导出加载设置的方法
const loadSavedSettings = (settings) => {
    imageAdjuster.value?.loadSettings(settings);
};

// 重置所有调整
const resetAdjustments = () => {
    imageAdjuster.value?.reset();
};

defineExpose({
    saveCurrentSettings,
    loadSavedSettings,
    resetAdjustments
});

// 添加新的响应式状态
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const splitPosition = ref(50)
const isSplitDragging = ref(false)

// 缩放控制 - 以鼠标位置为中心
const handleWheel = (e) => {
    e.preventDefault()
    
    const container = comparisonContainer.value
    if (!container) return
    
    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // 计算鼠标相对于当前变换后内容的位置
    const relativeX = (mouseX - offset.value.x) / scale.value
    const relativeY = (mouseY - offset.value.y) / scale.value
    
    // 计算新的缩放比例
    const oldScale = scale.value
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(0.1, oldScale * delta), 50)
    
    // 更新偏移量，保持鼠标位置不变
    offset.value = {
        x: mouseX - (relativeX * newScale),
        y: mouseY - (relativeY * newScale)
    }
    
    scale.value = newScale
}

// 分割线拖动控制
const handleMouseMove = (e) => {
    if (isDragging.value) {
        offset.value = {
            x: e.clientX - dragStart.value.x,
            y: e.clientY - dragStart.value.y
        }
    } else if (isSplitDragging.value) {
        const container = comparisonContainer.value
        if (!container) return
        
        const rect = container.getBoundingClientRect()
        const imageRect = getImageDisplayRect(rect)
        
        // 计算鼠标相对于图像显示区域的位置
        const mouseX = e.clientX - rect.left - imageRect.left
        const percentage = (mouseX / imageRect.width) * 100
        
        // 限制有效范围内
        splitPosition.value = Math.max(0, Math.min(100, percentage))
    }
}

// 计算图像实际显示区域
const getImageDisplayRect = (containerRect) => {
    if (!originalImageInfo.value.width || !originalImageInfo.value.height) {
        return {
            left: 0,
            top: 0,
            width: containerRect.width,
            height: containerRect.height,
            scale: 1
        }
    }

    const imageAspect = originalImageInfo.value.width / originalImageInfo.value.height
    const containerAspect = containerRect.width / containerRect.height
    
    let baseWidth, baseHeight
    
    // 计算基础尺寸
    if (imageAspect > containerAspect) {
        baseWidth = containerRect.width
        baseHeight = containerRect.width / imageAspect
    } else {
        baseHeight = containerRect.height
        baseWidth = containerRect.height * imageAspect
    }

    // 计算居中位置
    const baseLeft = (containerRect.width - baseWidth) / 2
    const baseTop = (containerRect.height - baseHeight) / 2

    // 应用缩放和平移，确保正确计算实际显示位置
    const scaledWidth = baseWidth * scale.value
    const scaledHeight = baseHeight * scale.value
    
    // 计算实际显示位置，考虑缩放中心点
    const left = baseLeft + offset.value.x + (baseWidth - scaledWidth) / 2
    const top = baseTop + offset.value.y + (baseHeight - scaledHeight) / 2
    
    return {
        left,
        top,
        width: scaledWidth,
        height: scaledHeight,
        baseWidth,
        baseHeight,
        baseLeft,
        baseTop,
        scale: scale.value
    }
}

// 更新图像样式计算
const getImageStyle = () => {
    const container = comparisonContainer.value
    if (!container) return {}
    
    const rect = container.getBoundingClientRect()
    const imageRect = getImageDisplayRect(rect)
    
    return {
        position: 'absolute',
        width: `${imageRect.baseWidth}px`,
        height: `${imageRect.baseHeight}px`,
        left: `${imageRect.baseLeft}px`,
        top: `${imageRect.baseTop}px`,
        transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
        transformOrigin: 'center',
        transition: isDragging.value ? 'none' : 'transform 0.1s',
        willChange: 'transform'
    }
}

// 更新裁剪样式计算
const getClipStyle = () => {
    return {
        clipPath: `inset(0 ${100 - splitPosition.value}% 0 0)`,
        willChange: 'clip-path'
    }
}

// 修改分割线样式计算
const getSplitLineStyle = computed(() => {
    const container = comparisonContainer.value
    if (!container) {
        return { display: 'none' }
    }
    
    const rect = container.getBoundingClientRect()
    const imageRect = getImageDisplayRect(rect)
    
    // 计算分割线在图像区域内的实际位置
    const splitX = imageRect.left + // 实际显示位置
                  (imageRect.width * (splitPosition.value / 100)) // 分割比例
    
    return {
        position: 'absolute',
        left: `${splitX}px`,
        top: `${imageRect.top}px`,
        height: `${imageRect.height}px`,
        transform: 'none',
        pointerEvents: 'auto',
        cursor: 'col-resize'
    }
})

// 修改分割线拖拽处理函数
const handleSplitDrag = (e) => {
    e.preventDefault()
    isSplitDragging.value = true
    
    const handleDrag = (moveEvent) => {
        const container = comparisonContainer.value
        if (!container) return
        
        const rect = container.getBoundingClientRect()
        const imageRect = getImageDisplayRect(rect)
        
        // 计算鼠标相对于图像显示区域的位置
        const mouseX = moveEvent.clientX - rect.left
        
        // 将鼠标位置限制在图像显示区域内
        const boundedX = Math.max(imageRect.left, Math.min(imageRect.left + imageRect.width, mouseX))
        
        // 计算相对于图像显示区域的百分比
        const percentage = ((boundedX - imageRect.left) / imageRect.width) * 100
        splitPosition.value = Math.max(0, Math.min(100, percentage))
    }
    
    const handleDragEnd = () => {
        isSplitDragging.value = false
        document.removeEventListener('mousemove', handleDrag)
        document.removeEventListener('mouseup', handleDragEnd)
    }
    
    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', handleDragEnd)
}

// 修改预览生成函数
const generatePreview = async (sharpObj) => {
    try {
        if (!originalImg.value || !processedImg.value) return

        // 修复 Promise 链式调用
        const [processedBuffer, originalBuffer] = await Promise.all([
            sharpObj.clone().png().toBuffer(),
            (async () => {
                const originalImage = await fromFilePath(imagePath.value)
                return originalImage.png().toBuffer()
            })()
        ])

        // 创建 Blob URLs 并清理旧的
        if (originalImg.value.src.startsWith('blob:')) {
            URL.revokeObjectURL(originalImg.value.src)
        }
        if (processedImg.value.src.startsWith('blob:')) {
            URL.revokeObjectURL(processedImg.value.src)
        }

        // 创建新的 Blob URLs
        const processedUrl = URL.createObjectURL(new Blob([processedBuffer], { type: 'image/png' }))
        const originalUrl = URL.createObjectURL(new Blob([originalBuffer], { type: 'image/png' }))

        // 更新图像源
        originalImg.value.src = originalUrl
        processedImg.value.src = processedUrl

    } catch (error) {
        console.error('生成预览图失败:', error)
    }
}

// 在组件卸载时清理 Blob URLs
onUnmounted(() => {
    if (originalImg.value?.src.startsWith('blob:')) {
        URL.revokeObjectURL(originalImg.value.src)
    }
    if (processedImg.value?.src.startsWith('blob:')) {
        URL.revokeObjectURL(processedImg.value.src)
    }
})

// 添加简单的防抖函数实现
const debounce = (fn, delay) => {
    let timer = null;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, delay);
    };
};

// 创建防抖后的直方图和预览更新函数
const updateHistogramAndPreview = async (processedImg) => {
    try {
        const result = await getHistogramFromSharp(processedImg);
        histogram.value = result.histogram;
        info.value = result.info;
        await generatePreview(processedImg);
    } catch (error) {
        console.error('更新直方图和预览失败:', error);
    }
};

const debouncedUpdate = debounce(updateHistogramAndPreview, 300);

// 在组件卸载时清理缓存
onUnmounted(() => {
    if (previewState.value.currentController) {
        previewState.value.currentController.abort();
    }
    if (previewState.value.previewTimeout) {
        clearTimeout(previewState.value.previewTimeout);
    }
    previewState.value.thumbnailCache = null;
});

// 优化鼠标事件坐标计算
const getRelativeCoordinates = (e, containerRect, imageRect) => {
    // 获取鼠标相对于容器的坐标
    const containerX = e.clientX - containerRect.left
    const containerY = e.clientY - containerRect.top

    // 计算鼠标相对于图像显示区域的坐标
    const imageX = (containerX - imageRect.left) / imageRect.scale
    const imageY = (containerY - imageRect.top) / imageRect.scale

    return {
        container: { x: containerX, y: containerY },
        image: { x: imageX, y: imageY }
    }
}

// 优化图像拖动处理
const handleMouseDown = (e) => {
    if (isSplitDragging.value) return
    
    isDragging.value = true
    const containerRect = comparisonContainer.value.getBoundingClientRect()
    const imageRect = getImageDisplayRect(containerRect)
    
    // 记录起始点，考虑当前偏移量
    dragStart.value = {
        x: e.clientX - offset.value.x,
        y: e.clientY - offset.value.y,
        initialOffset: { ...offset.value }
    }
    
    document.body.style.cursor = 'grabbing'
}

const handleMouseUp = (e) => {
    if (isDragging.value) {
        isDragging.value = false
        document.body.style.cursor = 'grab'
    }
}
</script>
<style scoped>
.histogram-wrapper {
    display: flex;
    gap: 20px;
    padding: 16px;
    background: #1e1e1e;
    border-radius: 4px;
    min-height: 600px;
}

/* 左侧预览区域样式 */
.preview-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.image-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2a2a2a;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    cursor: move;
}

.image-container canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
    position: absolute;
}

.image-info {
    padding: 8px;
    background: #2a2a2a;
    border-radius: 4px;
}

.info-item {
    color: #fff;
    font-size: 12px;
    margin-bottom: 4px;
}

/* 右侧控制面板样式 */
.control-section {
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: #2a2a2a;
    padding: 16px;
    border-radius: 4px;
}

.histogram-controls {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.channel-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
}

.histogram-chart {
    background: #252525;
    border-radius: 4px;
    padding: 8px;
}

.adjustment-controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    flex: 1;
}

.control-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-size: 12px;
}

.value-display {
    color: #888;
}

input[type="range"] {
    width: 100%;
    height: 4px;
    background: #3a3a3a;
    border-radius: 2px;
    -webkit-appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
}

input[type="checkbox"] {
    width: 14px;
    height: 14px;
    cursor: pointer;
}

.performance-panel {
    padding: 8px;
    background: #2a2a2a;
    border-radius: 4px;
}

.performance-item {
    color: #fff;
    font-size: 12px;
    margin-bottom: 4px;
}

.zoom-controls {
    position: absolute;
    bottom: 10px;
    right: 10px;
    display: flex;
    gap: 5px;
    z-index: 2;
}

.zoom-controls button {
    padding: 5px 10px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: 1px solid #666;
    border-radius: 4px;
    cursor: pointer;
}

.split-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(221, 101, 21, 0.897);
    cursor: col-resize;
    z-index: 10;
    transition: background 0.2s;
}

.split-line:hover,
.split-line:active {
    background: rgb(255, 166, 0);
    width: 1px;
}

.split-handle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    background: orange;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: none;
}

.comparison-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 添加处理后图像的样式 */
.processed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
</style>
