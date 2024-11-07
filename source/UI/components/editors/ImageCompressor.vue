<template>
  <div class="image-compressor">
    <!-- 移除压缩控制区域 -->
    <div class="compression-controls">
      <!-- 删除 scale 和 quality 的控制组件 -->
    </div>

    <!-- 增强的预览和信息显示区域 -->
    <div class="preview-container" v-if="previewUrl">
      <div class="image-info-panel">
        <div class="info-section original">
          <h4>原始图片信息</h4>
          <ul class="info-list">
            <li>
              <span class="info-label">尺寸：</span>
              <span>{{ originalInfo.width }} × {{ originalInfo.height }}</span>
            </li>
            <li>
              <span class="info-label">格式：</span>
              <span>{{ originalInfo.format?.toUpperCase() }}</span>
            </li>
            <li>
              <span class="info-label">大小：</span>
              <span>{{ formatFileSize(originalInfo.size) }}</span>
            </li>
          </ul>
        </div>

        <div class="compression-ratio">
          <span class="ratio-value">{{ compressionRatio }}%</span>
          <span class="ratio-label">压缩率</span>
          <div class="ratio-arrow">→</div>
        </div>

        <div class="info-section compressed">
          <h4>压缩后信息</h4>
          <ul class="info-list">
            <li>
              <span class="info-label">尺寸：</span>
              <span>{{ compressedInfo.width }} × {{ compressedInfo.height }}</span>
            </li>
            <li>
              <span class="info-label">格式：</span>
              <span>{{ compressedInfo.format?.toUpperCase() }}</span>
            </li>
            <li>
              <span class="info-label">大小：</span>
              <span>{{ formatFileSize(compressedInfo.size) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="preview-area">
        <div class="preview-wrapper">
          <img :src="previewUrl" class="preview-image" />
        </div>
      </div>
    </div>
  </div>
</template>
<script nodeDefine>
import { requirePluginDeps } from '../../../utils/module/requireDeps.js';
import { ref, computed } from 'vue';

const sharp = requirePluginDeps('sharp');
// 格式化文件大小
// 2. 抽取图片信息管理逻辑
// 使用模块级变量存储单例状态
const imageInfoState = {
  originalInfo: ref({ width: 0, height: 0, size: 0, format: '' }),
  compressedInfo: ref({ width: 0, height: 0, size: 0, format: '' }),
  compressionRatio: computed(() => {
    if (!imageInfoState.originalInfo.value.size || !imageInfoState.compressedInfo.value.size) return 0;
    const ratio = ((imageInfoState.originalInfo.value.size - imageInfoState.compressedInfo.value.size) / imageInfoState.originalInfo.value.size) * 100;
    return Math.round(ratio);
  })
};

// 单例化的 useImageInfo
const useImageInfo = (() => {
  let instance;
  
  return () => {
    if (!instance) {
      instance = {
        ...imageInfoState,
        async updateOriginalInfo(buffer) {
          try {
            const metadata = await sharp(buffer).metadata();
            imageInfoState.originalInfo.value = {
              width: metadata.width,
              height: metadata.height,
              size: buffer.length || buffer.byteLength,
              format: metadata.format
            };
          } catch (error) {
            console.error('获取原始图片信息失败:', error);
          }
        },
        async updateCompressedInfo(outputBuffer, metadata) {
          imageInfoState.compressedInfo.value = {
            width: metadata.width,
            height: metadata.height,
            size: outputBuffer.length,
            format: metadata.format
          };
        }
      };
    }
    return instance;
  };
})();

// 移除压缩控制状态
const compressionState = {
  previewUrl: ref('') // 只保留 previewUrl
};

// 简化 useCompressionControls
const useCompressionControls = (() => {
  let instance;
  
  return (emit) => {
    if (!instance) {
      instance = {
        ...compressionState
      };
    }
    return instance;
  };
})();

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};
let show= async (result,inputs) => {
  // 如果压缩成功，更新预览和信息
  console.log(result, inputs)

  if (result.compressedImage) {

    const { source } = inputs;
    const inputValue = source.value || source;

    // 处理输入buffer
    let inputBuffer;
    if (inputValue instanceof File) {
      inputBuffer = await inputValue.arrayBuffer();
    } else if (inputValue instanceof ArrayBuffer) {
      inputBuffer = inputValue;
    } else if (typeof inputValue === 'string') {
      if (inputValue.startsWith('data:')) {
        const base64Data = inputValue.split(',')[1];
        inputBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const fs = window.require('fs').promises;
        inputBuffer = await fs.readFile(inputValue);
      }
    }
    console.log('aaa', inputBuffer)

    // 更新原始图片信息
    await useImageInfo().updateOriginalInfo(inputBuffer);

    // 更新压缩后的信息
    const outputBuffer = result.compressedImage;
    console.log('bbb', outputBuffer)

    const outputMetadata = await sharp(outputBuffer).metadata();
    const outputBase64 = `data:image/${outputMetadata.format};base64,${outputBuffer.toString('base64')}`;

    await useImageInfo().updateCompressedInfo(outputBuffer, outputMetadata);

    // 更新预览
    compressionState.previewUrl.value = outputBase64;
    console.log(compressionState.previewUrl.value)
  } else {
    // 处理失败时清空预览
    compressionState. previewUrl.value = '';
  }
};
export let nodeDefine = {
  inputs: [
    { name: 'source', type: 'File|ArrayBuffer|string', default: null, label: '输入图片' },
    { name: 'scale', type: 'number', default: 100, label: '缩放比例' },
    { name: 'quality', type: 'number', default: 80, label: '压缩质量' }
  ],
  outputs: [
    { name: 'compressedImage', type: 'Buffer', value: null, label: '压缩后的图片' },
    { name: 'compressionRatio', type: 'number', value: 0, label: '压缩率' }
  ],
  async process(inputs) {
    let { source, scale, quality } = inputs
    if (!source.value) {
      console.error(`Source image is missing`)
      return {
        compressedImage: null,
        compressionRatio: 0
      }
    }
    source = source.value || source
    scale = scale.value || scale
    quality = quality.value || quality
    try {
      let buffer;
      if (source instanceof File) {
        buffer = await source.arrayBuffer();
      } else if (source instanceof ArrayBuffer) {
        buffer = source;
      } else if (typeof source === 'string') {
        if (source.startsWith('data:')) {
          const base64Data = source.split(',')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          const fs = window.require('fs').promises;
          buffer = await fs.readFile(source);
        }
      }

      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();

      if (scale !== 100) {
        const targetWidth = Math.round(metadata.width * (scale / 100));
        sharpInstance.resize({ width: targetWidth, withoutEnlargement: true });
      }

      switch (metadata.format) {
        case 'jpeg':
          sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance.png({ quality });
          break;
        case 'webp':
          sharpInstance.webp({ quality });
          break;
        default:
          sharpInstance.jpeg({ quality });
      }

      const outputBuffer = await sharpInstance.toBuffer();
      const compressionRatio = ((buffer.byteLength - outputBuffer.byteLength) / buffer.byteLength) * 100;
      
      let outputs= {
        compressedImage: outputBuffer,
        compressionRatio: Math.round(compressionRatio)
      }
      show(outputs,inputs)
      return outputs
    } catch (error) {
      console.error('图片压缩失败:', error);
      return {
        compressedImage: null,
        compressionRatio: 0
      }

    }
  }

};
</script>

<script setup>
// 移除不需要的状态和方法
const {
  originalInfo,
  compressedInfo,
  compressionRatio,
  updateOriginalInfo,
  updateCompressedInfo
} = useImageInfo();

const {
  previewUrl
} = useCompressionControls();

// 移除对 scale 和 quality 的监听
// 现在完全依赖 process 方法的输入参数

</script>

<style scoped>
.image-compressor {
  padding: 16px;
}

.compression-controls {
  margin-bottom: 16px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.slider-input {
  flex: 1;
}

.number-input {
  width: 60px;
  padding: 4px;
  text-align: center;
}

.preview-area {
  border: 1px solid #ddd;
  padding: 8px;
  border-radius: 4px;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.image-info {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.preview-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
  margin-top: 16px;
}

.image-info-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.info-section {
  flex: 1;
}

.info-section h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 14px;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-list li {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.info-label {
  color: #909399;
  margin-right: 8px;
  min-width: 48px;
}

.compression-ratio {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px;
  position: relative;
}

.ratio-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.ratio-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.ratio-arrow {
  font-size: 20px;
  color: #409eff;
  margin-top: 4px;
}

.preview-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 8px;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}
</style>