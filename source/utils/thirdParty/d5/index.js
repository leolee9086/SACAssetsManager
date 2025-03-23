import { addFileToZip } from '../../../../src/toolBox/useAge/forFileManage/forZipLike/useJsZip.js'
export async function 修改d5a缩略图(d5aFilePath, thumbnailPath, callbacks = {}) {
    const fs = require('fs')
    if (d5aFilePath.endsWith('.d5a') && fs.existsSync(thumbnailPath)) {
        try {
            await addFileToZip(d5aFilePath, thumbnailPath, 'icon.jpg')
            const successMsg = `成功将缩略图${thumbnailPath}写入 ${d5aFilePath}`
            if (callbacks.onSuccess) {
                await callbacks.onSuccess(successMsg)
            }
            return true
        } catch (error) {
            const errorMsg = `写入缩略图到 ${d5aFilePath} 失败: ${error}`
            console.error(errorMsg)
            if (callbacks.onError) {
                await callbacks.onError(errorMsg)
            }
            return false
        }
    }
    return false
}
// 提取共用的文件处理逻辑
/**
 * 用于根据D5a文件路径获取缩略图路径
 * 一般网上下载的D5a文件，缩略图路径为：.cache/icon.jpg
 * 这是因为它们一般是从D5的本地素材库中直接复制出来的,默认的文件结构就是这样
 * @param {*} assetPath 
 * @returns 
 */
export const 获取常规D5a缩略图路径 = (assetPath) => {
  //守卫
  const path = require('path')
  const dirname = path.dirname(assetPath)
  const cachePath = path.join(dirname, '.cache', path.basename(assetPath))
  return path.join(cachePath, 'icon.jpg')
}
/**
 * 从D5A数据中提取缩略图
 * @param {Buffer} d5aData D5A文件的二进制数据
 * @returns {Promise<Buffer|null>} 缩略图数据，失败返回null
 */
export const 从D5A数据中提取缩略图 = async (d5aData) => {
  const JSZip = require('jszip')
  
  try {
    // 使用JSZip加载压缩包
    const zip = await JSZip.loadAsync(d5aData)
    
    // 检查是否存在icon.jpg
    if (!zip.files['icon.jpg']) {
      return null
    }
    
    // 获取缩略图数据
    return await zip.files['icon.jpg'].async('nodebuffer')
  } catch (error) {
    console.error('从D5A数据提取缩略图失败:', error)
    return null
  }
}
/**
 * 用于从D5A文件中解压出缩略图
 * @param {string} d5aFilePath D5A文件路径
 * @param {string} [输出路径=null] 可选的输出路径，不提供则返回缩略图数据
 * @returns {Promise<Buffer|string|null>} 如果提供输出路径则返回输出路径，否则返回缩略图数据，失败返回null
 */
export const 从D5A文件中解压缩略图 = async (d5aFilePath, 输出路径 = null) => {
  const fs = require('fs')
  // 检查文件是否存在
  if (!fs.existsSync(d5aFilePath)) {
    console.error(`D5A文件不存在: ${d5aFilePath}`)
    return null
  }
  try {
    // 读取D5A文件
    const d5aData = fs.readFileSync(d5aFilePath)
    // 提取缩略图数据
    const iconData = await 从D5A数据中提取缩略图(d5aData)
    if (!iconData) {
      console.warn(`D5A文件中不包含缩略图: ${d5aFilePath}`)
      return null
    }
    // 如果提供了输出路径，则将缩略图保存到文件
    if (输出路径) {
      return await 保存数据到文件(iconData, 输出路径)
    }
    // 否则返回缩略图数据
    return iconData
  } catch (error) {
    console.error(`从D5A文件解压缩略图失败: ${d5aFilePath}`, error)
    return null
  }
}
/**
 * 将数据保存到文件
 * @param {Buffer} 数据 要保存的数据
 * @param {string} 文件路径 保存的目标路径
 * @returns {Promise<string|null>} 成功返回文件路径，失败返回null
 */
const 保存数据到文件 = async (数据, 文件路径) => {
  const fs = require('fs')
  const path = require('path')
  try {
    // 确保输出目录存在
    const 输出目录 = path.dirname(文件路径)
    if (!fs.existsSync(输出目录)) {
      fs.mkdirSync(输出目录, { recursive: true })
    }
    // 写入文件
    fs.writeFileSync(文件路径, 数据)
    return 文件路径
  } catch (error) {
    console.error(`保存数据到文件失败: ${文件路径}`, error)
    return null
  }
}

/**
 * 处理单个D5A文件缩略图
 * @param {Object} options 选项对象
 * @param {Object} options.asset 资源对象
 * @param {string} options.asset.path 资源路径
 * @param {boolean} options.跳过确认 是否跳过确认
 * @param {Object} options.回调函数 回调函数集合
 * @returns {Promise<Object>} 处理结果
 */
export const 处理单个D5A文件缩略图 = async (options = {}) => {
  const fs = require('fs')
  const { asset, 跳过确认 = false, 回调函数 = {} } = options
  
  if (!asset || !asset.path.endsWith('.d5a')) return { success: false, 已处理: false }
  
  const iconPath = 获取常规D5a缩略图路径(asset.path)
  if (!fs.existsSync(iconPath)) return { success: false, 已处理: false }

  if (!跳过确认) {
    // 这里返回待确认信息，由UI层处理确认逻辑
    return { 
      success: false, 
      已处理: false, 
      需要确认: true, 
      d5a路径: asset.path,
      缩略图路径: iconPath 
    }
  }

  return await 执行缩略图写入(asset.path, iconPath, 回调函数)
}

/**
 * 执行D5A缩略图写入
 * @param {string} 文件路径 D5A文件路径
 * @param {string} 图标路径 缩略图路径
 * @param {Object} 回调函数 回调函数集合
 * @returns {Promise<Object>} 处理结果
 */
export const 执行缩略图写入 = async (文件路径, 图标路径, 回调函数 = {}) => {
  try {
    const success = await 修改d5a缩略图(文件路径, 图标路径, 回调函数)
    return { success, 已处理: true }
  } catch (error) {
    if (回调函数.onError) {
      await 回调函数.onError(`写入缩略图到 ${文件路径} 失败:${error}`)
    }
    console.error(`写入缩略图到 ${文件路径} 失败:`, error)
    return { success: false, 已处理: true }
  }
}

/**
 * 批量处理D5A文件缩略图
 * @param {Object} options 选项对象
 * @param {Array} options.d5a文件列表 D5A文件列表
 * @param {boolean} options.跳过单个确认 是否跳过单个确认
 * @param {Object} options.缩略图回调函数 缩略图处理回调函数
 * @returns {Promise<Array>} 处理结果列表
 */
export const 批量处理D5A文件缩略图数据 = async (options = {}) => {
  const { 
    d5a文件列表 = [], 
    跳过单个确认 = false,
    缩略图回调函数 = {}
  } = options
  
  if (!d5a文件列表.length) return []
  
  const 处理结果 = []
  
  // 并行处理所有文件
  for (const asset of d5a文件列表) {
    // 处理文件
    const 结果 = await 处理单个D5A文件缩略图({ 
      asset, 
      跳过确认: 跳过单个确认,
      回调函数: 缩略图回调函数 
    })
    处理结果.push(结果)
  }
  
  return 处理结果
}