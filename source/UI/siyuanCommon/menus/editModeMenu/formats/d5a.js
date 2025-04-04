import { confirmAsPromise } from '../../../../../../src/utils/siyuanUI/confirm.js'
import { kernelApi, plugin } from '../../../../../asyncModules.js'
import {
  处理单个D5A文件缩略图,
  执行缩略图写入,
  批量处理D5A文件缩略图数据,
} from '../../../../../../src/utils/thirdParty/d5/index.js'
const { 翻译 } = plugin

// 新增辅助函数，提高代码可读性
const 获取用户确认 = async (iconPath, 显示预览 = false) => {
  const fileUrl = `file://${iconPath.replace(/\\/g, '/')}`
  const 预览HTML = 显示预览 ? `<br><img src="${fileUrl}" alt="缩略图预览" style="max-width: 200px; max-height: 200px;">` : ''
  return await confirmAsPromise(
    翻译`确定修改?`,
    翻译`确认后将${iconPath}写入d5a文件中${预览HTML}`
  )
}

// UI层处理单个D5A文件
const UI处理单个D5A文件缩略图 = async (options = {}) => {
  const {
    asset,
    单次确认 = false,
    预览图 = false,
    回调函数 = {}
  } = options

  // 使用数据层函数获取初步处理结果
  const 初步结果 = await 处理单个D5A文件缩略图({
    asset,
    跳过确认: 单次确认,
    回调函数: 创建UI回调函数()
  })

  // 如果不需要处理或已经处理完成，直接返回结果
  if (!初步结果.需要确认) return 初步结果

  // 需要用户确认
  const 确认结果 = await 获取用户确认(初步结果.缩略图路径, 预览图)
  if (!确认结果) return { success: false, 已处理: true }

  // 用户确认后执行写入
  return await 执行缩略图写入(
    初步结果.d5a路径,
    初步结果.缩略图路径,
    创建UI回调函数()
  )
}

// 创建UI回调函数
const 创建UI回调函数 = () => ({
  onSuccess: (msg) => kernelApi.pushMsg({ 'msg': msg }),
  onError: (error) => kernelApi.pushErrMsg({ 'msg': error })
})

// UI层批量处理
const UI批量处理D5a文件缩略图 = async (options = {
  单次确认: false,
  d5a文件列表: [],
  处理完成回调: () => { },
  处理开始回调: () => true,
  单个文件开始回调: () => true,
  单个文件完成回调: () => true
}) => {
  const {
    单次确认,
    d5a文件列表,
    处理完成回调,
    处理开始回调,
    单个文件完成回调,
    单个文件开始回调
  } = options

  if (!d5a文件列表.length) return

  // 执行处理开始回调
  const 继续处理 = await 处理开始回调(d5a文件列表)
  if (!继续处理) return

  const 处理结果 = []

  if (单次确认) {
    // 单次确认模式：统一进行确认后批量处理
    const 用户确认 = await confirmAsPromise(
      翻译`确定修改?`,
      翻译`确认后将尝试为${d5a文件列表.length}个d5a文件内置缩略图。此操作不可撤销，是否继续？`
    )

    if (!用户确认) return

    // 使用数据层的批量处理函数
    const 批量结果 = await 批量处理D5A文件缩略图数据({
      d5a文件列表,
      跳过单个确认: true,
      缩略图回调函数: 创建UI回调函数()
    })

    for (let i = 0; i < 批量结果.length; i++) {
      const 结果 = 批量结果[i]
      const asset = d5a文件列表[i]

      处理结果.push(结果)
      await 单个文件完成回调(结果, 处理结果, asset)
    }
  } else {
    // 逐个确认模式：每个文件分别确认并处理
    for (const asset of d5a文件列表) {
      // 执行单个文件开始回调
      if (!(await 单个文件开始回调(asset, d5a文件列表))) continue

      // 处理文件并带预览
      const 结果 = await UI处理单个D5A文件缩略图({
        asset,
        单次确认: false,
        预览图: true,
        回调函数: 创建UI回调函数()
      })

      if (结果.已处理) 处理结果.push(结果)

      // 执行单个文件完成回调
      await 单个文件完成回调(结果, 处理结果, asset)
    }
  }

  // 执行处理完成回调
  if (处理结果.length > 0) {
    try {
      await 处理完成回调(处理结果, d5a文件列表)
    } catch (error) {
      kernelApi.pushErrMsg({ 'msg': `处理完成回调失败:${error}` })
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

  // 定义回调函数
  const 处理开始回调 = () => true
  const 单个文件开始回调 = !单次确认
    ? (asset) => confirmAsPromise(
      翻译`确定修改?`,
      翻译`确认后将尝试为${asset.path}内置缩略图。此操作不可撤销，是否继续？`
    )
    : () => true

  const 单个文件完成回调 = () => true

  return {
    label: 标签文本,
    click: async () => UI批量处理D5a文件缩略图({
      单次确认,
      d5a文件列表,
      处理完成回调: 显示处理结果统计并请求确认,
      处理开始回调,
      单个文件开始回调,
      单个文件完成回调
    })
  }
}
/**
 * 
 * @param {*} 处理结果 
 */
const 显示处理结果统计并请求确认 = async (处理结果 = []) => {
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