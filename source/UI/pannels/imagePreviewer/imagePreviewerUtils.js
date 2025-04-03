// imagePreviewerUtils.js
import { uploadAsset } from '../../../fromThirdParty/siyuanKernel/asset.js'
import { drawRulers } from '../../../utils/canvas/helpers/rulers.js'
import { uploadToSiyuanAssets } from '../../../../src/toolBox/useAge/forSiyuan/forAsset/useSiyuanUpload.js'
const fs = require('fs')
const path = require("path")
export {drawRulers,uploadToSiyuanAssets as uploadToSiyuan}
// 处理字符串路径的图片
const handleStringPath = async (filePath) => {
  if (!filePath.startsWith('/assets/')) {
    try {
      const fileBlob = await fetch(filePath).then(r => r.blob())
      const fileObj = new File([fileBlob], 
        'image' + Date.now() + path.extname(filePath),
        { type: `image/${path.extname(filePath).slice(1)}` }
      )
      
      filePath = await uploadToSiyuanAssets(fileObj)
    } catch (error) {
      throw new Error('上传图片到思源失败: ' + error.message)
    }
  }
  return filePath
}

// 加载图片并获取尺寸
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'))
    }, 10000)

    img.onload = () => {
      clearTimeout(timeout)
      resolve({
        dataUrl: src,
        width: img.width,
        height: img.height
      })
    }

    img.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('图片加载失败'))
    }

    img.src = src
  })
}

// 处理File对象
const handleFileObject = async (file) => {
  const result = await uploadAsset(file)
  if (result.code !== 0) {
    throw new Error(result.msg)
  }
  return Object.values(result.data.succMap)[0]
}

// 主函数
export const loadImageFile = async (file) => {
  try {
    if (typeof file === 'string') {
      const processedPath = await handleStringPath(file)
      return await loadImage(processedPath)
    }
    
    // 处理File对象
    const uploadedPath = await handleFileObject(file)
    return await loadImage(uploadedPath)
    
  } catch (error) {
    throw error
  }
}

export const $loadImageFile = (file) => {
  return new Promise((resolve, reject) => {
    // 如果是字符串路径
    if (typeof file === 'string') {
      try {
        // 读取本地文件
        const data = fs.readFileSync(file)
        const base64Data = Buffer.from(data).toString('base64')
        const mimeType = `image/${path.extname(file).slice(1)}`
        const dataUrl = `data:${mimeType};base64,${base64Data}`
        
        const img = new Image()
        
        const timeout = setTimeout(() => {
          reject(new Error('图片加载超时'))
        }, 10000)

        img.onload = () => {
          clearTimeout(timeout)
          resolve({
            dataUrl,
            width: img.width,
            height: img.height
          })
        }

        img.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('图片加载失败'))
        }

        img.src = dataUrl
      } catch (error) {
        reject(new Error('文件读取失败: ' + error.message))
      }
      return
    }

    // 如果是File对象
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择有效的图片文件'))
      return
    }

    const reader = new FileReader()
    
    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'))
    }, 10000)

    reader.onload = (event) => {
      const img = new Image()
      
      img.onload = () => {
        clearTimeout(timeout)
        resolve({
          dataUrl: event.target.result,
          width: img.width,
          height: img.height
        })
      }

      img.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('图片加载失败'))
      }

      img.src = event.target.result
    }

    reader.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

// 计算瓦片尺寸
export const calculateTileSize = (realSize, uvScale, imageAspectRatio) => {
  const pixelsPerMeter = 100
  const baseSize = (realSize / uvScale) * pixelsPerMeter
  return {
    width: baseSize,
    height: baseSize / imageAspectRatio
  }
}
