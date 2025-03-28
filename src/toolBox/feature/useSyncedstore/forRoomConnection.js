
/**
 * 检查房间连接状态并自动修复
 * @param {string} roomName 房间名称
 * @returns {Object} 连接状态和修复结果
 */
export async function checkAndFixRoomConnection(roomName) {
  const connection = roomConnections.get(roomName)
  if (!connection) {
    return {
      status: 'not_found',
      message: `找不到房间 ${roomName} 的连接`
    }
  }

  try {
    // 获取诊断信息
    const diagnostics = await connection.getDiagnostics()

    // 检查是否真正连接
    const actuallyConnected = connection.provider && connection.provider.connected
    const statusMismatch = connection.isConnected.value !== actuallyConnected

    // 如果状态不匹配，修复状态
    if (statusMismatch) {
      connection.isConnected.value = actuallyConnected
      connection.status.value = actuallyConnected ? '已连接' : '连接断开'
      console.log(`修复房间 ${roomName} 连接状态不一致问题`)
    }

    // 如果未连接，尝试重新连接
    if (!actuallyConnected) {
      console.log(`房间 ${roomName} 未连接，尝试自动重新连接`)
      connection.connect()

      // 等待连接尝试
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 再次检查连接
      const nowConnected = connection.provider && connection.provider.connected

      return {
        status: nowConnected ? 'fixed' : 'attempted_fix',
        previousState: {
          connected: actuallyConnected,
          statusMismatch
        },
        currentState: {
          connected: nowConnected
        },
        diagnostics
      }
    }

    return {
      status: 'healthy',
      connected: true,
      diagnostics
    }
  } catch (e) {
    console.error(`检查房间 ${roomName} 连接时出错:`, e)
    return {
      status: 'error',
      error: e.message,
      message: `检查房间连接时出错: ${e.message}`
    }
  }
}

/**
 * 重置所有连接和缓存
 */
export function resetAllConnections(roomConnections) {
  // 断开所有连接并清理
  for (const connection of roomConnections.values()) {
    if (connection && typeof connection.disconnect === 'function') {
      try {
        connection.disconnect()
      } catch (e) {
        console.error('断开连接时出错:', e)
      }
    }

    // 清理任何重连计时器
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer)
    }
  }

  // 清空缓存
  roomConnections.clear()
  roomDocs.clear()

  console.log('已重置所有连接和文档缓存')
}

export function resetRoomConnectionWithContext( context = {}) {
  const { roomConnections, roomName,roomDocs } = context
  const existingConnection = roomConnections.get(roomName)
  if (existingConnection) {
    try {
      existingConnection.disconnect()

      // 清理重连计时器
      if (existingConnection.reconnectTimer) {
        clearTimeout(existingConnection.reconnectTimer)
      }
    } catch (e) {
      console.error(`断开房间 ${roomName} 连接时出错:`, e)
    }

    // 从连接缓存中移除
    roomConnections.delete(roomName)
  }

  // 移除文档缓存
  if (roomDocs.has(roomName)) {
    roomDocs.delete(roomName)
    console.log(`已删除房间 ${roomName} 的文档缓存`)
  }

  return true

}
