import { ref } from '../../../../static/vue.esm-browser.js'

export function useAwareness() {
  const cursors = ref(new Map())
  const localSelection = ref({ start: 0, end: 0 })
  
  // 固定颜色列表
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
  ]
  
  const getUserColor = (clientId) => {
    const index = Math.abs(String(clientId).split('')
      .reduce((acc, char) => char.charCodeAt(0) + acc, 0)) % colors.length
    return colors[index]
  }

  // 简化的选区更新函数
  const updateLocalSelection = (selection) => {
    if (!selection) return
    
    // 兼容不同的选区格式
    const start = selection.start !== undefined ? selection.start : selection.anchor
    const end = selection.end !== undefined ? selection.end : selection.head
    
    localSelection.value = { start, end }
  }

  // 简化的awareness处理函数
  const setupAwarenessHandlers = (awareness) => {
    // 仅返回一个空的清理函数，保持API兼容性
    return () => {}
  }

  return {
    cursors,
    localSelection,
    updateLocalSelection,
    setupAwarenessHandlers,
    getUserColor
  }
} 