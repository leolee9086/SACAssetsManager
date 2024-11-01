<template>
    <div class="image-compressor">
      <!-- 压缩控制区域 -->
      <div class="compression-controls">
        <div class="control-item">
          <span>缩放</span>
          <input 
            type="range" 
            min="10" 
            max="100" 
            :value="scale" 
            @input="handleScaleChange" 
            class="slider-input" 
          />
          <input 
            type="number" 
            :value="scale" 
            @input="handleScaleChange" 
            class="number-input" 
          />
          <span>%</span>
        </div>
  
        <div class="control-item">
          <span>质量</span>
          <input 
            type="range" 
            min="1" 
            max="100" 
            :value="quality" 
            @input="handleQualityChange" 
            class="slider-input" 
          />
          <input 
            type="number" 
            :value="quality" 
            @input="handleQualityChange" 
            class="number-input" 
          />
        </div>
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
  
  <script setup>
  import { ref, watch, computed, inject, onMounted, onUnmounted } from 'vue';
  import { requirePluginDeps } from '../../../utils/module/requireDeps.js';
  const sharp = requirePluginDeps('sharp');
  
// 定义节点接口配置
const nodeInterface = {
  inputs: {
    image: {
      type: 'input',
      side: 'left',
      position: 0.3,
      label: '输入图片',
      dataType: 'image'
    }
  },
  outputs: {
    compressed: {
      type: 'output', 
      side: 'right',
      position: 0.3,
      label: '压缩结果',
      dataType: 'image'
    }
  }
}

const props = defineProps({
  componentId: {
    type: String,
    required: true
  },
  source: {
    type: [File, ArrayBuffer, String],
    required: true
  }
});

// 注入接口注册方法
const { register = () => [], unregister = () => {} } = inject('nodeInterface', {}) || {};
const registeredAnchors = ref([]);

// 在组件挂载时注册接口
onMounted(() => {
  if (register) {
    registeredAnchors.value = register(props.componentId, nodeInterface)
  }
})

// 在组件卸载时注销接口
onUnmounted(() => {
  if (unregister && registeredAnchors.value.length) {
    unregister(registeredAnchors.value)
  }
})

// 2. 抽取图片信息管理逻辑
const useImageInfo = () => {
  const originalInfo = ref({ width: 0, height: 0, size: 0, format: '' });
  const compressedInfo = ref({ width: 0, height: 0, size: 0, format: '' });
  
  const compressionRatio = computed(() => {
    if (!originalInfo.value.size || !compressedInfo.value.size) return 0;
    const ratio = ((originalInfo.value.size - compressedInfo.value.size) / originalInfo.value.size) * 100;
    return Math.round(ratio);
  });

  const updateOriginalInfo = async (buffer) => {
    try {
      const metadata = await sharp(buffer).metadata();
      originalInfo.value = {
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        format: metadata.format
      };
    } catch (error) {
      console.error('获取原始图片信息失败:', error);
    }
  };

  const updateCompressedInfo = async (outputBuffer, metadata) => {
    compressedInfo.value = {
      width: metadata.width,
      height: metadata.height,
      size: outputBuffer.length,
      format: metadata.format
    };
  };

  return {
    originalInfo,
    compressedInfo,
    compressionRatio,
    updateOriginalInfo,
    updateCompressedInfo
  }
}

// 3. 抽取压缩控制逻辑
const useCompressionControls = (emit) => {
  const scale = ref(100);
  const quality = ref(80);
  const previewUrl = ref('');
  
  const handleScaleChange = (e) => {
    scale.value = Number(e.target.value);
  };
  
  const handleQualityChange = (e) => {
    quality.value = Number(e.target.value);
  };

  return {
    scale,
    quality,
    previewUrl,
    handleScaleChange,
    handleQualityChange
  }
}

// 4. 主要组件逻辑
const emits = defineEmits(['update:compressed']);

// 初始化各个功能模块
const { 
  originalInfo, 
  compressedInfo, 
  compressionRatio, 
  updateOriginalInfo, 
  updateCompressedInfo 
} = useImageInfo();

const {
  scale,
  quality,
  previewUrl,
  handleScaleChange,
  handleQualityChange
} = useCompressionControls(emits);


// 格式化文件大小
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

// 压缩处理函数
const compressImage = async (input) => {
  try {
    let buffer;
    
    // 处理不同类型的输入
    if (input instanceof File) {
      buffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
      buffer = input;
    } else if (typeof input === 'string') {
      // 处理文件路径或base64
      if (input.startsWith('data:')) {
        // 处理base64
        const base64Data = input.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        // 处理文件路径
        const fs = window.require('fs').promises;
        buffer = await fs.readFile(input);
      }
    }
  
    // 更新原始图片信息
    await updateOriginalInfo(buffer);
  
    const sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
  
    // 应用转换
    if (scale.value !== 100) {
      const targetWidth = Math.round(metadata.width * (scale.value / 100));
      sharpInstance.resize({ width: targetWidth, withoutEnlargement: true });
    }
  
    // 应用质量压缩
    switch(metadata.format) {
      case 'jpeg':
        sharpInstance.jpeg({ quality: quality.value });
        break;
      case 'png':
        sharpInstance.png({ quality: quality.value });
        break;
      case 'webp':
        sharpInstance.webp({ quality: quality.value });
        break;
      default:
        sharpInstance.jpeg({ quality: quality.value });
    }
  
    const outputBuffer = await sharpInstance.toBuffer();
    const outputMetadata = await sharp(outputBuffer).metadata(); // 获取压缩后的元数据
    const outputBase64 = `data:image/${metadata.format};base64,${outputBuffer.toString('base64')}`;
    
    // 更新压缩后的信息
    await updateCompressedInfo(outputBuffer, outputMetadata);
    const compressedSize=ref('')
    // 更新预览
    previewUrl.value = outputBase64;
    compressedSize.value = `${(outputBuffer.length / 1024).toFixed(2)} KB`;
  
    // 发出压缩后的结果
    emits('update:compressed', {
      buffer: outputBuffer,
      base64: outputBase64,
      size: outputBuffer.length,
      format: metadata.format
    });
  
  } catch (error) {
    console.error('图片压缩失败:', error);
  }
};
  
  // 监听输入源和参数变化
  watch([() => props.source, scale, quality], async () => {
    if (props.source) {
      await compressImage(props.source);
    }
  }, { immediate: true });
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