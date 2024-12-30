<template>
      <div class="texture-content">
        <div v-for="(typeResults, type) in textureResults" 
             :key="type" 
             class="texture-group">
          <h3>{{ type }}</h3>
          <div class="texture-grid">
            <div v-for="(result, name) in typeResults" 
                 :key="name" 
                 class="texture-item">
              <img :src="getImageDataUrlFromCanvas(result.canvas)" :alt="name" @contextmenu="handleContextMenu($event, result.canvas)">
              <div class="texture-info">
                <span>{{ name }}</span>
                <span>{{ result.width }}x{{ result.height }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { testTextureGenerator } from '../../../utils/image/textures/generators.js'
  
  const visible = ref(false)
  const textureResults = ref({})
  
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
    event.preventDefault() // 阻止默认右键菜单
    
    try {
      // 将canvas转换为blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 0.92)
      })
      
      // 创建ClipboardItem并复制到剪贴板
      const item = new ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([item])
      
      // 可以添加一个提示，告诉用户复制成功
      console.log('图片已复制到剪贴板')
    } catch (error) {
      console.error('复制图片失败:', error)
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
  </style>