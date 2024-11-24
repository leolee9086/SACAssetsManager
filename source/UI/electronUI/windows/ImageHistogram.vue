<template>
    <div class="main-container">
        <!-- 顶部工具栏 -->
        <Teleport to="#title-group-left">
            <div class="button" @click="openNewFile">打开文件</div>
        </Teleport>

        <!-- 主体内容区域 -->
        <div class="content-wrapper">
            <!-- 左侧工具栏 -->
            <div class="tools-sidebar">
                <!-- 几何变换工具组 -->
                <div class="tool-button" @click="canUseGeometryTools && rotate(-90)" :class="{
                    disabled: !canUseGeometryTools,
                    active: rotation.value !== 0
                }" title="向左旋转">
                    <span class="icon">↶</span>
                </div>
                <div class="tool-button" @click="canUseGeometryTools && rotate(90)" :class="{
                    disabled: !canUseGeometryTools,
                    active: rotation.value !== 0
                }" title="向右旋转">
                    <span class="icon">↷</span>
                </div>
                <div class="tool-button" @click="canUseGeometryTools && flip('horizontal')" :class="{
                    disabled: !canUseGeometryTools,
                    active: flips.horizontal
                }" title="水平翻转">
                    <span class="icon">↔</span>
                </div>
                <div class="tool-button" @click="canUseGeometryTools && flip('vertical')" :class="{
                    disabled: !canUseGeometryTools,
                    active: flips.vertical
                }" title="垂直翻转">
                    <span class="icon">↕</span>
                </div>


                <div class="tool-button separator"></div>
                <div class="tool-button" @click="togglePerspectiveMode" :class="{ active: perspectiveMode }"
                    title="透视校正">
                    <span class="icon">⟁</span>
                </div>
                <div class="tool-button" @click="toggleResizeMode" :class="{ active: isResizeMode }" title="缩放">
                    <span class="icon">⤧</span>
                </div>
                <div class="tool-button" @click="toggleStackMode" :class="{ active: isStackMode }" title="堆栈">
                    <span class="icon">🎚️</span>
                </div>
                <!-- 编辑工具组 -->
                <div class="tool-button" @click="toggleEditMode" :class="{ active: isEditMode }" title="编辑模式">
                    <span class="icon">✎</span>
                </div>
                <div class="tool-button" @click="toggleCropMode" :class="{ active: isCropMode }" title="裁剪">
                    <span class="icon">✂</span>
                </div>

                <div class="tool-button separator"></div>

                <!-- 视图模式组 -->
                <div class="tool-button" @click="toggleProcessedOnlyView" :class="{ active: isProcessedOnlyView }"
                    title="仅处理后">
                    <span class="icon">▣</span>
                </div>

                <div class="tool-button" @click="toggleSplitView" :class="{ active: isSplitViewEnabled }" title="裂像预览">
                    <span class="icon">◫</span>
                </div>
            </div>

            <!-- 左侧预览区域 -->
            <div class="preview-section">
                <div class="image-container" @wheel="handleWheel" @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
                    <div class="comparison-container" ref="comparisonContainer">
                        <img ref="processedImg" :src="processedImg?.src" :style="getImageStyle()" alt="处理后图像" />
                        <img v-if="viewState.mode === 'split'" v-show="originalImg?.src" ref="originalImg"
                            :src="originalImg?.src" :style="[getImageStyle(), getClipStyle()]" alt="原始图像" />
                        <div v-if="viewState.mode === 'split'" class="split-line" :style="getSplitLineStyle"
                            @mousedown.stop="handleSplitDrag">
                            <div class="split-handle"></div>
                            <div class="split-line-hitbox"></div>
                        </div>
                        <div v-if="isCropMode" class="crop-overlay">
                            <div class="crop-box" :style="cropBoxStyle" @mousedown.stop="handleCropBoxMouseDown">
                                <!-- 裁剪框的控制点 -->
                                <div v-for="handle in cropHandles" :key="handle.position" class="crop-handle"
                                    :class="handle.position"
                                    @mousedown.stop="(e) => handleCropResize(e, handle.position)">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 性能监控面板 -->
                <floatLayerWindow title='处理状态' :initial-width="400" :initial-height="300">
                    <div class="performance-panel">
                        <!-- 添加直方图部分 -->
                        <HistogramPanel v-model:channels="channels" :sharp-object="currentSharpObject"
                            @histogram-updated="handleHistogramUpdate" />

                        <!-- 原有的性能信息 -->
                        <div class="performance-stats">
                            <div class="performance-item">
                                处理时间: {{ performanceStats.processingTime || 0 }} ms
                            </div>
                            <div class="performance-item">
                                内存使用: {{ performanceStats.memoryUsage || 0 }} MB
                            </div>
                            <div class="image-info">
                                <div class="info-item">图像路径: {{ imagePath }}</div>
                                <div class="info-item">原始尺寸: {{ originalImageInfo?.width || 0 }}*{{
                                    originalImageInfo?.height || 0
                                }}
                                </div>
                            </div>
                        </div>
                    </div>
                </floatLayerWindow>
            </div>

            <!-- 右侧控制面板 -->
            <div class="control-section" v-if="isStackMode">
                <ImageAdjuster ref="imageAdjuster" :effect-stack="effectStack" :dragging-effect-id="draggingEffectId"
                    @update:effect-stack="handleEffectStackChange" @effect-param-change="updateProcessingPipeline" />
            </div>
        </div>

        <!-- 底部画廊 -->
        <div class="gallery-section">
            <textureGallery></textureGallery>
            <div class="history-gallery">
                <div class="gallery-container" ref="galleryContainer">
                    <template v-for="(item, index) in 历史队列" :key="index">
                        <div v-if="item?.path" class="gallery-item" :class="{ active: item.path === imagePath }"
                            @click="switchToImage(index)">
                            <img :src="item.thumbnail" :alt="item.name" />
                            <div class="image-name">{{ item.name }}</div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- 修改几何变换确认面板 -->
        <div class="geometry-confirm" v-if="hasGeometryChanges || isResizeMode || isCropMode">
            <div class="geometry-options">
                <div class="option-group" v-if="isResizeMode">
                    <label>调整大小:</label>
                    <div class="size-inputs">
                        <input type="number" v-model="resizeOptions.width" @input="handleResizeInput('width')" />
                        <span>x</span>
                        <input type="number" v-model="resizeOptions.height" @input="handleResizeInput('height')" />
                        <label>
                            <input type="checkbox" v-model="resizeOptions.maintainAspectRatio" />
                            保持比例
                        </label>
                    </div>
                </div>
                <div class="option-group">
                    <label>输出格式:</label>
                    <select v-model="outputFormat">
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                    </select>
                </div>
                <div class="option-group" v-if="isCropMode">
                    <label>裁剪尺寸:</label>
                    <div class="size-inputs">
                        <input type="number" v-model="cropBox.width" @input="handleCropInput('width')" />
                        <span>x</span>
                        <input type="number" v-model="cropBox.height" @input="handleCropInput('height')" />
                        <label>
                            <input type="checkbox" v-model="cropBox.maintainAspectRatio" />
                            保持比例
                        </label>
                    </div>
                </div>
            </div>
            <div class="button-group">
                <button class="confirm-button" @click="confirmChanges">确认</button>
                <button class="cancel-button" @click="cancelChanges">取消</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import floatLayerWindow from '../../components/common/floatLayerWindow/floatLayerWindow.vue';
import textureGallery from './textureGallery.vue';
import HistogramPanel from './HistogramPanel.vue';
import ImageAdjuster from './ImageAdjuster.vue';
import { ref, computed, inject, toRef, onUnmounted, onMounted, shallowRef, watch } from 'vue';
import { fromFilePath, fromBuffer } from '../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';
import { requirePluginDeps } from '../../../utils/module/requireDeps.js';
import { getImageDisplayRect } from './utils/css.js';
import { 选择图片文件 } from '../../../utils/useRemote/dialog.js';
import { 覆盖保存 } from '../../../utils/fs/write.js';
import { 重置所有状态, previewState, 文件历史管理器, 历史队列, effectStack, 效果堆栈管理器,cropBox,裁剪框控制器 } from './state/index.js';
const sharp = requirePluginDeps('sharp')
const originalImageInfo = ref({})
// 添加图片历史记录状态
const galleryContainer = ref(null);
const 添加新文件 = async (newPath) => {
    try {
        const testImage = await fromFilePath(newPath);
        重置所有状态()
        if (currentSharpObject.value) {
            currentSharpObject.value = null;
        }
        const thumbnail = await testImage
            .clone()
            .resize(100, 100, { fit: 'contain' })
            .png()
            .toBuffer();
        const thumbnailUrl = URL.createObjectURL(
            new Blob([thumbnail], { type: 'image/png' })
        );
        文件历史管理器.添加(newPath, thumbnailUrl)
        imagePath.value = newPath;
        const metadata = await testImage.metadata();
        originalImageInfo.value = {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
        };
        currentSharpObject.value = testImage;
        await generatePreview(testImage);
        //重新应用效果器
        效果堆栈管理器.重载(async () => {
            if (imageAdjuster.value) {
                await resetAdjustments();
            }
        })
        await generatePreview(currentSharpObject.value);
    } catch (error) {
        console.error('处理新图像失败:', error);
        throw new Error('图像处理失败，请确文件格式正确且未损坏');
    }

}
const openNewFile = async () => {
    try {
        // 确保 controller 存在
        if (!previewState.value.currentController) {
            previewState.value.currentController = new AbortController();
        }
        // 取消当前正在进行的所有处理
        previewState.value.currentController.abort();
        previewState.value.currentController = new AbortController();
        const result = await 选择图片文件()

        if (!result.canceled && result.filePaths.length > 0) {
            const newPath = result.filePaths[0];
            添加新文件(newPath)
        }
    } catch (error) {
        console.error('打开文件失败:', error);
        // 只在真正的错误情况下显示提示
        if (error.message) {
            alert(error.message);
        }
    }
};

// 重置调整的函数
const resetAdjustments = async () => {
    try {
        // 重置效果栈
        效果堆栈管理器.清空()
        // 重新生成预览
        if (currentSharpObject.value) {
            await generatePreview(currentSharpObject.value);
        }
    } catch (error) {
        console.error('重置调整失败:', error);
    }
};

// 切换到历史图片
const switchToImage = async (index) => {
    try {
        const originalImage = await 文件历史管理器.获取指定sharp对象(index)
        currentSharpObject.value = originalImage;
        const metadata = await originalImage.metadata();
        originalImageInfo.value = {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
        };
        await generatePreview(originalImage);
        await resetAdjustments();
    } catch (error) {
        console.error('切换图片失败:', error);
    }
};

const appData = inject('appData')
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
const currentSharpObject = shallowRef(null);
const performanceStats = ref({
    processingTime: 0,
    memoryUsage: 0,
    isProcessing: false
});

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

        // 新版本号
        const currentVersion = ++previewState.value.renderVersion;

        // 获取图像尺寸
        const isLargeImage = originalImageInfo.value.width > 4096 ||
            originalImageInfo.value.height > 4096;


        if (isLargeImage) {
            // 大图像使用渐进式渲染
            // 记录调整时
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
                        console.error('低分辨率处理败:', error);
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
                    console.error('图像处理失:', error);
                }
                throw error;
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('渲染已取消');
        } else {
            console.error('处理图像失败:', error);
        }
    }
};

// 添加全辨率处理函
const processWithFullResolution = async (processingPipeline, signal) => {
    const startTime = performance.now();

    try {
        // 如果已被取消，直返回
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
    添加新文件(imagePath.value)
});

// 导出保存当前设置的方法
const saveCurrentSettings = () => {
    return {
        effectStack: effectStack.value,
        // 可以添加其他需要保存的设置
    }
}

// 导出加载设置的方法
const loadSavedSettings = (settings) => {
    if (settings && settings.effectStack) {
        effectStack.value = settings.effectStack
        updateProcessingPipeline()
    }
}



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

// 更新图像样式计算
const getImageStyle = () => {
    const container = comparisonContainer.value;
    if (!container) return {};

    const rect = container.getBoundingClientRect();
    const imageRect = getImageDisplayRect(rect, originalImageInfo.value, scale.value, offset.value);

    return {
        position: 'absolute',
        width: `${imageRect.baseWidth}px`,
        height: `${imageRect.baseHeight}px`,
        left: `${imageRect.baseLeft}px`,
        top: `${imageRect.baseTop}px`,
        transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
        transformOrigin: '0 0',
        transition: isDragging.value ? 'none' : 'transform 0.1s',
        willChange: 'transform',
        objectFit: 'contain'
    };
};


// 修改预览生成函数
const generatePreview = async (sharpObj) => {
    try {
        // 检查 DOM 引用是否存在
        if (!processedImg.value) {
            console.warn('processedImg reference not found');
            return;
        }
        // 生成处理后的图像
        const processedBuffer = await sharpObj.clone().png().toBuffer();
        // 清理旧的 Blob URLs
        if (processedImg.value.src?.startsWith('blob:')) {
            URL.revokeObjectURL(processedImg.value.src);
        }
        if (originalImg.value?.src?.startsWith('blob:')) {
            URL.revokeObjectURL(originalImg.value.src);
        }

        // 更新处理后的图像
        const processedUrl = URL.createObjectURL(
            new Blob([processedBuffer], { type: 'image/png' })
        );
        processedImg.value.src = processedUrl;

        // 如果启用了裂像预览，确保原始图像也被更新
        if (isSplitViewEnabled.value) {
            try {
                const originalImage = await fromFilePath(imagePath.value);
                const originalBuffer = await originalImage.png().toBuffer();

                if (originalImg.value) {
                    const originalUrl = URL.createObjectURL(
                        new Blob([originalBuffer], { type: 'image/png' })
                    );
                    originalImg.value.src = originalUrl;
                }
            } catch (error) {
                console.error('生成原始图像预览失败:', error);
            }
        } else if (originalImg.value) {
            originalImg.value.src = '';
        }

    } catch (error) {
        console.error('生成预览图失败:', error);
    }
};

// 确保在组件卸载时清理资源
onUnmounted(() => {
    if (processedImg.value?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(processedImg.value.src);
    }
    if (originalImg.value?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(originalImg.value.src);
    }
    if (previewState.value.currentController) {
        previewState.value.currentController.abort();
    }
    if (previewState.value.previewTimeout) {
        clearTimeout(previewState.value.previewTimeout);
    }
    previewState.value.thumbnailCache = null;

});

// 优化图像拖动处理
const handleMouseDown = (e) => {
    if (isSplitDragging.value) return

    isDragging.value = true
    dragStart.value = {
        x: e.clientX - offset.value.x,
        y: e.clientY - offset.value.y,
        initialOffset: { ...offset.value }
    }

    document.body.style.cursor = 'grabbing'
}

const handleMouseUp = () => {
    if (isDraggingCrop.value) {
        isDraggingCrop.value = false;
        cropResizeHandle.value = null;
    }
    if (isDragging.value) {
        isDragging.value = false;
        document.body.style.cursor = 'default';
    }
};


// 添加几何矫正相关的状态
const rotation = ref(0)
const flips = ref({ horizontal: false, vertical: false })
//const perspectiveMode = ref(false)
const perspectivePoints = ref([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
])

// 旋转处理函数
const rotate = async (degrees) => {
    try {
        rotation.value = (rotation.value + degrees) % 360

        // 创建新的处理管道
        const processingPipeline = async (img) => {
            return img.rotate(rotation.value, {
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
        }

        await handleProcessingUpdate(processingPipeline)
    } catch (error) {
        console.error('旋转处理失败:', error)
    }
}

// 翻转处理函数
const flip = async (direction) => {
    try {
        flips.value[direction] = !flips.value[direction]
        const processingPipeline = async (img) => {
            if (flips.value.horizontal) {
                img = img.flop()
            }
            if (flips.value.vertical) {
                img = img.flip()
            }
            return img
        }
        await handleProcessingUpdate(processingPipeline)
    } catch (error) {
        console.error('翻转处理失败:', error)
    }
}

// 添加效果堆栈相关的状态
const draggingEffectId = ref(null);

// 处理效果堆栈的变更
const handleEffectStackChange = (newStack) => {
    effectStack.value = newStack;
    updateProcessingPipeline();
};


// 更新处理管道
const updateProcessingPipeline = () => {
    const pipeline = 效果堆栈管理器.构建处理函数();
    handleProcessingUpdate(pipeline);
};

// 修改几何变换状态追踪
const hasGeometryChanges = computed(() => {
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
})

// 添加新的响应式状态
const resizeOptions = ref({
    width: 0,
    height: 0,
    maintainAspectRatio: true
});

const outputFormat = ref('jpeg');

// 处理尺寸输入
const handleResizeInput = (dimension) => {
    if (resizeOptions.value.maintainAspectRatio) {
        const aspectRatio = originalImageInfo.value.width / originalImageInfo.value.height;
        if (dimension === 'width') {
            resizeOptions.value.height = Math.round(resizeOptions.value.width / aspectRatio);
        } else {
            resizeOptions.value.width = Math.round(resizeOptions.value.height * aspectRatio);
        }
    }
};


// 修改取消变更函数
const cancelChanges = async () => {
    try {
        // 根据当前激活的模式执行相应的取消操作
        switch (editorState.value.activeMode) {
            case 'perspective':
                // 重置透视相关状态
                perspectiveMode.value = false
                perspectivePoints.value = [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 100, y: 100 },
                    { x: 0, y: 100 }
                ]
                break

            case 'resize':
                // 重置缩放选项
                if (originalImageInfo.value) {
                    resizeOptions.value = {
                        width: originalImageInfo.value.width,
                        height: originalImageInfo.value.height,
                        maintainAspectRatio: true
                    }
                }
                isResizeMode.value = false
                break

            case 'crop':
                // 重置裁剪状态
                isCropMode.value = false
                裁剪框控制器.归零()
                break
        }

        // 重置几何变换状态
        rotation.value = 0
        flips.value = { horizontal: false, vertical: false }

        // 重置视图状态
        viewState.value.mode = 'split'
        viewState.value.options.split.position = 50

        // 清除激活模式
        editorState.value.activeMode = null

        // 重新生成预览
        if (currentSharpObject.value) {
            await generatePreview(currentSharpObject.value)
        }

        // 重置缩放和偏移
        scale.value = 1
        offset.value = { x: 0, y: 0 }

    } catch (error) {
        console.error('取消变更失败:', error)
    }
}

// 2. 修改确认变更函数
const confirmChanges = async () => {
    try {
        let processedImage = currentSharpObject.value

        // 根据当前激活的模式执行相应的确认操作
        switch (editorState.value.activeMode) {
            case 'perspective':
                // 处理透视变换
                // ... 透视变换的具体实现 ...
                break

            case 'resize':
                // 处理缩放
                if (isResizeMode.value) {
                    processedImage = await processedImage.resize(
                        resizeOptions.value.width,
                        resizeOptions.value.height,
                        {
                            fit: 'fill',
                            withoutEnlargement: false
                        }
                    )
                }
                break

            case 'crop':
                // 处理裁剪
                if (isCropMode.value) {
                    const cropArea = getActualCropArea()
                    if (!cropArea) throw new Error('无法获取裁剪区域')
                    processedImage = await processedImage.extract(cropArea)
                }
                break
        }

        // 处理通用的几何变换
        if (rotation.value !== 0) {
            processedImage = processedImage.rotate(rotation.value, {
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
        }
        if (flips.value.horizontal) {
            processedImage = processedImage.flop()
        }
        if (flips.value.vertical) {
            processedImage = processedImage.flip()
        }
        const pathParts = imagePath.value.match(/^(.+?)(?:_(?:geometry|resize|crop))?(\.[^.]+)$/);
        if (!pathParts) throw new Error('无效的文件路径')
        const [_, basePath, ext] = pathParts
        const suffix = editorState.value.activeMode
        const newPath = `${basePath}_${suffix}${ext}`
        const processedBuffer = await processedImage[outputFormat.value]().toBuffer()
        await 覆盖保存(newPath, processedBuffer)
        cancelChanges()
        await 添加新文件(newPath)
    } catch (error) {
        console.error('确认变更失败:', error)
        alert('确认变更失败: ' + error.message)
    }
}


const 从图片信息重置缩放状态 = (imageInfo) => {
    if (imageInfo) {
        resizeOptions.value.width = imageInfo.width;
        resizeOptions.value.height = imageInfo.height;
    }
}
// 在组件挂载时初始化尺寸
onMounted(() => {

    从图片信息重置缩放状态(originalImageInfo.value)
});

// 监听原始图像信息变化
watch(() => originalImageInfo.value, (newInfo) => {
    从图片信息重置缩放状态(newInfo)
}, { deep: true });

const isDraggingCrop = ref(false);
const cropStartPos = ref({ x: 0, y: 0 });
const cropResizeHandle = ref(null);

// 裁剪框的控制点
const cropHandles = [
    { position: 'nw' }, { position: 'n' }, { position: 'ne' },
    { position: 'w' }, { position: 'e' },
    { position: 'sw' }, { position: 's' }, { position: 'se' }
];

// 修改初始化裁剪框函数，使其相对于原图定位
const initCropBox = () => {
    const container = comparisonContainer.value;
    const processedImage = processedImg.value;
    if (!container || !processedImage) return;

    const rect = container.getBoundingClientRect();
    const imgRect = processedImage.getBoundingClientRect();

    // 计算实际的图像区域（考虑缩放和偏移）
    const imageArea = {
        x: imgRect.left - rect.left,
        y: imgRect.top - rect.top,
        width: imgRect.width,
        height: imgRect.height
    };
    // 初始化裁剪框
    裁剪框控制器.应用裁剪框(imageArea)
    裁剪框控制器.设置比例保持(false)
 
};

// 添加获取实际裁剪区域的函数
const getActualCropArea = () => {
    const container = comparisonContainer.value;
    if (!container || !processedImg.value) return null;

    const rect = container.getBoundingClientRect();
    const imgRect = processedImg.value.getBoundingClientRect();

    // 计算裁剪框相对于图像的比例
    const relativeX = (cropBox.value.x - imgRect.left + rect.left) / imgRect.width;
    const relativeY = (cropBox.value.y - imgRect.top + rect.top) / imgRect.height;
    const relativeWidth = cropBox.value.width / imgRect.width;
    const relativeHeight = cropBox.value.height / imgRect.height;

    // 转换为原始图像上的像素坐标
    return {
        left: Math.round(relativeX * originalImageInfo.value.width),
        top: Math.round(relativeY * originalImageInfo.value.height),
        width: Math.round(relativeWidth * originalImageInfo.value.width),
        height: Math.round(relativeHeight * originalImageInfo.value.height)
    };
};

// 处理裁剪框拖动
const handleCropResize = (e, position) => {
    if (!isCropMode.value) return;

    isDraggingCrop.value = true;
    cropResizeHandle.value = position;
    cropStartPos.value = {
        x: e.clientX,
        y: e.clientY,
        initialBox: { ...cropBox.value }
    };
};

// 修改鼠标移动处理函数，限制裁剪框在图像范围内
const handleMouseMove = (e) => {
    if (isDraggingCrop.value && processedImg.value) {
        const container = comparisonContainer.value;
        const rect = container.getBoundingClientRect();
        const imgRect = processedImg.value.getBoundingClientRect();

        // 计算图像边界
        const bounds = {
            left: imgRect.left - rect.left,
            top: imgRect.top - rect.top,
            right: imgRect.right - rect.left,
            bottom: imgRect.bottom - rect.top
        };

        if (cropResizeHandle.value) {
            // 处理裁剪框缩放
            const dx = e.clientX - cropStartPos.value.x;
            const dy = e.clientY - cropStartPos.value.y;
            const initialBox = cropStartPos.value.initialBox;

            let newBox = { ...cropBox.value };

            // 根据不同的控制点处理缩放
            switch (cropResizeHandle.value) {
                case 'nw':
                    newBox.x = initialBox.x + dx;
                    newBox.y = initialBox.y + dy;
                    newBox.width = initialBox.width - dx;
                    newBox.height = initialBox.height - dy;
                    break;
                case 'n':
                    newBox.y = initialBox.y + dy;
                    newBox.height = initialBox.height - dy;
                    break;
                case 'ne':
                    newBox.y = initialBox.y + dy;
                    newBox.width = initialBox.width + dx;
                    newBox.height = initialBox.height - dy;
                    break;
                case 'w':
                    newBox.x = initialBox.x + dx;
                    newBox.width = initialBox.width - dx;
                    break;
                case 'e':
                    newBox.width = initialBox.width + dx;
                    break;
                case 'sw':
                    newBox.x = initialBox.x + dx;
                    newBox.width = initialBox.width - dx;
                    newBox.height = initialBox.height + dy;
                    break;
                case 's':
                    newBox.height = initialBox.height + dy;
                    break;
                case 'se':
                    newBox.width = initialBox.width + dx;
                    newBox.height = initialBox.height + dy;
                    break;
            }

            // 限制裁剪框在图像范围内
            newBox.x = Math.max(bounds.left, Math.min(bounds.right - newBox.width, newBox.x));
            newBox.y = Math.max(bounds.top, Math.min(bounds.bottom - newBox.height, newBox.y));
            newBox.width = Math.min(newBox.width, bounds.right - newBox.x);
            newBox.height = Math.min(newBox.height, bounds.bottom - newBox.y);
            newBox.width = Math.max(50, newBox.width);
            newBox.height = Math.max(50, newBox.height);
            cropBox.value = newBox;
        } else {
            // 处理裁剪框拖动
            let newX = e.clientX - cropStartPos.value.x;
            let newY = e.clientY - cropStartPos.value.y;
            // 限制在图像范围内
            newX = Math.max(bounds.left, Math.min(bounds.right - cropBox.value.width, newX));
            newY = Math.max(bounds.top, Math.min(bounds.bottom - cropBox.value.height, newY));
            cropBox.value.x = newX;
            cropBox.value.y = newY;
        }
    } else if (isDragging.value && !isCropMode.value) {
        // 原有的图像拖动逻辑
        offset.value = {
            x: e.clientX - dragStart.value.x,
            y: e.clientY - dragStart.value.y
        };
    }
};


// 计算裁剪框样式
const cropBoxStyle = computed(() => ({
    left: `${cropBox.value.x}px`,
    top: `${cropBox.value.y}px`,
    width: `${cropBox.value.width}px`,
    height: `${cropBox.value.height}px`
}));

// 添加视图状态管理
const viewState = ref({
    mode: 'split', // 'split' | 'processed' | 'original'
    options: {
        split: {
            position: 50,
            isDragging: false
        }
    }
});

// 添加更新预览的辅助函数
const updatePreview = async () => {
    if (currentSharpObject.value) {
        await generatePreview(currentSharpObject.value);
    }
};

// 修改分割线拖拽相关函数
const handleSplitDrag = (e) => {
    e.preventDefault();
    viewState.value.options.split.isDragging = true;

    const handleDrag = (moveEvent) => {
        const container = comparisonContainer.value;
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

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
};

// 修改分割线样式计算
const getSplitLineStyle = computed(() => {
    const container = comparisonContainer.value;
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
});

// 修改裁剪样式计算
const getClipStyle = () => {
    if (viewState.value.mode !== 'split') {
        return {};
    }

    const container = comparisonContainer.value;
    if (!container) return {};

    const rect = container.getBoundingClientRect();
    const imageRect = getImageDisplayRect(rect, originalImageInfo.value, scale.value, offset.value);
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
};

// 1. 添加编辑器状态管理
const editorState = ref({
    activeMode: null, // 'perspective' | 'resize' | 'stack' | 'edit' | 'crop' | null
    geometry: {
        hasChanges: false,
        perspective: false,
        resize: false,
        stack: false
    },
    view: {
        mode: 'split', // 'split' | 'processed' | 'original'
        splitPosition: 50
    }
})

// 2. 视图锁定相关的计算属性
const isViewModeLocked = computed(() =>
    ['perspective', 'resize', 'crop'].includes(editorState.value.activeMode)
)

// 3. 修改现有的状态计算属性
const perspectiveMode = computed({
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
})

const isResizeMode = computed({
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

const isStackMode = computed({
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

const isCropMode = computed({
    get: () => editorState.value.geometry.crop,
    set: async (val) => {
        if (!await stateTransition.value.lock()) {
            stateTransition.value.pending = { mode: 'crop', value: val }
            return
        }

        try {
            if (val) {
                // 如果当前是堆栈模式,先退出
                if (isStackMode.value) {
                    isStackMode.value = false
                }
                editorState.value.activeMode = 'crop'
                viewState.value.mode = 'processed'
                initCropBox()
            } else {
                editorState.value.activeMode = null
            }
            editorState.value.geometry.crop = val
        } finally {
            stateTransition.value.unlock()
        }
    }
})

const isEditMode = computed({
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

// 简化模式切换函数
const toggleStackMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !isStackMode.value
    isStackMode.value = newValue
}

const togglePerspectiveMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !perspectiveMode.value
    perspectiveMode.value = newValue
}

const toggleResizeMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !isResizeMode.value
    isResizeMode.value = newValue
}

const toggleCropMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !isCropMode.value
    isCropMode.value = newValue
}

const toggleEditMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !isEditMode.value
    isEditMode.value = newValue
}

// 4. 修改模式切换函数
const toggleProcessedOnlyView = () => {
    if (isViewModeLocked.value) return
    viewState.value.mode = viewState.value.mode === 'processed' ? 'split' : 'processed'
}

const toggleSplitView = () => {
    if (isViewModeLocked.value) return
    viewState.value.mode = viewState.value.mode === 'split' ? 'processed' : 'split'
}

// 添加几何工具可用性的计算属性
const canUseGeometryTools = computed(() => {
    return ['perspective', 'crop'].includes(editorState.value.activeMode)
})

// 添加分割视图状态的计算属性
const isSplitViewEnabled = computed(() => viewState.value.mode === 'split')

// 添加仅显示处理后视图的计算属性
const isProcessedOnlyView = computed(() => viewState.value.mode === 'processed')

// 添加状态转换锁和队列
const stateTransition = ref({
    isLocked: false,
    pending: null,
    async lock() {
        if (this.isLocked) {
            return false
        }
        this.isLocked = true
        return true
    },
    unlock() {
        this.isLocked = false
        if (this.pending) {
            const { mode, value } = this.pending
            this.pending = null
            // 执行待处理的状态转换
            switch (mode) {
                case 'stack':
                    toggleStackMode(value)
                    break
                case 'perspective':
                    togglePerspectiveMode(value)
                    break
                case 'resize':
                    toggleResizeMode(value)
                    break
                case 'crop':
                    toggleCropMode(value)
                    break
                case 'edit':
                    toggleEditMode(value)
                    break
            }
        }
    }
})

// 添加状态转换监听
watch(() => editorState.value.activeMode, (newMode, oldMode) => {
    if (newMode !== oldMode) {
        console.log(`Mode changed from ${oldMode} to ${newMode}`)
    }
})

</script>
<style scoped>
.main-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1e1e1e;
}

.content-wrapper {
    display: flex;
    flex: 1;
    gap: 0;
    padding: 16px;
    min-height: 0;
}

.preview-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.image-container {
    flex: 1;
    position: relative;
    background: #2a2a2a;
    border-radius: 4px;
    overflow: hidden;
    cursor: move;
    min-height: 0;
    /* 重要：防止内容溢出 */
}

.control-section {
    width: 320px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: #2a2a2a;
    padding: 16px;
    border-radius: 4px;
    overflow-y: auto;
}

.gallery-section {
    height: 130px;
    /* 增加高度以容纳画廊和可能的边距 */
    flex-shrink: 0;
    background: #2a2a2a;
    padding: 10px;
    border-top: 1px solid #3a3a3a;
}

/* 修改画廊样式 */
.history-gallery {
    height: 110px;
    position: relative;
    /* 改为相对定位 */
    width: 100%;
    background: transparent;
    box-shadow: none;
}

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

.comparison-container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

/* 添加处理后图像的样式 */
.processed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

/* 添加画廊样式 */
.history-gallery {
    position: fixed;
    bottom: 0;
    left: 16px;
    /* 与主容器 padding 对齐 */
    right: 356px;
    /* 为右侧控制面板留出空间 320px + 20px gap + 16px padding */
    height: 110px;
    background: #2a2a2a;
    /* 使用与其他组件相同的背景色 */
    border-radius: 4px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

.gallery-container {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    height: 100%;
    padding-bottom: 10px;
}

.gallery-container::-webkit-scrollbar {
    height: 6px;
}

.gallery-container::-webkit-scrollbar-track {
    background: #1e1e1e;
    border-radius: 3px;
}

.gallery-container::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 3px;
}

.gallery-item {
    flex: 0 0 auto;
    width: 100px;
    height: 100px;
    position: relative;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    transition: all 0.2s;
}

.gallery-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.gallery-item.active {
    border-color: orange;
}

.gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 10px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 添加几何矫正控件样式 */
.geometry-controls {
    display: flex;
    gap: 10px;
    padding: 8px;
    background: #2a2a2a;
    border-radius: 4px;
    margin-bottom: 8px;
}

.control-group {
    display: flex;
    gap: 8px;
}

.geometry-controls button {
    padding: 6px 12px;
    background: #3a3a3a;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.geometry-controls button:hover {
    background: #4a4a4a;
}

.geometry-controls button.active {
    background: orange;
}

.perspective-point {
    position: absolute;
    width: 12px;
    height: 12px;
    background: orange;
    border: 2px solid white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    cursor: move;
    z-index: 100;
}

/* 添加新的左侧工具栏样式 */
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

.tool-button.active {
    background: #dd6515;
    color: white;
}

/* 添加确认按钮样式 */
.geometry-confirm {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 1000;
}

.confirm-button,
.cancel-button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.confirm-button {
    background: #dd6515;
    color: white;
}

.confirm-button:hover {
    background: #c55a13;
}

.cancel-button {
    background: #3a3a3a;
    color: white;
}

.cancel-button:hover {
    background: #4a4a4a;
}

/* 添加几何变换选项样式 */
.geometry-confirm {
    background: #2a2a2a;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.geometry-options {
    margin-bottom: 16px;
}

.option-group {
    margin-bottom: 12px;
}

.option-group label {
    display: block;
    color: #fff;
    margin-bottom: 4px;
}

.size-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
}

.size-inputs input[type="number"] {
    width: 80px;
    padding: 4px 8px;
    background: #3a3a3a;
    border: 1px solid #4a4a4a;
    border-radius: 4px;
    color: #fff;
}

.size-inputs span {
    color: #fff;
}

.size-inputs label {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 12px;
}

select {
    padding: 4px 8px;
    background: #3a3a3a;
    border: 1px solid #4a4a4a;
    border-radius: 4px;
    color: #fff;
    width: 100%;
}

.button-group {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

/* 添加裁剪相关样式 */
.crop-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
}

.crop-box {
    position: absolute;
    border: 2px solid #fff;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    cursor: move;
}

.crop-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #fff;
    border: 1px solid #666;
}

.crop-handle.nw {
    top: -5px;
    left: -5px;
    cursor: nw-resize;
}

.crop-handle.n {
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    cursor: n-resize;
}

.crop-handle.ne {
    top: -5px;
    right: -5px;
    cursor: ne-resize;
}

.crop-handle.w {
    top: 50%;
    left: -5px;
    transform: translateY(-50%);
    cursor: w-resize;
}

.crop-handle.e {
    top: 50%;
    right: -5px;
    transform: translateY(-50%);
    cursor: e-resize;
}

.crop-handle.sw {
    bottom: -5px;
    left: -5px;
    cursor: sw-resize;
}

.crop-handle.s {
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    cursor: s-resize;
}

.crop-handle.se {
    bottom: -5px;
    right: -5px;
    cursor: se-resize;
}

/* 修改性能面板样式 */
.performance-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
}

.performance-stats {
    border-top: 1px solid #3a3a3a;
    padding-top: 12px;
    margin-top: 12px;
}

/* 调整直方图面板在浮动窗口中的样式 */
:deep(.histogram-panel) {
    min-height: 150px;
    background: #2a2a2a;
    border-radius: 4px;
    padding: 8px;
}

/* 添加禁用状态样式 */
.tool-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: #666;
}

.tool-button.disabled:hover {
    background: transparent;
}

/* 修改分割线相关样式 */
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

/* 添加扩展点击区域 */
.split-line-hitbox {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -10px;
    /* 向左扩展10px */
    width: 20px;
    /* 总宽度20px,左右各10px */
    cursor: col-resize;
}

.split-line:hover,
.split-line:active {
    background: rgb(255, 166, 0);
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
    /* 确保手柄不会干扰拖拽 */
}

/* 当拖拽时添加视觉反馈 */
.split-line.dragging {
    background: rgb(255, 166, 0);
}
</style>
