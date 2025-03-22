import { confirmAsPromise } from '../../../../../utils/siyuanUI/confirm.js'
import { kernelApi, plugin } from '../../../../../asyncModules.js'
import { 修改d5a缩略图, 获取常规D5a缩略图路径 } from '../../../../../utils/thirdParty/d5/index.js'
const { 翻译 } = plugin
const 处理单个D5A文件 = async (asset, 单次确认 = false, 预览图 = false) => {
  const fs = require('fs')
  if (!asset || !asset.path.endsWith('.d5a')) return { success: false, 已处理: false }
  const iconPath = 获取常规D5a缩略图路径(asset.path)
  if (!fs.existsSync(iconPath)) return { success: false, 已处理: false }

  if (!单次确认) {
    const 确认结果 = await 获取用户确认(iconPath, 预览图)
    if (!确认结果) return { success: false, 已处理: true }
  }

  return await 执行缩略图写入(asset.path, iconPath)
}

// 新增辅助函数，提高代码可读性
const 获取用户确认 = async (iconPath, 显示预览 = false) => {
  const fileUrl = `file://${iconPath.replace(/\\/g, '/')}`
  const 预览HTML = 显示预览 ? `<br><img src="${fileUrl}" alt="缩略图预览" style="max-width: 200px; max-height: 200px;">` : ''
  return await confirmAsPromise(
    翻译`确定修改?`,
    翻译`确认后将${iconPath}写入d5a文件中${预览HTML}`
  )
}

const 执行缩略图写入 = async (文件路径, 图标路径) => {
  try {
    const success = await 修改d5a缩略图(文件路径, 图标路径, {
      onSuccess: () => kernelApi.pushMsg({ 'msg': `成功将缩略图${图标路径}写入 ${文件路径}` }),
      onError: (error) => kernelApi.pushErrMsg({ 'msg': `写入缩略图到 ${文件路径} 失败:${error}` })
    })
    return { success, 已处理: true }
  } catch (error) {
    await kernelApi.pushErrMsg({ 'msg': `写入缩略图到 ${文件路径} 失败:${error}` })
    console.error(`写入缩略图到 ${文件路径} 失败:`, error)
    return { success: false, 已处理: true }
  }
}
const 批量处理D5a文件缩略图 = async (options = { 
  单次确认: false, 
  d5a文件列表: [], 
  处理完成回调: () => { } ,
  处理开始回调:()=>true,
  处理单个文件回调:()=>true
}) => {
  const { 单次确认, d5a文件列表, 处理完成回调, 处理开始回调, 单个文件完成回调, 单个文件开始回调 } = options
  const 内部处理完成回调 = (处理结果) => {
    try {
      if (处理完成回调) 处理完成回调(处理结果)
    } catch (error) {
      kernelApi.pushErrMsg({ 'msg': `处理完成回调失败:${error}` })
    }
  }
  console.log(单次确认, d5a文件列表)
  if (!d5a文件列表.length) return
  if (单次确认) {
    
    const 继续处理 = await confirmAsPromise(
      翻译`确定修改?`,
      翻译`确认后将尝试为${d5a文件列表.length}个d5a文件内置缩略图。此操作不可撤销，是否继续？`
    )
    if (!继续处理) return
    const 处理结果 = await Promise.all(
      d5a文件列表.map(asset => 处理单个D5A文件(asset, true))
    )
    await 内部处理完成回调(处理结果)
  } else {
    const 处理结果 = []
    for await (const asset of d5a文件列表) {
      const 结果 = await 处理单个D5A文件(asset, false, true)
      if (结果.已处理) 处理结果.push(结果)
    }
    if (处理结果.length > 0) {
      await 内部处理完成回调(处理结果)
    }
  }
}

// 提取公共逻辑
const 创建D5A菜单项 = (单次确认 = false) => (assets) => {
  const d5a文件列表 = assets.filter(item => item.path.endsWith('.d5a'))
  const d5aCount = d5a文件列表.length
  const 标签文本 = 单次确认
    ? 翻译`尝试寻找并内置缩略图(${d5aCount}个d5a文件，单次确认)`
    : 翻译`尝试寻找并内置缩略图(${d5aCount}个d5a文件)`
  const 处理开始回调 = 单次确认 ? () => confirmAsPromise(翻译`确定修改?`, 翻译`确认后将尝试为${d5aCount}个d5a文件内置缩略图。此操作不可撤销，是否继续？`) : () => true
  const 单个文件开始回调 = !单次确认 ? (asset) => confirmAsPromise(翻译`确定修改?`, 翻译`确认后将尝试为${asset.path}内置缩略图。此操作不可撤销，是否继续？`) : () => true
  const 单个文件完成回调 = !单次确认 ? (处理结果,上一个文件处理结果) => {
    const successCount = 处理结果.filter(r => r.success).length
    const failCount = 处理结果.filter(r => r.已处理 && !r.success).length
    confirmAsPromise(翻译`处理完成`, 翻译`处理完成！成功：${successCount}个，失败：${failCount}个。`)
  } : () => true
  return {
    label: 标签文本,
    click: async () => 批量处理D5a文件缩略图({ 单次确认, d5a文件列表, 处理完成回调: 显示处理结果统计 ,处理开始回调,单个文件开始回调,单个文件完成回调})
  }
}

const 显示处理结果统计 = async (处理结果) => {
  const successCount = 处理结果.filter(r => r.success).length
  const failCount = 处理结果.filter(r => r.已处理 && !r.success).length
  await confirmAsPromise(
    翻译`处理完成`,
    翻译`处理完成！成功：${successCount}个，失败：${failCount}个。`
  )
}

export const d5a内置缩略图 = 创建D5A菜单项(false)
export const d5a内置缩略图单次确认 = 创建D5A菜单项(true)

export const items = [
  d5a内置缩略图, d5a内置缩略图单次确认
]