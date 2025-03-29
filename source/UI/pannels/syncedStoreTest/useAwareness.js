import { ref, computed } from '../../../../static/vue.esm-browser.js'

export function useAwareness() {
  const cursors = ref(new Map())
  const localSelection = ref({ start: 0, end: 0 })
  const awarenessRef = ref(null)
  
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

  // 改进的光标状态创建，支持更丰富的信息
  const createCursorState = (clientId, start = 0, end = 0, metadata = {}) => ({
    start,
    end,
    color: getUserColor(clientId),
    username: metadata.username || `用户-${String(clientId).slice(0, 5)}`,
    timestamp: metadata.timestamp || Date.now(),
    // 如果提供了坐标信息，则包含
    ...(metadata.coords && {
      left: metadata.coords.left,
      top: metadata.coords.top
    }),
    // 允许传递其他元数据
    ...metadata
  })

  // 增强的本地选择更新函数，支持额外元数据
  const updateLocalSelection = (start, end, awareness, metadata = {}) => {
    if (!awareness) return
    
    const safeStart = Number(start) || 0
    const safeEnd = Number(end) || safeStart
    
    try {
      const clientId = String(awareness.clientID)
      const state = createCursorState(clientId, safeStart, safeEnd, metadata)
      
      awareness.setLocalState({ cursor: state })
      localSelection.value = { start: safeStart, end: safeEnd }
    } catch (err) {
      console.error('更新本地选择失败:', err)
    }
  }

  // 增强的Awareness处理程序设置
  const setupAwarenessHandlers = (awareness) => {
    if (!awareness) return () => {}
    
    awarenessRef.value = awareness
    
    const handleChange = () => {
      try {
        const states = awareness.getStates()
        const newCursors = new Map()
        const localId = String(awareness.clientID)
        
        states.forEach((state, clientId) => {
          const id = String(clientId)
          if (id !== localId && state?.cursor) {
            // 保留光标的所有原始信息
            const cursorState = {
              ...state.cursor,
              id  // 确保id在光标状态中可用
            }
            
            newCursors.set(id, cursorState)
          }
        })
        
        cursors.value = newCursors
      } catch (err) {
        console.error('处理awareness变更失败:', err)
      }
    }

    awareness.on('change', handleChange)
    awareness.on('update', handleChange)

    // 初始化时立即触发一次
    handleChange()

    return () => {
      awareness.off('change', handleChange)
      awareness.off('update', handleChange)
      cursors.value = new Map()
      awarenessRef.value = null
    }
  }

  // 用于广播光标位置更新的辅助函数
  const broadcastCursorPosition = (start, end, coords, metadata = {}) => {
    if (!awarenessRef.value) return false
    
    updateLocalSelection(start, end, awarenessRef.value, {
      coords,
      timestamp: Date.now(),
      ...metadata
    })
    
    return true
  }

  return {
    cursors,
    localSelection,
    updateLocalSelection,
    setupAwarenessHandlers,
    getUserColor,
    broadcastCursorPosition
  }
} 