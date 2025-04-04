import Konva from '../../../../../static/konva.js'
import { getSysFonts } from '../../../../fromThirdParty/siyuanKernel/system.js'
import { addScript } from '../../../../../src/utils/DOM/addScript.js'
import { convertDOMToImage } from '../../../../../src/utils/DOM/domToImage.js'
import { domTextPresets } from './presets/domTextPresets.js'

// 添加缓存存储
const contentCache = new Map()
const imageCache = new Map()

const createDOMTextLayer = async () => {
  const layer = {
    name: 'DOM文本',
    icon: '📄',
    group: 'text',
    presets: domTextPresets,
    defaultConfig: {
      text: '新建DOM文本',
      htmlContent: true,
      cssText: ''
    },
    adjustments: [
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
      try {
        // 为每个渐变生成唯一ID
        const uniqueId = 'gradient-' + Math.random().toString(36).substr(2, 9)
        let processedText = config.text
        if (config.text.includes('<linearGradient id="gradient"')) {
          processedText = config.text.replace('gradient"', uniqueId + '"')
            .replace('url(#gradient)', `url(#${uniqueId})`)
        }

        // 生成缓存key
        const cacheKey = JSON.stringify({
          text: processedText,
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

        // 检查是否存在现有节点
        const existingNode = stage.findOne(`#${layerId}`)
        if (existingNode && existingNode.attrs.cacheKey === cacheKey) {
          // 如果内容没有变化，直接返回现有节点及其变换器
          const existingTr = stage.findOne(`#tr-${layerId}`)
          return [existingNode, existingTr]
        }

        // 检查内容缓存
        let dataUrl = contentCache.get(cacheKey)
        if (!dataUrl) {
          console.log(`⚡ 生成新内容: ${layerId}`)
          dataUrl = await convertDOMToImage(processedText, config)
          
          // 更新缓存
          if (dataUrl) {
            contentCache.set(cacheKey, dataUrl)
            if (contentCache.size > 50) {
              const firstKey = contentCache.keys().next().value
              contentCache.delete(firstKey)
              console.log('🗑️ 清理旧内容缓存')
            }
          }
        } else {
          console.log(`✅ 命中内容缓存: ${layerId}`)
        }

        // 检查图像缓存
        let image = imageCache.get(dataUrl)
        if (image) {
          console.log(`✅ 命中图像缓存: ${layerId}`)
        } else {
          console.log(`⚡ 加载新图像: ${layerId}`)
          // 创建新的图像对象
          image = new Image()
          await new Promise((resolve, reject) => {
            image.onload = resolve
            image.onerror = (e) => reject(new Error('图片加载失败: ' + e))
            image.src = dataUrl
          })

          // 将图像存入缓存
          imageCache.set(dataUrl, image)
          
          // 限制缓存大小
          if (imageCache.size > 30) {
            const firstKey = imageCache.keys().next().value
            imageCache.delete(firstKey)
            console.log('🗑️ 清理旧图像缓存')
          }
        }

        // 确保图片尺寸有效
        if (!image.width || !image.height) {
          throw new Error('图片尺寸无效')
        }

        // 创建图像节点
        const imageNode = new Konva.Image({
          x: config.x || 0,
          y: config.y || 0,
          width: image.width,
          height: image.height,
          image: image,
          draggable: !config.locked,
          name: layerId,
          id: layerId,
          cacheKey: cacheKey  // 存储cacheKey用于后续比较
        })

        // 创建变换器
        const tr = new Konva.Transformer({
          nodes: [imageNode],
          id: `tr-${layerId}`,
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

        // 确保节点已准备好
        await new Promise(resolve => setTimeout(resolve, 0))

        return [imageNode, tr]
      } catch (err) {
        console.error('渲染文本图层失败:', err)
        return []
      }
    }
  }
  return layer
}

export const domTextLayer = await createDOMTextLayer() 