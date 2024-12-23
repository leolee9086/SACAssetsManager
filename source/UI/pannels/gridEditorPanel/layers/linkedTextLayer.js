import Konva from '../../../../../static/konva.js'
import domtoimage from '../../../../../static/dom-to-image.mjs'

// 缓存系统
const contentCache = new Map()
const imageCache = new Map()

// 存储文本框之间的链接关系
const textBoxLinks = new Map()

class TextBoxManager {
  constructor() {
    this.boxes = new Map()
  }

  // 添加文本框
  addBox(id, config) {
    this.boxes.set(id, {
      ...config,
      linkedTo: null,
      linkedFrom: null,
      overflow: false
    })
  }

  // 链接两个文本框
  linkBoxes(sourceId, targetId) {
    if (!this.boxes.has(sourceId) || !this.boxes.has(targetId)) {
      throw new Error('文本框不存在')
    }

    // 检查目标框是否已被链接
    const targetBox = this.boxes.get(targetId)
    if (targetBox.linkedFrom) {
      throw new Error('目标文本框已被链接')
    }

    // 更新链接关系
    const sourceBox = this.boxes.get(sourceId)
    sourceBox.linkedTo = targetId
    targetBox.linkedFrom = sourceId

    // 返回需要更新的文本框ID
    return [sourceId, targetId]
  }

  // 解除链接
  unlinkBox(boxId) {
    const box = this.boxes.get(boxId)
    if (!box) return []

    const updateIds = []

    if (box.linkedTo) {
      const targetBox = this.boxes.get(box.linkedTo)
      if (targetBox) {
        targetBox.linkedFrom = null
        updateIds.push(box.linkedTo)
      }
      box.linkedTo = null
      updateIds.push(boxId)
    }

    if (box.linkedFrom) {
      const sourceBox = this.boxes.get(box.linkedFrom)
      if (sourceBox) {
        sourceBox.linkedTo = null
        updateIds.push(box.linkedFrom)
      }
      box.linkedFrom = null
      updateIds.push(boxId)
    }

    return updateIds
  }

  // 获取链接链中的所有文本框
  getLinkedChain(startId) {
    const chain = []
    let currentId = startId

    while (currentId && !chain.includes(currentId)) {
      chain.push(currentId)
      currentId = this.boxes.get(currentId)?.linkedTo
    }

    return chain
  }
}

// 创建全局文本框管理器实例
const textBoxManager = new TextBoxManager()

const createLinkedTextLayer = async () => {
  const layer = {
    name: '链接文本',
    icon: '📝',
    group: 'text',
    defaultConfig: {
      text: '这是一段测试文本，用于演示链接文本框的溢流效果。这段文本足够长，可以测试文本在框内的排版和溢流到下一个文本框的效果。当文本超出当前本框的范围时，将在右下角显示一个红色指示器，表示存在溢流内容。您可以通过链接另一个文本框来显示溢流的内容。',
      width: 200,
      height: 150,
      htmlContent: true,
      cssText: '',
      fontFamily: 'Arial',
      fontSize: 14,
      color: '#000000',
      lineHeight: 1.5,
      padding: 10,
      opacity: 1,
      linkedTo: null
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
      },
      {
        key: 'linkedTo',
        type: 'select',
        label: '链接到',
        component: 'Select',
        options: [],
        placeholder: '选择要链接的文本框'
      }
    ],

    getAvailableTargets: (currentId, stage) => {
      const targets = []
      stage.find('.linkedText').forEach(node => {
        const nodeId = node.id()
        if (node.name() === 'linkedText' && 
            nodeId !== currentId && 
            !textBoxManager.boxes.get(nodeId)?.linkedFrom) {
          targets.push({
            value: nodeId,
            label: `文本框 ${nodeId}`
          })
        }
      })
      return targets
    },

    render: async (config, layerId, stage, handleShapeClick) => {
      try {
        // 确保在使用前注册文本框
        if (!textBoxManager.boxes.has(layerId)) {
          textBoxManager.addBox(layerId, config)
        }

        // 获取并更新文本框配置，确保尺寸约束
        const box = textBoxManager.boxes.get(layerId)
        if (box) {
          // 确保尺寸不会小于最小值
          const width = Math.max(50, config.width)
          const height = Math.max(50, config.height)
          
          Object.assign(box, {
            ...config,
            width,
            height
          })
          
          // 更新传入的配置以保持一致性
          config.width = width
          config.height = height
        }

        // 生成缓存key
        const cacheKey = JSON.stringify({
          text: config.text,
          width: config.width,
          height: config.height,
          htmlContent: config.htmlContent,
          cssText: config.cssText,
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          color: config.color,
          lineHeight: config.lineHeight,
          padding: config.padding,
          opacity: config.opacity
        })

        // 检查是否存在现有节点并且配置未变化
        const existingNode = stage.findOne(`#${layerId}`)
        if (existingNode && existingNode.attrs.cacheKey === cacheKey) {
          const existingTr = stage.findOne(`#tr-${layerId}`)
          return [existingNode, existingTr]
        }

        // 检查内容缓存
        let dataUrl = contentCache.get(cacheKey)
        if (!dataUrl) {
          console.log(`⚡ 生成新内容: ${layerId}`)
          const container = document.createElement('div')
          
          // 先设置内容，以便正确计算尺寸
          container.innerHTML = config.htmlContent ? config.text : document.createTextNode(config.text).textContent
          
          // 设置样式
          container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: ${config.width}px;
            height: ${config.height}px;
            visibility: visible;
            pointer-events: none;
            z-index: -1;
            overflow: hidden;
            word-wrap: break-word;
            white-space: pre-wrap;
            font-family: ${config.fontFamily};
            font-size: ${config.fontSize}px;
            color: ${config.color};
            line-height: ${config.lineHeight};
            padding: ${config.padding}px;
            opacity: ${config.opacity};
            box-sizing: border-box;
            ${config.cssText}
          `

          document.body.appendChild(container)

          // 改进的溢流检测逻辑
          const checkOverflow = (element) => {
            const rect = element.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            const containerBottom = containerRect.top + containerRect.height - config.padding

            // 检查元素是否完全在容器内
            return rect.bottom > containerBottom
          }

          // 检测所有子元素的溢流
          let hasOverflow = false
          const children = container.children
          if (children.length > 0) {
            // 检查每个顶层子元素
            for (let i = 0; i < children.length; i++) {
              if (checkOverflow(children[i])) {
                hasOverflow = true
                break
              }
            }
          } else {
            // 如果没有子元素，检查容器本身
            hasOverflow = container.scrollHeight > (container.clientHeight - config.padding * 2)
          }

          // 更新溢流状态
          if (box) {
            box.overflow = hasOverflow
          }

          try {
            dataUrl = await domtoimage.toPng(container, {
              bgcolor: 'transparent',
              width: config.width,
              height: config.height
            })
            contentCache.set(cacheKey, dataUrl)
          } finally {
            document.body.removeChild(container)
          }
        }

        // 检查图像缓存
        let image = imageCache.get(dataUrl)
        if (!image) {
          console.log(`⚡ 加载新图像: ${layerId}`)
          image = new Image()
          await new Promise((resolve, reject) => {
            image.onload = resolve
            image.onerror = reject
            image.src = dataUrl
          })
          imageCache.set(dataUrl, image)
        }

        // 创建组来包含图像和溢流指示器
        const group = new Konva.Group({
          x: config.x || 0,
          y: config.y || 0,
          draggable: true,
          name: 'linkedText',
          id: `group-${layerId}`
        })

        // 创建图像节点
        const imageNode = new Konva.Image({
          width: config.width,
          height: config.height,
          image: image,
          name: layerId,
          id: layerId,
          cacheKey: cacheKey
        })

        // 添加图像到组
        group.add(imageNode)

        // 使用已存在的 box 变量检查溢流状态
        if (box && box.overflow) {
          const overflowIndicator = new Konva.Group({
            name: `overflow-${layerId}`,
            id: `overflow-${layerId}`
          })

          // 创建指示器背景
          const indicatorBg = new Konva.Circle({
            x: config.width - 10,
            y: config.height - 10,
            radius: 8,
            fill: box.linkedTo ? '#4CAF50' : 'white',
            stroke: box.linkedTo ? '#4CAF50' : 'red',
            strokeWidth: 2
          })

          // 创建指示器图标
          const indicatorIcon = new Konva.Text({
            x: config.width - 14,
            y: config.height - 14,
            text: box.linkedTo ? '→' : '↓',
            fontSize: 12,
            fill: box.linkedTo ? '#4CAF50' : 'red',
            align: 'center'
          })

          overflowIndicator.add(indicatorBg)
          overflowIndicator.add(indicatorIcon)
          group.add(overflowIndicator)

          // 添加点击事件处理
          overflowIndicator.on('click', (e) => {
            e.cancelBubble = true
            
            // 如果已经链接，显示链接信息
            if (box.linkedTo) {
              console.log('已链接到:', box.linkedTo)
              return
            }

            // 获取可用的目标文本框
            const targets = layer.getAvailableTargets(layerId, stage)
            if (targets.length === 0) {
              console.log('没有可用的目标文本框')
              return
            }

            // TODO: 显示选择目标的UI
            console.log('可链接的目标:', targets)
          })
        }

        // 添加变换事件处理
        group.on('transform', function() {
          const node = this
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()

          // 更新实际尺寸
          const newWidth = Math.max(50, Math.round(imageNode.width() * scaleX))
          const newHeight = Math.max(50, Math.round(imageNode.height() * scaleY))

          // 重置比例并设置新尺寸
          node.scaleX(1)
          node.scaleY(1)
          imageNode.width(newWidth)
          imageNode.height(newHeight)

          // 更新文本框配置
          const box = textBoxManager.boxes.get(layerId)
          if (box) {
            box.width = newWidth
            box.height = newHeight
          }

          // 触发重新渲染
          stage.batchDraw()
        })

        // 添加点击事件处理
        group.on('click', () => {
          if (handleShapeClick) {
            handleShapeClick(layerId)
          }
        })

        // 确保组已添加到舞台
        if (!stage.findOne(`#${group.id()}`)) {
          const layer = stage.findOne('Layer') || stage.add(new Konva.Layer())
          layer.add(group)
        }

        // 等待一帧确保节点已完全渲染
        await new Promise(resolve => requestAnimationFrame(resolve))

        // 创建变换器
        const tr = new Konva.Transformer({
          nodes: [group],
          id: `tr-${layerId}`,
          enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
          rotateEnabled: true,
          keepRatio: false,
          padding: 5,
          borderStroke: '#0099ff',
          visible: false,
          boundBoxFunc: (oldBox, newBox) => {
            return {
              ...newBox,
              width: Math.max(50, newBox.width),
              height: Math.max(50, newBox.height)
            }
          }
        })

        // 确保变换器已添加到舞台
        if (!stage.findOne(`#${tr.id()}`)) {
          const layer = stage.findOne('Layer')
          if (layer) {
            layer.add(tr)
            layer.batchDraw()
          }
        }

        // 再次等待一帧确保变换器已完全初始化
        await new Promise(resolve => requestAnimationFrame(resolve))

        return [group, tr]
      } catch (err) {
        console.error('渲染链接文本框失败:', err)
        return []
      }
    }
  }

  return layer
}

export const linkedTextLayer = await createLinkedTextLayer() 