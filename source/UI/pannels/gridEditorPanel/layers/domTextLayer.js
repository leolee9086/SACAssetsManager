import Konva from '../../../../../static/konva.js'
import { getSysFonts } from '../../../../fromThirdParty/siyuanKernel/system.js'
import { addScript } from '../../../../utils/DOM/addScript.js'
// 添加缓存存储
const contentCache = new Map()

// 添加html2canvas加载函数
const loadHtml2Canvas = async () => {
  if (window.html2canvas) return window.html2canvas
  
  await addScript("/stage/protyle/js/html2canvas.min.js?v=1.4.1", "protyleHtml2canvas")
  return window.html2canvas
}
const html2canvas = await loadHtml2Canvas()

const createDOMTextLayer = async () => {
  const layer = {
    name: 'DOM文本',
    icon: '📄',
    group: 'text',
    presets: [
      {
        name: '霓虹灯效果',
        icon: '✨',
        config: {
          text: '霓虹灯文本',
          htmlContent: true,
          size: 36,
          color: '#fff',
          cssText: `
            text-shadow: 
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 15px #0073e6,
              0 0 20px #0073e6,
              0 0 25px #0073e6;
            font-weight: bold;
          `
        }
      },
      {
        name: '渐变文字',
        icon: '🌈',
        config: {
          text: '渐变文本',
          htmlContent: true,
          size: 42,
          cssText: ``,
          text: `<svg viewBox="0 0 500 100" style="width: 100%; height: 100%;">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ff6b6b;" />
                <stop offset="100%" style="stop-color:#4ecdc4;" />
              </linearGradient>
            </defs>
            <text x="50%" y="50%" 
              dominant-baseline="middle" 
              text-anchor="middle"
              fill="url(#gradient)"
              style="font-size: 42px; font-weight: bold;">渐变文本</text>
          </svg>`
        }
      },
      {
        name: '立体文字',
        icon: '🎭',
        config: {
          text: '立体文字',
          htmlContent: true,
          size: 48,
          color: '#2c3e50',
          cssText: `
            text-shadow: 
              1px 1px 1px #919191,
              1px 2px 1px #919191,
              1px 3px 1px #919191,
              1px 4px 1px #919191,
              1px 5px 1px #919191,
              1px 6px 1px #919191;
            font-weight: bold;
          `
        }
      },
      {
        name: '描边文字',
        icon: '✏️',
        config: {
          text: '描边文字',
          htmlContent: true,
          size: 36,
          color: '#ffffff',
          cssText: `
            -webkit-text-stroke: 2px #ff6b6b;
            font-weight: bold;
          `
        }
      },
      {
        name: '毛玻璃效果',
        icon: '🌫️',
        config: {
          text: '毛玻璃文本',
          htmlContent: true,
          size: 32,
          color: 'rgba(255,255,255,0.8)',
          cssText: `
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          `
        }
      }
    ],
    defaultConfig: {
      // ... 与textLayer相同的默认配置 ...
      text: '新建DOM文本',
      // 新增DOM特有配置
      htmlContent: true, // 是否启用HTML渲染
      cssText: '' // 自定义CSS样式
    },
    adjustments: [
      // ... 保留原有的文本调整项 ...
      {
        key: 'htmlContent',
        type: 'boolean',
        label: 'HTML渲染',
        component: 'Switch'
      },
      {
        key: 'cssText',
        type: 'text',
        label: 'CSS样式',
        component: 'TextArea'
      }
    ],
    render: async (config, layerId, stage, handleShapeClick) => {
      
      // 为每个渐变生成唯一ID
      const uniqueId = 'gradient-' + Math.random().toString(36).substr(2, 9)
      let processedText = config.text
      if (config.text.includes('<linearGradient id="gradient"')) {
        processedText = config.text.replace('gradient"', uniqueId + '"')
          .replace('url(#gradient)', `url(#${uniqueId})`)
      }

      // 生成缓存key
      const cacheKey = JSON.stringify({
        text: processedText,  // 使用处理后的文本
        htmlContent: config.htmlContent,
        fontFamily: config.fontFamily,
        size: config.size,
        color: config.color,
        lineHeight: config.lineHeight,
        letterSpacing: config.letterSpacing,
        padding: config.padding,
        opacity: config.opacity,
        cssText: config.cssText
      })

      // 检查缓存
      let canvas = contentCache.get(cacheKey)
      
      if (!canvas) {
        // 如果缓存不存在，创建新的渲染
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.left = '-9999px'
        container.innerHTML = config.htmlContent ? config.text : document.createTextNode(config.text).textContent
        container.style.cssText += `
          font-family: ${config.fontFamily};
          font-size: ${config.size}px;
          color: ${config.color};
          line-height: ${config.lineHeight};
          letter-spacing: ${config.letterSpacing}px;
          padding: ${config.padding}px;
          opacity: ${config.opacity};
          ${config.cssText}
        `
        document.body.appendChild(container)

        canvas = await html2canvas(container, {
          backgroundColor: null,  // 设置背景为透明
          removeContainer: true   // 自动移除临时容器
        })
        document.body.removeChild(container)
        
        // 存入缓存
        contentCache.set(cacheKey, canvas)
        
        // 简单的缓存清理机制：当缓存项超过50个时，删除最早的项
        if (contentCache.size > 50) {
          const firstKey = contentCache.keys().next().value
          contentCache.delete(firstKey)
        }
      }

      // 创建图像节点
      const imageNode = new Konva.Image({
        x: config.x || 0,
        y: config.y || 0,
        width: canvas.width,
        height: canvas.height,
        image: canvas,
        draggable: !config.locked,
        name: layerId
      })

      // 创建变换器，参考textLayer的实现
      const tr = new Konva.Transformer({
        nodes: [imageNode],
        enabledAnchors: [
          'top-left',
          'top-center',
          'top-right',
          'middle-left',
          'middle-right',
          'bottom-left',
          'bottom-center',
          'bottom-right'
        ],
        rotateEnabled: true,
        rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
        keepRatio: true,
        padding: 5,
        borderStroke: '#0099ff',
        borderStrokeWidth: 1,
        anchorStroke: '#0099ff',
        anchorFill: '#ffffff',
        anchorSize: 8,
        visible: false
      })

      // 直接返回节点和变换器，不使用Group
      return [imageNode, tr]
    }
  }



  return layer
}

export const domTextLayer = await createDOMTextLayer() 