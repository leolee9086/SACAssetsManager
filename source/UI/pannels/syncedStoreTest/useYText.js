import { ref, onMounted, onUnmounted } from '../../../../static/vue.esm-browser.js'
import * as Y from '../../../../static/yjs.js'
import { getYjsValue } from '../../../../static/@syncedstore/core.js'

export function useYText(store, field = 'text') {
  const cursorPosition = ref(0)
  const activeUsers = ref([])
  const ytext = ref(null)

  // 获取或创建 Y.Text 实例
  const initYText = () => {
    if (!store || !store[field]) return null
    try {
      // 尝试获取现有的 Y.Text 实例
      return getYjsValue(store[field])
    } catch (e) {
      console.warn('字段不是 Y.Text 类型:', e)
      return null
    }
  }

  // 文本操作方法
  const textOps = {
    insert: (index, content) => {
      if (!ytext.value) return
      ytext.value.insert(index, content)
    },
    delete: (index, length) => {
      if (!ytext.value) return
      ytext.value.delete(index, length)
    },
    format: (index, length, format) => {
      if (!ytext.value) return
      // 可以添加富文本格式化
    }
  }

  // 光标位置更新
  const updateCursor = (pos, awareness) => {
    if (!awareness) return
    awareness.setLocalStateField('cursor', {
      index: pos,
      user: awareness.clientID
    })
  }

  // 监听其他用户的光标
  const setupAwareness = (awareness) => {
    if (!awareness) return

    const updateActiveUsers = () => {
      const states = Array.from(awareness.getStates().entries())
      activeUsers.value = states
        .map(([client, state]) => ({
          clientId: client,
          cursor: state.cursor
        }))
        .filter(user => user.cursor)
    }

    awareness.on('change', updateActiveUsers)
    return () => awareness.off('change', updateActiveUsers)
  }

  return {
    cursorPosition,
    activeUsers,
    textOps,
    updateCursor,
    setupAwareness,
    initYText: () => {
      ytext.value = initYText()
      return ytext.value
    }
  }
} 