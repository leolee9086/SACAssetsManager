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

  const createCursorState = (clientId, start = 0, end = 0) => ({
    start,
    end,
    color: '#FF6B6B',
    username: `用户-${String(clientId).slice(0, 5)}`,
    timestamp: Date.now()
  })

  const updateLocalSelection = (start, end, awareness) => {
    if (!awareness) return
    
    const safeStart = Number(start) || 0
    const safeEnd = Number(end) || safeStart
    
    try {
      const clientId = String(awareness.clientID)
      const state = createCursorState(clientId, safeStart, safeEnd)
      
      awareness.setLocalState({ cursor: state })
      localSelection.value = { start: safeStart, end: safeEnd }
    } catch (err) {
      console.error('Failed to update local selection:', err)
    }
  }

  const setupAwarenessHandlers = (awareness) => {
    if (!awareness) return () => {}
    
    const handleChange = () => {
      try {
        const states = awareness.getStates()
        const newCursors = new Map()
        const localId = String(awareness.clientID)
        
        states.forEach((state, clientId) => {
          const id = String(clientId)
          if (id !== localId && state?.cursor) {
            newCursors.set(id, createCursorState(
              id,
              state.cursor.start || 0,
              state.cursor.end || 0
            ))
          }
        })
        
        cursors.value = newCursors
      } catch (err) {
        console.error('Failed to handle awareness change:', err)
      }
    }

    awareness.on('change', handleChange)
    awareness.on('update', handleChange)

    return () => {
      awareness.off('change', handleChange)
      awareness.off('update', handleChange)
      cursors.value = new Map()
    }
  }

  return {
    cursors,
    localSelection,
    updateLocalSelection,
    setupAwarenessHandlers,
    getUserColor
  }
} 