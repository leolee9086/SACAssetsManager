<template>
    <div class="brightness-adjuster">

        <!-- 预览区域 -->
        <div class="preview-container">
            <div v-if="isProcessing" class="processing-overlay">
                处理中...
            </div>
            <img 
                v-if="previewUrl" 
                :src="previewUrl" 
                class="preview-image" 
                @error="handleImageError"
            />
            <div v-else-if="error" class="error-message">
                {{ error }}
            </div>
        </div>
    </div>
</template>

<script nodeDefine>
import { ref } from 'vue';

// 工具函数
const utils = {
    adjustImageBrightness(imageData, brightnessValue) {
        const newData = new Uint8ClampedArray(imageData.data);
        // 将亮度值转换为调整因子
        const factor = 1 + (parseInt(brightnessValue) / 100);
        console.log(newData,factor,brightnessValue);

        for (let i = 0; i < newData.length; i += 4) {
            // 对RGB通道进行调整
            for (let j = 0; j < 3; j++) {
                // 使用 Uint8ClampedArray 的自动裁剪特性
                newData[i + j] = Math.min(255, Math.max(0, imageData.data[i + j] * factor));
            }
            newData[i + 3] = imageData.data[i + 3]; // 保持 alpha 通道不变
        }
        console.log(newData);

        return new ImageData(newData, imageData.width, imageData.height);
    },

    createCanvas() {
        try {
            const canvas = new OffscreenCanvas(1, 1);
            return {
                canvas,
                ctx: canvas.getContext('2d', { willReadFrequently: true })
            };
        } catch (error) {
            console.warn('OffscreenCanvas not supported, falling back to regular canvas');
            const canvas = new HTMLCanvasElement();
            return {
                canvas,
                ctx: canvas.getContext('2d', { willReadFrequently: true })
            };
        }
    },

    cloneImageData(imageData) {
        return new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
    }
};

// 简化 nodeData，只保存设置
export const nodeData = ref({
    brightness: 0,
});

export const nodeDefine = {
    flowType: "process",
    inputs: {
        image: {
            type: 'ImageData',
            label: '输入图像',
        },
        brightness: {
            type: Number,
            label: '亮度值',
            default: 0,
            min: -100,
            max: 100
        }
    },
    outputs: {
        outputImage: {
            type: 'ImageData',
            label: '处理后图像',
        },
        brightnessValue: {
            type: Number,
            label: '当前亮度值'
        },
        previewUrl: {
            type: String,
            label: '预览URL'
        }
    },
    
    async process(inputs) {
        let { image, brightness: inputBrightness = 0 } = inputs;
        // 处理可能的 ref 包装
        image = image.value || image;
        inputBrightness=inputBrightness.value||inputBrightness
        if (!image) return null;
        try {
            const { canvas, ctx } = utils.createCanvas();
            
            let imageData;
            if (image instanceof File) {
                const url = URL.createObjectURL(image);
                try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    
                    await new Promise((resolve, reject) => {
                        img.onload = () => {
                            console.log('图片加载成功:', img.width, img.height);
                            resolve();
                        };
                        img.onerror = (e) => {
                            console.error('图片加载失败:', e);
                            reject(new Error('图片加载失败'));
                        };
                        img.src = url;
                    });
                    
                    if (img.width === 0 || img.height === 0) {
                        throw new Error('加载的图片尺寸无效');
                    }
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    console.log('获取的图像数据:', {
                        width: imageData.width,
                        height: imageData.height,
                        dataLength: imageData.data.length,
                        samplePixels: [
                            imageData.data[0],
                            imageData.data[1],
                            imageData.data[2],
                            imageData.data[3]
                        ]
                    });
                    
                    if (imageData.data.every(val => val === 0)) {
                        throw new Error('图像数据全为零，可能加载失败');
                    }
                } catch (error) {
                    console.error('图像处理错误:', error);
                    throw error;
                } finally {
                    URL.revokeObjectURL(url);
                }
            } else if (image instanceof ImageData) {
                canvas.width = image.width;
                canvas.height = image.height;
                imageData = utils.cloneImageData(image);
            } else {
                throw new Error('不支持的图像格式');
            }
            console.log(imageData)

            const adjustedImageData = utils.adjustImageBrightness(
                imageData,
                inputBrightness
            );
            await updatePreview(adjustedImageData)
            console.error('111',adjustedImageData)
            return {
                outputImage: previewUrl.value,
                brightnessValue: inputBrightness,
                previewUrl: null
            };
        } catch (error) {
            console.error('图像处理失败:', error);
            throw new Error(`图像处理失败: ${error.message}`);
        }
    }
};
let canvas, ctx;
const error = ref(null);

async function updatePreview(imageData) {
    try {
        // 创建普通 canvas 元素用于预览
        const previewCanvas = document.createElement('canvas');
        const previewCtx = previewCanvas.getContext('2d');
        
        previewCanvas.width = imageData.width;
        previewCanvas.height = imageData.height;
        
        // 清理旧的预览URL
        if (previewUrl.value) {
            URL.revokeObjectURL(previewUrl.value);
        }
        
        // 将图像数据绘制到预览canvas
        previewCtx.putImageData(imageData, 0, 0);
        
        // 转换为 Blob
        const blob = await new Promise((resolve, reject) => {
            previewCanvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create blob'));
            }, 'image/png');
        });
        
        previewUrl.value = URL.createObjectURL(blob);
    } catch (err) {
        error.value = '预览生成失败';
        console.error('预览生成错误:', err);
    }
}
const previewUrl = ref('');

</script>

<script setup>
import {  watch, onMounted, onBeforeUnmount } from 'vue';

// 修改状态管理
const brightness = ref(nodeData.value.brightness);
const currentImageData = ref(null);
const isProcessing = ref(false);


// 初始化
onMounted(() => {
    initCanvas();
    // 恢复上次的处理状态
    if (nodeData.value.lastProcessedImage) {
        currentImageData.value = nodeData.value.lastProcessedImage;
        handleBrightnessChange();
    }
});

function initCanvas() {
    if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d', { willReadFrequently: true });
    }
}


// 处理亮度改变
async function handleBrightnessChange() {
    if (!currentImageData.value) return;
    
    error.value = null;
    isProcessing.value = true;
    
    try {
        const result = await nodeDefine.process({
            brightness: brightness.value,
            image: currentImageData.value
        });
        
        if (result?.image) {
            await updatePreview(result.image);
        }
    } catch (err) {
        error.value = err.message;
        console.error(err);
    } finally {
        isProcessing.value = false;
    }
}

// 更新预览图

function handleImageError() {
    error.value = '图片加载失败';
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = '';
    }
}

// 监听亮度变化，同步到 nodeData
watch(brightness, (newValue) => {
    nodeData.value.brightness = newValue;
});

// 修改图像输入监听
/*watch(() => nodeDefine.inputs.image, (newImage) => {
    if (newImage) {
        currentImageData.value = utils.cloneImageData(newImage);
        handleBrightnessChange();
    }
}, { immediate: true });*/

// 清理资源
onBeforeUnmount(() => {
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
    }
});

// 暴露接口
defineExpose({
    brightness,
    previewUrl,
    handleBrightnessChange,
    currentImageData
});
</script>

<style scoped>
.brightness-adjuster {
    padding: 12px;
    position: relative;
}

.slider-container {
    margin-bottom: 12px;
}

.brightness-slider {
    width: 100%;
    margin-top: 8px;
    cursor: pointer;
}

.brightness-slider:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.preview-container {
    position: relative;
    margin-top: 12px;
    border: 1px solid #ddd;
    padding: 8px;
    border-radius: 4px;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-image {
    max-width: 100%;
    height: auto;
    display: block;
}

.processing-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
}

.error-message {
    color: #ff4d4f;
    text-align: center;
    padding: 12px;
}

label {
    display: block;
    margin-bottom: 4px;
    color: #666;
}
</style>
