<template>
  <div class="texture-content" @dblclick="toggleFullscreen">
    <div v-if="!isFullscreen" 
         v-for="(typeResults, type) in textureResults" 
         :key="type" 
         class="texture-group">
      <h3>{{ type }}</h3>
      <div class="texture-grid">
        <div v-for="(result, name) in typeResults" 
             :key="name" 
             class="texture-item">
          <img :src="getImageDataUrlFromCanvas(result.canvas)" 
               :alt="name" 
               @contextmenu="handleContextMenu($event, result.canvas)">
          <div class="texture-info">
            <span>{{ name }}</span>
            <span>{{ result.width }}x{{ result.height }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 全屏平铺预览 -->
    <div v-else 
         class="fullscreen-preview">
      <div class="tiled-background" 
           :style="{
             backgroundImage: `url(${currentFullscreenImage})`,
             backgroundSize: '256px 256px'
           }">
        <button class="exit-button" 
                @click="toggleFullscreen">
          退出预览
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { testTextureGenerator } from '../../../utils/image/textures/generators.js'

const visible = ref(false)
const textureResults = ref({})
const isFullscreen = ref(false)
const currentFullscreenImage = ref('')
const tileStyle = ref({
  width: '256px',
  height: '256px',
  objectFit: 'none',
})

const getImageDataUrlFromCanvas = (canvas, type = 'image/png', quality = 0.92) => {
  try {
    return canvas.toDataURL(type, quality);
  } catch (error) {
    console.error('从Canvas生成DataURL时出错:', error);
    return '';
  }
}

// 初始化纹理数据
const initTextures = async () => {
  const results = await testTextureGenerator()
  textureResults.value = results
  visible.value = true
}

// 处理右键点击事件
const handleContextMenu = async (event, canvas) => {
  event.preventDefault()
  
  try {
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png', 0.92)
    })
    
    const item = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([item])
    
    console.log('图片已复制到剪贴板')
  } catch (error) {
    console.error('复制图片失败:', error)
  }
}

// 切换全屏预览
const toggleFullscreen = (event) => {
  if (!isFullscreen.value) {
    // 获取点击的图片源
    const img = event.target.closest('.texture-item')?.querySelector('img')
    if (img) {
      currentFullscreenImage.value = img.src
      isFullscreen.value = true
      document.body.style.overflow = 'hidden' // 防止滚动
    }
  } else {
    isFullscreen.value = false
    currentFullscreenImage.value = ''
    document.body.style.overflow = '' // 恢复滚动
  }
}

// 初始化
initTextures()
</script>

<style scoped>
.texture-content {
  height: 100%;
  overflow: auto;
}

.texture-group {
  margin-bottom: var(--cc-space-xl);
}

.texture-group h3 {
  margin: 0 0 var(--cc-space-md) 0;
  font-size: var(--cc-size-icon-sm);
  color: var(--cc-theme-on-surface-light);
}

.texture-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--cc-space-md);
}

.texture-item {
  display: flex;
  flex-direction: column;
  gap: var(--cc-space-sm);
}

.texture-item img {
  width: 100%;
  height: auto;
  border-radius: var(--cc-border-radius);
  border: var(--cc-border-width) solid var(--cc-border-color);
  transition: transform var(--cc-duration-fast) var(--cc-ease);
}

.texture-item img:hover {
  transform: scale(var(--cc-scale-hover));
}

.texture-info {
  display: flex;
  flex-direction: column;
  font-size: var(--cc-size-icon-xs);
  color: var(--cc-theme-on-surface);
}

/* 全屏预览样式 */
.fullscreen-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--cc-theme-surface);
  z-index: 1000;
  overflow: hidden;
}

.tiled-background {
  width: 100%;
  height: 100%;
  background-repeat: repeat;
  image-rendering: pixelated;
  background-position: center center;
}

.exit-button {
  position: fixed;
  top: var(--cc-space-md);
  right: var(--cc-space-md);
  padding: var(--cc-space-sm) var(--cc-space-md);
  background: var(--cc-theme-surface);
  color: var(--cc-theme-on-surface);
  border: var(--cc-border-width) solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
  z-index: 1001;
  transition: all var(--cc-duration-fast) var(--cc-ease);
}

.exit-button:hover {
  background: var(--cc-theme-surface-hover);
  transform: scale(var(--cc-scale-hover));
}
</style>