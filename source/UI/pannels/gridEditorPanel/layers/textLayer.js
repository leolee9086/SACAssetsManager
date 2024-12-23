import Konva from '../../../../../static/konva.js'
import { getSysFonts } from '../../../../fromThirdParty/siyuanKernel/system.js'

const createTextLayer = async () => {
  const layer = {
    name: '文本',
    icon: '📝',
    group: 'text',
    presets: [],
    defaultConfig: {
      text: '新建文本',
      size: 24,
      color: '#333333',
      fontFamily: 'Arial',
      fontStyle: 'normal',
      align: 'left',
      lineHeight: 1.2,
      padding: 0,
      opacity: 1,
      letterSpacing: 0
    },
    adjustments: [
      {
        key: 'text',
        type: 'text',
        label: '文本内容',
        component: 'TextInput'
      },
      {
        key: 'size',
        type: 'number',
        label: '字体大小',
        component: 'NumberInput',
        min: 1,
        max: 200
      },
      {
        key: 'color',
        type: 'color',
        label: '文字颜色',
        component: 'ColorPicker'
      },
      {
        key: 'fontFamily',
        type: 'select',
        label: '字体',
        component: 'Selecter',
        options: [
          { value: 'Arial', label: 'Arial' },
          { value: 'sans-serif', label: 'Sans-serif' }
        ]
      },
      {
        key: 'fontStyle',
        type: 'select',
        label: '字体样式',
        component: 'Selecter',
        options: [
          { value: 'normal', label: '常规' },
          { value: 'bold', label: '粗体' },
          { value: 'italic', label: '斜体' }
        ]
      },
      {
        key: 'align',
        type: 'select',
        label: '对齐方式',
        component: 'Selecter',
        options: [
          { value: 'left', label: '左对齐' },
          { value: 'center', label: '居中' },
          { value: 'right', label: '右对齐' }
        ]
      },
      {
        key: 'lineHeight',
        type: 'number',
        label: '行高',
        component: 'NumberInput',
        min: 0.5,
        max: 3,
        step: 0.1
      },
      {
        key: 'padding',
        type: 'number',
        label: '内边距',
        component: 'NumberInput',
        min: 0,
        max: 100
      },
      {
        key: 'opacity',
        type: 'number',
        label: '不透明度',
        component: 'Slider',
        min: 0,
        max: 1,
        step: 0.1
      },
      {
        key: 'letterSpacing',
        type: 'number',
        label: '字间距',
        component: 'NumberInput',
        min: -20,
        max: 100
      }
    ],
    render: (config, layerId, stage, handleShapeClick) => {
      const textNode = new Konva.Text({
        x:  (config.x || 0),
        y: (config.y || 0),
        text: config.text || '示例文本',
        fontSize: config.size || 24,
        fill: config.color || '#000000',
        draggable: !config.locked,
        fontFamily: config.fontFamily || 'Arial',
        fontStyle: config.fontStyle || 'normal',
        align: config.align || 'left',
        lineHeight: config.lineHeight || 1.2,
        padding: config.padding || 0,
        opacity: config.opacity || 1,
        letterSpacing: config.letterSpacing || 0
      })
      const tr = new Konva.Transformer({
        nodes: [textNode],
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
        keepRatio: false,
        padding: 5,
        borderStroke: '#0099ff',
        borderStrokeWidth: 1,
        anchorStroke: '#0099ff',
        anchorFill: '#ffffff',
        anchorSize: 8,
        visible: false,
      })
      return [textNode, tr]
    }
  }

  try {
    const response = await getSysFonts()
    if (response.code === 0 && Array.isArray(response.data)) {
      const fontFamilyAdjustment = layer.adjustments.find(adj => adj.key === 'fontFamily')
      if (fontFamilyAdjustment) {
        fontFamilyAdjustment.options = response.data.map(font => ({
          value: font,
          label: font
        }))
      }

      layer.presets = response.data.map(font => ({
        name: `${font} 示例`,
        icon: '📝',
        config: {
          ...layer.defaultConfig,
          text: '示例文本',
          fontFamily: font
        }
      }))
    }
  } catch (err) {
    console.error('获取系统字体失败:', err)
  }

  return layer
}

export const textLayer = await createTextLayer() 