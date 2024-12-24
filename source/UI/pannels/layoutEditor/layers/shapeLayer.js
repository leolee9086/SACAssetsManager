import Konva from '../../../../../static/konva.js'

const shapeConfigs = {
  rect: {
    name: '矩形',
    icon: '⬜',
    defaultConfig: {
      width: 200,
      height: 100,
      color: '#f0f0f0'
    }
  },
  circle: {
    name: '圆形',
    icon: '⭕',
    defaultConfig: {
      radius: 100,
      color: '#f0f0f0'
    }
  },
  ellipse: {
    name: '椭圆',
    icon: '⭕',
    defaultConfig: {
      radiusX: 100,
      radiusY: 50,
      color: '#f0f0f0'
    }
  },
}

const createShape = (type, config) => {
  const shapes = {
    rect: () => new Konva.Rect({
      x: (config.x || 0),
      y: (config.y || 0),
      width: config.width || 200,
      height: config.height || 100,
      fill: config.color || '#f0f0f0',
      draggable: !config.locked,
    }),
    circle: () => new Konva.Circle({
      x: (config.x || 0),
      y: (config.y || 0),
      radius: config.radius || 100,
      fill: config.color || '#f0f0f0',
      draggable: !config.locked,
    }),
    ellipse: () => new Konva.Ellipse({
      x: (config.x || 0),
      y: (config.y || 0),
      radiusX: config.radiusX || 100,
      radiusY: config.radiusY || 50,
      fill: config.color || '#f0f0f0',
      draggable: !config.locked,
    })
  }
  return shapes[type]()
}

export const shapeLayer = {
  name: '形状',
  icon: '⬜',
  group: 'shape',
  configs: shapeConfigs,
  defaultConfig: {
    ...shapeConfigs.rect.defaultConfig,
    type: 'rect'
  },
  adjustments: [
    {
      key: 'type',
      type: 'select',
      label: '形状类型',
      component: 'Selecter',
      options: [
        { value: 'rect', label: '矩形' },
        { value: 'circle', label: '圆形' },
        { value: 'ellipse', label: '椭圆' }
      ]
    },
    {
      key: 'color',
      type: 'color',
      label: '填充颜色',
      component: 'ColorPicker'
    },
    {
      key: 'width',
      type: 'number',
      label: '宽度',
      component: 'NumberInput',
      min: 1,
      max: 1000,
      showIf: config => config.type === 'rect'
    },
    {
      key: 'height',
      type: 'number',
      label: '高度',
      component: 'NumberInput',
      min: 1,
      max: 1000,
      showIf: config => config.type === 'rect'
    },
    {
      key: 'radius',
      type: 'number',
      label: '半径',
      component: 'NumberInput',
      min: 1,
      max: 500,
      showIf: config => config.type === 'circle'
    },
    {
      key: 'radiusX',
      type: 'number',
      label: '水平半径',
      component: 'NumberInput',
      min: 1,
      max: 500,
      showIf: config => config.type === 'ellipse'
    },
    {
      key: 'radiusY',
      type: 'number',
      label: '垂直半径',
      component: 'NumberInput',
      min: 1,
      max: 500,
      showIf: config => config.type === 'ellipse'
    }
  ],
  render: (config, layerId, stage) => {
    const shape = createShape(config.type || 'rect', config)

    shape.on('dragend', () => {
      config.x = shape.x()
      config.y = shape.y()
    })

    return shape
  }
} 