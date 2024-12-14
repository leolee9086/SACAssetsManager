// imagePreviewerUtils.js
import { uploadAsset } from '../../../fromThirdParty/siyuanKernel/asset.js'
const fs = require('fs')
const path = require("path")

// 绘制标尺的工具函数
export const drawRulers = (params) => {
  const {
    isRepeat,
    horizontalRulerRef,
    verticalRulerRef,
    containerRef,
    realSize,
    uvScale,
    imageAspectRatio
  } = params

  if (!isRepeat) return

  const pixelsPerMeter = 100

  // 绘制水平标尺
  const drawHorizontalRuler = () => {
    const hCtx = horizontalRulerRef.getContext('2d')
    const hCanvas = horizontalRulerRef
    hCanvas.width = containerRef.clientWidth
    hCanvas.height = 30
    
    // 填充背景
    hCtx.fillStyle = '#2c2c2c'
    hCtx.fillRect(0, 0, hCanvas.width, hCanvas.height)
    
    // 设置刻度样式
    hCtx.strokeStyle = '#fff'
    hCtx.fillStyle = '#fff'
    hCtx.font = '10px Arial'
    hCtx.textAlign = 'center'
    
    const totalWidth = containerRef.clientWidth / pixelsPerMeter
    for (let i = 0; i <= totalWidth; i += 0.5) {
      const x = i * pixelsPerMeter
      const height = i % 1 === 0 ? 15 : 10
      
      hCtx.beginPath()
      hCtx.moveTo(x, hCanvas.height)
      hCtx.lineTo(x, hCanvas.height - height)
      hCtx.stroke()
      
      if (i % 1 === 0) {
        hCtx.fillText(`${i}m`, x, hCanvas.height - 18)
      }
    }
  }

  // 绘制垂直标尺
  const drawVerticalRuler = () => {
    const vCtx = verticalRulerRef.getContext('2d')
    const vCanvas = verticalRulerRef
    vCanvas.width = 30
    vCanvas.height = containerRef.clientHeight
    
    // 填充背景
    vCtx.fillStyle = '#2c2c2c'
    vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height)
    
    // 设置刻度样式
    vCtx.strokeStyle = '#fff'
    vCtx.fillStyle = '#fff'
    vCtx.font = '10px Arial'
    vCtx.textAlign = 'right'
    
    const totalHeight = containerRef.clientHeight / pixelsPerMeter
    for (let i = 0; i <= totalHeight; i += 0.5) {
      const y = i * pixelsPerMeter
      const width = i % 1 === 0 ? 15 : 10
      
      vCtx.beginPath()
      vCtx.moveTo(vCanvas.width, y)
      vCtx.lineTo(vCanvas.width - width, y)
      vCtx.stroke()
      
      if (i % 1 === 0) {
        vCtx.save()
        vCtx.translate(vCanvas.width - 18, y)
        vCtx.rotate(-Math.PI / 2)
        vCtx.fillText(`${i}m`, 0, 0)
        vCtx.restore()
      }
    }
  }

  drawHorizontalRuler()
  drawVerticalRuler()
}

// 修改上传部分的代码
const uploadToSiyuan = async (file) => {
  try {
    // 确保文件对象正确命名和类型
    let uploadFile = file;
    if (!(file instanceof File)) {
      // 如果不是File对象，需要转换
      const blob = await fetch(file).then(r => r.blob());
      uploadFile = new File([blob], 
        `image${Date.now()}.png`,  // 使用固定的png扩展名
        { type: 'image/png' }
      );
    }

    // 直接使用文件对象调用uploadAsset
    const result = await uploadAsset(uploadFile);
    
    if (result.code !== 0) {
      throw new Error(result.msg);
    }
    return Object.values(result.data.succMap)[0];
  } catch (error) {
    throw new Error('上传图片到思源失败: ' + error.message);
  }
};

// 图片加载工具函数
export const loadImageFile = async (file) => {
    return new Promise(async (resolve, reject) => {
      // 如果是字符串路径
      if (typeof file === 'string') {
        // 检查路径是否在思源assets目录下
        if (!file.startsWith('/assets/')) {
          try {
            const fileBlob = await fetch(file).then(r => r.blob())
            const fileObj = new File([fileBlob], 
              'image' + Date.now() + path.extname(file),
              { type: `image/${path.extname(file).slice(1)}` }
            )
            
            const uploadedPath = await uploadToSiyuan(fileObj)
            file = uploadedPath
          } catch (error) {
            reject(new Error('上传图片到思源失败: ' + error.message))
            return
          }
        }
  
        const img = new Image()
        const timeout = setTimeout(() => {
          reject(new Error('图片加载超时'))
        }, 10000)
  
        img.onload = () => {
          clearTimeout(timeout)
          resolve({
            dataUrl: file,
            width: img.width,
            height: img.height
          })
        }
  
        img.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('图片加载失败'))
        }
  
        img.src = file
        return
      }
  
      // 如果是File对象,先上传到思源
      try {
        const result = await uploadAsset(file)
        if (result.code !== 0) {
          throw new Error(result.msg)
        }
  
        const uploadedPath = Object.values(result.data.succMap)[0]
        const img = new Image()
        
        const timeout = setTimeout(() => {
          reject(new Error('图片加载超时'))
        }, 10000)
  
        img.onload = () => {
          clearTimeout(timeout)
          resolve({
            dataUrl: uploadedPath,
            width: img.width,
            height: img.height
          })
        }
  
        img.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('图片加载失败'))
        }
  
        img.src = uploadedPath
      } catch (error) {
        reject(new Error('上传图片到思源失败: ' + error.message))
      }
    })
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
