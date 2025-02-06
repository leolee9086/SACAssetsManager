// 消息类型验证器
export const 验证消息类型 = (类型) => {
  const 有效类型 = [
    'ai', 'user', 'system', 'vote', 
    'error', 'consensus', 'sse_stream',
    'default', 'warning', 'info'
  ]
  return 有效类型.includes(类型)
}

// 状态类型验证器
export const 验证状态类型 = (状态) => {
  const 有效状态 = [
    'default', 'success', 'error', 
    'loading', 'pending', 'warning'
  ]
  return 有效状态.includes(状态)
}

// 对齐方式验证器
export const 验证对齐方式 = (对齐) => {
  const 有效对齐 = ['left', 'right', 'center']
  return 有效对齐.includes(对齐)
}

// 流式消息验证
export const 是否为流式消息 = (消息) => {
  return 消息?.type === 'sse_stream' && 消息?.status === 'loading'
}

// 消息状态转换检查
export const 检查状态转换 = (新状态, 旧状态, 消息内容) => {
  return 新状态 !== 'loading' && 旧状态 === 'loading' && 消息内容
}

// 获取消息样式类
export const 获取消息样式类 = ({类型, 有操作插槽, 可交互, 对齐方式}) => {
  return {
    [`type-${类型}`]: true,
    'has-actions': 有操作插槽,
    'interactive': 可交互,
    [`align-${对齐方式}`]: true
  }
}

// 获取状态图标
export const 获取状态图标 = (状态) => {
  const 状态图标映射 = {
    'loading': '⌛',
    'success': '✓',
    'error': '✕',
    'default': '',
    'pending': '⋯',
    'warning': '⚠'
  }
  return 状态图标映射[状态] || ''
} 