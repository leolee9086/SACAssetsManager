<template>
    <div class="main-container">
        <!-- 顶部工具栏 -->
        <Teleport to="#title-group-left">
            <div class="button" @click="openNewFile">打开文件</div>
        </Teleport>

        <!-- 主体内容区域 -->
        <div class="content-wrapper">
            <ImageToolbar :rotation="rotation.value" :flips="flips" :perspective-mode="perspectiveMode"
                :is-resize-mode="isResizeMode" :is-stack-mode="isStackMode" :is-edit-mode="isEditMode"
                :is-crop-mode="isCropMode" :is-processed-only-view="isProcessedOnlyView"
                :is-split-view-enabled="isSplitViewEnabled" :can-use-geometry-tools="canUseGeometryTools"
                @rotate="rotate" @flip="flip" @toggle-perspective-mode="togglePerspectiveMode"
                @toggle-resize-mode="toggleResizeMode" @toggle-stack-mode="toggleStackMode"
                @toggle-edit-mode="toggleEditMode" @toggle-crop-mode="toggleCropMode"
                @toggle-processed-only-view="切换裂像预览与仅结果预览" @toggle-split-view="切换裂像预览与仅结果预览" />

            <!-- 左侧预览区域 -->
            <div class="preview-section">
                <div class="image-container" @wheel="handleWheel" @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
                    <div class="comparison-container" ref="comparisonContainer">
                        <img ref="processedImg" :src="processedImg?.src" :style="getImageStyle()" alt="处理后图像" />
                        <img v-if="viewState.mode === 'split'" v-show="originalImg?.src" ref="originalImg"
                            :src="originalImg?.src" :style="[getImageStyle(), getClipStyle]" alt="原始图像" />
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
                <floatLayerWindow headless="true" title='处理状态' :initial-width="400" :initial-height="300">
                    <PerformancePanel :stats="performanceStats" :sharp-object="currentSharpObject"
                        :image-path="imagePath" :image-info="originalImageInfo"
                        @histogram-updated="handleHistogramUpdate" />
                </floatLayerWindow>
                <floatLayerWindow v-if="isEditMode" headless="true" title='处理状态' :show-background="false"
                    :show-shadow="false" :initial-width="100" :initial-height="300">
                    <BrushToolbar />
                </floatLayerWindow>
            </div>

            <!-- 右侧控制面板 -->
            <div class="control-section" v-if="isStackMode">
                <ImageAdjuster ref="imageAdjuster" :effect-stack="effectStack" :dragging-effect-id="draggingEffectId"
                    @update:effect-stack="handleEffectStackChange" @effect-param-change="updateProcessingPipeline" />
            </div>
        </div>
        <textureGallery></textureGallery>
        <imageGalleryHori :history-queue="历史队列" :current-path="imagePath" @select="switchToImage" />


        <!-- 修改几何变换确认面板 -->
        <GeometryConfirm :has-geometry-changes="hasGeometryChanges" :is-resize-mode="isResizeMode"
            :is-crop-mode="isCropMode" :resize-options="resizeOptions" :crop-box="cropBox" :output-format="outputFormat"
            @resize-input="handleResizeInput" @crop-input="handleCropInput" @confirm-changes="confirmChanges"
            @cancel-changes="cancelChanges" />
    </div>
</template>

<script setup>
import floatLayerWindow from '../../../components/common/floatLayerWindow/floatLayerWindow.vue';
import textureGallery from './textureGallery.vue';
import ImageAdjuster from './ImageAdjuster.vue';
import imageGalleryHori from './components/imageGalleryHori.vue';
import { ref, computed, inject, toRef, onUnmounted, onMounted, shallowRef, watch } from 'vue';
import { fromFilePath, fromBuffer } from '../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';
import { requirePluginDeps } from '../../../../utils/module/requireDeps.js';
import { getImageDisplayRect } from './utils/css.js';
import { 选择图片文件 } from '../../../../utils/useRemote/dialog.js';
import { 覆盖保存 } from '../../../../utils/fs/write.js';
import { 获取实际裁剪区域, 获取相对图像边界 } from './utils/common.js';
import { previewState, 从sharp对象更新处理后预览图像, 从路径更新原始预览图像, 刷新并获取预览控制器信号, 更新处理前后预览图像, 清除预览更新定时器, 获取上次预览更新间隔 as 获取上次预览更新间隔, 设置预览更新定时器, 重置所有预览状态, 重置预览控制器 } from './state/previewState.js'
import {
    文件历史管理器,
    历史队列,
    effectStack,
    效果堆栈管理器,
    cropBox,
    裁剪框控制器,
    $hasGeometryChanges,
    $perspectiveModeState,
    $isResizeMode,
    $isStackMode,
    $isEditMode,
    $是否裁剪模式状态量,
    useResizeOptions,
    useFlips,
    AddSplitControllerToView,
    尺寸调整模式控制器
} from './state/index.js';
import PerformancePanel from './perfoemancePanel.vue';
import ImageToolbar from './ImageToolbar.vue'
import BrushToolbar from './BrushToolbar.vue';
import { buildFlipPipeLine } from './pipelineBuilder.js';
import GeometryConfirm from './components/GeometryConfirm.vue';
import {
    originalImageInfo,
    从sharp对象更新原始图状态,
    从文件路径更新原始图状态,
    原始图是否超大图片,
    原始图比例
} from './state/imageInfos.js';
import { 从图片元素和容器初始化裁剪框, 停止拖拽裁剪框, 开始拖拽裁剪框, 更新裁剪开始位置 } from './state/cropBoxController.js';
import { cropStartPos, cropResizeHandle, isDraggingCrop, cropHandles } from './state/cropBoxController.js';
// 1. 添加编辑器状态管理
import { editorState, 切换编辑器到空闲模式, canUseGeometryTools } from './state/editorState.js';
import { 生成缩略图 } from './utils/thumbnail.js';
import { 清理处理前后图像blob } from './state/previewState.js';

const sharp = requirePluginDeps('sharp')

const 添加新文件 = async (newPath) => {
    try {
        const testImage = await fromFilePath(newPath);
        重置所有预览状态()
        if (currentSharpObject.value) {
            currentSharpObject.value = null;
        }
        const thumbnailUrl = await 生成缩略图(testImage);
        文件历史管理器.添加(newPath, thumbnailUrl)
        imagePath.value = newPath;
        await 从文件路径更新原始图状态(newPath)
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
        重置预览控制器()
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
        从sharp对象更新原始图状态(originalImage)
        await generatePreview(originalImage);
        await resetAdjustments();
    } catch (error) {
        console.error('切换图片失败:', error);
    }
};

const appData = inject('appData')
const imagePath = toRef(appData.imagePath || window.imagePath)
const comparisonContainer = ref(null)
import { originalImg,processedImg } from './state/previewState.js';
const info = ref({})
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
    if (获取上次预览更新间隔() < resolutionConfig.adjustmentThreshold.rapid) {
        return resolutionConfig.resolutionLevels.rapid;  // 480
    } else if (获取上次预览更新间隔() < resolutionConfig.adjustmentThreshold.normal) {
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
        const signal = await 刷新并获取预览控制器信号()
        // 新版本号
        const currentVersion = ++previewState.value.renderVersion;

        // 获取图像尺寸
        const isLargeImage = 原始图是否超大图片.value


        if (isLargeImage) {
            // 大图像使用渐进式渲染
            // 记录调整时
            锁定预览更新()
            // 清除之前的定时器
            清除预览更新定时器()
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
                    let processedImg = 对buffer应用效果堆栈(lowResBuffer,processingPipeline)
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

                        let processedImg = 对buffer应用效果堆栈(higherResBuffer,processingPipeline)
                        if (signal.aborted) return;
                        currentSharpObject.value = processedImg;
                        await generatePreview(processedImg);
                        previewState.value.currentResolution = nextLevel;
                        previewState.value.previewTimeout = setTimeout(upgradeResolution, 200);
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error('分辨率提升失败:', error);
                        }
                    }
                } else {
                    // 最终渲染原图
                    解锁预览更新()
                    await processWithFullResolution(processingPipeline, signal);
                }
            };
            // 延迟开始分辨率提升
            设置预览更新定时器(upgradeResolution)
        } else {
            // 小图像直接进行全分辨率渲染
            try {
                let processedImg =await 对图像路径应用效果堆栈(imagePath.value,processingPipeline)
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
        // 重要：这里除了额外的时间检查，因为已经在上层确保了时机
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
const generatePreview = async(处理后sharp对象)=>{
    await 更新处理前后预览图像(处理后sharp对象,imagePath.value)
}

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
        停止拖拽裁剪框()
        cropResizeHandle.value = null;
    }
    if (isDragging.value) {
        isDragging.value = false;
        document.body.style.cursor = 'default';
    }
};


// 添加几何矫正相关的状态
const rotation = ref(0)
const { state: flips } = useFlips("globalProcess")
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
        useFlips("globalProcess").flipDirection(direction)
        useFlips("globalProcess").getPipeLine()
        await handleProcessingUpdate(buildFlipPipeLine(flips.value))
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
const hasGeometryChanges = computed(() => $hasGeometryChanges(editorState, perspectiveMode, isResizeMode, isCropMode, isStackMode))

// 添加新的响应式状态
const { state: resizeOptions } = useResizeOptions("globalProcess")

const outputFormat = ref('jpeg');

// 处理尺寸输入
const handleResizeInput = (dimension) => {
    const aspectRatio = 原始图比例.value
    useResizeOptions("globalProcess").handleResizeInputWithRatio(dimension, aspectRatio)
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
                useResizeOptions("globalProcess").使用图片信息重置(originalImageInfo.value)
                尺寸调整模式控制器(isResizeMode).退出尺寸调整模式()
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

        切换编辑器到空闲模式()

        // 重新生成���览
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
                    processedImage = await useResizeOptions('globalProcess').应用到sharp图片对象(processedImage)
                }
                break
            case 'crop':
                // 处理裁剪
                if (isCropMode.value) {
                    const cropArea = 获取实际裁剪区域(comparisonContainer.value, processedImg.value, originalImageInfo.value)
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




// 修改初始化裁剪框函数，使其相对于原图定位
const 初始化裁剪框 = () => {
    const container = comparisonContainer.value;
    const processedImage = processedImg.value;
    从图片元素和容器初始化裁剪框(container, processedImage)
};
// 添加获取实际裁剪区域的函数


// 处理裁剪框拖动
const handleCropResize = (e, position) => {
    if (!isCropMode.value) return;
    开始拖拽裁剪框()
    更新裁剪开始位置(e, position)
};

// 修改鼠标移动处理函数，限制裁剪框在图像范围内
const handleMouseMove = (e) => {
    if (isDraggingCrop.value && processedImg.value) {
        const container = comparisonContainer.value;
        // 计算图像边界
        const bounds = 获取相对图像边界(container, processedImg.value)

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
            裁剪框控制器.应用裁剪框(newBox);
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
const cropBoxStyle = computed(裁剪框控制器.获取css尺寸样式);

import { viewState, 切换裂像预览与仅结果预览, isSplitViewEnabled, isProcessedOnlyView } from './state/useViewState.js';
import { 对buffer应用效果堆栈, 对图像路径应用效果堆栈 } from './process/pipeline.js';

const {
    handleSplitDrag,
    getSplitLineStyle,
    getClipStyle,
} = AddSplitControllerToView(
    () => comparisonContainer.value,
    () => originalImageInfo.value,
    () => scale.value,
    () => offset.value,
    viewState)



// 2. 视图锁定相关的计算属性
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



const isStackMode = $isStackMode(
    editorState,
    stateTransition,
    imageAdjuster,
    imagePath,
    outputFormat,
    currentSharpObject,
    覆盖保存,
    添加新文件,
    loadSavedSettings
)
const isResizeMode = $isResizeMode(editorState, stateTransition, viewState, isStackMode)

const isCropMode = $是否裁剪模式状态量(editorState, stateTransition, isStackMode, viewState, 初始化裁剪框)
const isEditMode = $isEditMode(editorState, stateTransition, isStackMode)

// 简化模式切换函数
const toggleStackMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !isStackMode.value
    isStackMode.value = newValue
}

const togglePerspectiveMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !perspectiveMode.value
    perspectiveMode.value = newValue
}

const toggleResizeMode = 尺寸调整模式控制器.切换尺寸调整模式

const toggleCropMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !isCropMode.value
    isCropMode.value = newValue
}

const toggleEditMode = async (forceValue) => {
    const newValue = typeof forceValue === 'boolean' ? forceValue : !isEditMode.value
    isEditMode.value = newValue
}




// 添加仅显示处理后视图的计算属性
// 3. 修改现有的状态计算属性
const perspectiveMode = computed($perspectiveModeState(editorState, stateTransition, isStackMode, viewState))


// 添加裁剪输入处理函数
const handleCropInput = (cropData) => {
    if (!cropBox.value) return;

    // 获取图像容器和图像元素
    const container = comparisonContainer.value;
    const image = processedImg.value;
    if (!container || !image) return;

    // 获取图像的实际显示尺寸和位置
    const bounds = 获取相对图像边界(container, image);

    // 根据输入的裁剪数据更新裁剪框
    const newBox = {
        x: bounds.left + (bounds.width * (cropData.x / 100)),
        y: bounds.top + (bounds.height * (cropData.y / 100)),
        width: bounds.width * (cropData.width / 100),
        height: bounds.height * (cropData.height / 100)
    };

    // 确保裁剪框在图像范围内
    newBox.x = Math.max(bounds.left, Math.min(bounds.right - newBox.width, newBox.x));
    newBox.y = Math.max(bounds.top, Math.min(bounds.bottom - newBox.height, newBox.y));
    newBox.width = Math.min(newBox.width, bounds.right - newBox.x);
    newBox.height = Math.min(newBox.height, bounds.bottom - newBox.y);

    // 应用新的裁剪框尺寸
    裁剪框控制器.应用裁剪框(newBox);
};

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
