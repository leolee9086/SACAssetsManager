// 无限画布的属性定义
export const canvasProps = {
  // 单位配置，例如 1单位 = 多少像素
  unitRatio: {
    type: Number,
    default: 1
  },
  // 初始缩放级别
  initialScale: {
    type: Number,
    default: 1
  },
  // 初始位置
  initialPosition: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  // 网格大小（单位）
  gridSize: {
    type: Number,
    default: 50
  },
  // 是否显示鼠标指示器
  showMouseIndicator: {
    type: Boolean,
    default: true
  },
  // 最大缩放级别 - 修改为接近JS数值上限
  maxScale: {
    type: Number,
    default: 1e15
  },
  // 最小缩放级别 - 修改为接近JS数值下限但保持正值
  minScale: {
    type: Number,
    default: 1e-15
  },
  // LOD配置
  lodThreshold: {
    type: Number,
    default: 1 // 元素小于这个像素值时隐藏
  },
  // 是否启用LOD
  enableLod: {
    type: Boolean,
    default: true
  },
  // 添加modelValue prop用于v-model绑定
  modelValue: {
    type: Array,
    default: () => []
  },
  // 允许的绘制元素类型
  allowedElementTypes: {
    type: Array,
    default: () => ['line', 'circle', 'rect', 'text', 'image', 'path']
  },
  // 最大LOD级别
  maxLodLevel: {
    type: Number,
    default: 5
  },
  // 最小LOD级别
  minLodLevel: {
    type: Number,
    default: 0
  },
  // 最大平移距离（从原点算起）
  maxPanDistance: {
    type: Number,
    default: Infinity // 默认无限制
  },
  // 是否启用平移约束
  constrainPan: {
    type: Boolean,
    default: false
  },
  // 自定义按钮配置
  customButtons: {
    type: Array,
    default: () => [],
    // 每个按钮对象的结构：
    // {
    //   id: string,          // 按钮唯一标识
    //   icon: string,        // 按钮图标类名
    //   title: string,       // 按钮提示文本
    //   onClick: Function,   // 点击回调函数
    //   active: boolean,     // 是否激活状态（可选）
    //   position: 'start' | 'end' // 按钮位置，开始或结束（可选，默认end）
    // }
  },
  // 是否使用对数缩放计算LOD级别
  useLodLog: {
    type: Boolean,
    default: false
  }
}; 