
/**
 * 对比两个房间的文档状态
 * @param {string} roomName1 第一个房间名称
 * @param {string} roomName2 第二个房间名称
 * @returns {Object} 对比结果
 */
export function compareRoomDocuments(roomName1, roomName2) {
    const connection1 = roomConnections.get(roomName1)
    const connection2 = roomConnections.get(roomName2)
    
    if (!connection1 || !connection2) {
      return {
        status: 'error',
        message: '找不到指定的房间连接'
      }
    }
    
    try {
      const store1 = connection1.store
      const store2 = connection2.store
      
      // 检查存储对象的键是否一致
      const keys1 = Object.keys(store1)
      const keys2 = Object.keys(store2)
      const allKeys = [...new Set([...keys1, ...keys2])]
      
      const comparison = {}
      let inSync = true
      
      // 对比每个键的值
      for (const key of allKeys) {
        const value1 = JSON.stringify(store1[key])
        const value2 = JSON.stringify(store2[key])
        const keyInSync = value1 === value2
        
        comparison[key] = {
          inSync: keyInSync,
          // 只在不同步时提供值信息
          values: keyInSync ? undefined : {
            [roomName1]: store1[key],
            [roomName2]: store2[key]
          }
        }
        
        if (!keyInSync) inSync = false
      }
      
      return {
        status: 'success',
        inSync,
        details: comparison
      }
    } catch (e) {
      console.error(`对比房间文档时出错:`, e)
      return {
        status: 'error',
        error: e.message,
        message: `对比房间文档时出错: ${e.message}`
      }
    }
  }