/**
 * @fileoverview 思源笔记 WebSocket 连接管理器
 * 
 * 该模块负责与思源笔记建立和管理 WebSocket 连接，
 * 用于实现思源笔记内的实时数据同步
 * 
 * @module siyuanManager
 */

// 思源 WebSocket 相关默认配置
export const defaultConfig = {
  enabled: false,
  port: 6806,
  channel: 'sync',
  token: 'xqatmtk3jfpchiah',
  host: '127.0.0.1',
  autoReconnect: true
}

// 当前配置
export const config = { ...defaultConfig }

/**
 * 更新思源配置
 * @param {Object} newConfig - 新的配置选项
 * @returns {Object} 更新后的配置
 */
export function updateConfig(newConfig = {}) {
  Object.assign(config, newConfig)
  return { ...config }
}

// 思源 WebSocket 连接管理器
const connections = new Map() // roomName -> { socket, status }

/**
 * 连接到思源 WebSocket
 * @param {string} roomName - 房间名称
 * @param {Object} options - 连接选项
 * @returns {Promise<WebSocket|null>} WebSocket 连接或 null
 */
export async function connect(roomName, options = {}) {
  const {
    port = config.port,
    channel = config.channel,
    token = config.token,
    host = config.host
  } = options

  try {
    const socket = new WebSocket(
      `ws://${host}:${port}/ws/broadcast?channel=${channel}_${roomName}&token=${token}`
    )
    
    return new Promise((resolve, reject) => {
      socket.onopen = () => {
        connections.set(roomName, {
          socket,
          status: 'connected'
        })
        console.log(`[思源同步] 房间 ${roomName} WebSocket 连接成功`)
        resolve(socket)
      }

      socket.onerror = (error) => {
        console.error(`[思源同步] 房间 ${roomName} WebSocket 连接失败:`, error)
        connections.delete(roomName)
        reject(error)
      }

      socket.onclose = () => {
        console.log(`[思源同步] 房间 ${roomName} WebSocket 连接关闭`)
        connections.delete(roomName)
        if (config.autoReconnect) {
          setTimeout(() => {
            connect(roomName, options)
          }, 1000)
        }
      }
    })
  } catch (error) {
    console.error(`[思源同步] 创建 WebSocket 连接失败:`, error)
    return null
  }
}

/**
 * 断开指定房间的思源 WebSocket 连接
 * @param {string} roomName - 房间名称
 */
export function disconnect(roomName) {
  const conn = connections.get(roomName)
  if (conn?.socket) {
    conn.socket.close()
    connections.delete(roomName)
  }
}

/**
 * 获取指定房间的连接状态
 * @param {string} roomName - 房间名称
 * @returns {Object|null} 连接状态或 null
 */
export function getConnectionStatus(roomName) {
  return connections.get(roomName) || null
}

/**
 * 获取所有活跃连接
 * @returns {Map} 房间名到连接的映射
 */
export function getAllConnections() {
  return new Map(connections)
}

/**
 * 发送数据到指定房间
 * @param {string} roomName - 房间名称
 * @param {Object} data - 要发送的数据
 * @returns {boolean} 是否成功发送
 */
export function sendData(roomName, data) {
  const conn = connections.get(roomName)
  if (!conn?.socket) return false
  
  try {
    conn.socket.send(JSON.stringify(data))
    return true
  } catch (error) {
    console.warn(`[思源同步] 向房间 ${roomName} 发送数据失败:`, error)
    return false
  }
}

// 导出完整接口
export default {
  config,
  connect,
  disconnect,
  updateConfig,
  getConnectionStatus,
  getAllConnections,
  sendData,
  connections
} 