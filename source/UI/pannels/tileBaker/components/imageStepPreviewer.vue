<template>
    <div class="step-item" :class="{ 'step-warning': isSlowExecution }">
      <div class="step-content">
        <div class="step-info">
          <div class="step-header">
            <h3>{{ name }}</h3>
            <span class="step-duration" :class="{ 'duration-warning': isSlowExecution }" v-if="duration">
              {{ duration }}ms
            </span>
          </div>
          <div class="step-status">
            <span class="status-dot" :class="{ 
              active: processed,
              warning: isSlowExecution 
            }"></span>
            {{ processed ? '已处理' : '未处理' }}
            <span v-if="isSlowExecution" class="warning-text">
              处理时间过长
            </span>
          </div>
          <slot name="controls"></slot>
        </div>
        <div class="step-preview" v-show="processed">
          <canvas ref="thumbnailCanvas" class="thumbnail"></canvas>
        </div>
        <processor-params
          v-if="processorParams.length"
          :params="processorParams"
          :initial-values="initialParamValues"
          @update:params="params => emit('update:params', params)"
        />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, nextTick, computed } from 'vue'

  // Props 定义
  const props = defineProps({
    name: String,
    processed: Boolean,
    duration: Number,
    sourceCtx: {
      type: Object,
      required: false,
      default: null
    },
    thumbnailSize: {
      type: Number,
      default: 100
    },
    processorParams: {
      type: Array,
      default: () => []
    },
    initialParamValues: {
      type: Object,
      default: () => ({})
    }
  })

  const emit = defineEmits(['update:params'])

  // 执行时间警告阈值（毫秒）
  const SLOW_EXECUTION_THRESHOLD = 15

  // 计算是否为慢执行
  const isSlowExecution = computed(() => {
    return props.processed && props.duration && props.duration > SLOW_EXECUTION_THRESHOLD
  })

  // 监视执行时间
  watch(() => props.duration, (newDuration) => {
    if (newDuration > SLOW_EXECUTION_THRESHOLD) {
      console.warn(`处理步骤 "${props.name}" 执行时间 ${newDuration}ms 超过 ${SLOW_EXECUTION_THRESHOLD}ms`)
    }
  })

  const thumbnailCanvas = ref(null)

  // 创建缩略图的方法
  const createThumbnail = async () => {
    // 等待下一个 tick，确保 canvas 已经渲染
    await nextTick()
    if (!props.sourceCtx || !thumbnailCanvas.value) {
      console.debug('跳过缩略图创建：源CTX或目标画布不可用')
      return
    }

    try {
      // 设置缩略图尺寸
      thumbnailCanvas.value.width = props.thumbnailSize
      thumbnailCanvas.value.height = props.thumbnailSize

      // 使用 ImageCTX 的 updatePreview 方法
      props.sourceCtx.updatePreview(thumbnailCanvas.value, {
        width: props.thumbnailSize,
        height: props.thumbnailSize,
        smoothing: true,
        quality: 'high'
      })
    } catch (error) {
      console.error('缩略图创建失败:', error)
    }
  }

  // 监听 sourceCtx 变化
  watch(() => props.sourceCtx, async (newCtx) => {
    if (newCtx && props.processed) {
      await createThumbnail()
    }
  })

  // 监听 processed 状态变化
  watch(() => props.processed, async (newProcessed) => {
    if (newProcessed && props.sourceCtx) {
      await createThumbnail()
    }
  })

  // 组件挂载时初始化缩略图
  onMounted(async () => {
    if (props.processed && props.sourceCtx) {
      await createThumbnail()
    }
  })
  </script>

  <style scoped>
  .step-item {
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 4px;
    background-color: #fff;
    transition: all 0.3s ease;
  }

  .step-item.step-warning {
    background-color: #fff9e6;
    border-color: #ffd77a;
  }

  .step-content {
    display: flex;
    gap: 15px;
    align-items: stretch;
  }

  .step-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .step-header h3 {
    margin: 0;
    font-size: 1em;
  }

  .step-duration {
    font-size: 0.9em;
    color: #666;
    transition: color 0.3s ease;
  }

  .duration-warning {
    color: #f5a623;
    font-weight: bold;
  }

  .step-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9em;
    color: #666;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ccc;
    transition: background-color 0.3s ease;
  }

  .status-dot.active {
    background-color: #4CAF50;
  }

  .status-dot.active.warning {
    background-color: #f5a623;
  }

  .warning-text {
    color: #f5a623;
    font-size: 0.9em;
  }

  .step-preview {
    flex: 0 0 100px;
    width: 100px;
    height: 100px;
    border: 1px solid #eee;
    border-radius: 4px;
    overflow: hidden;
    background-color: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumbnail {
    max-width: 100%;
    max-height: 100%;
    display: block;
    object-fit: contain;
  }

  :slotted(.controls) {
    margin-top: auto;
    padding-top: 10px;
  }

  .download-button {
    margin-top: 10px;
    padding: 6px 12px;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    transition: background-color 0.3s;
  }

  .download-button:hover {
    background-color: #1976D2;
  }
  </style>