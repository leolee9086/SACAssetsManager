import { addMethods } from '../../../utils/object/addMethod.js'
// 状态管理相关方法
const stateMethods = {
  getState() {
    return {
      width: this.width,
      height: this.height,
      pixels: new Uint8ClampedArray(this.pixels),
      metadata: { ...this.metadata },
      status: { ...this.status }
    }
  },

  setState(state) {
    if (!state) return
    
    this.width = state.width
    this.height = state.height
    if (state.pixels) {
      this.pixels = new Uint8ClampedArray(state.pixels)
    }
    if (state.metadata) {
      this.metadata = { ...state.metadata }
    }
    if (state.status) {
      this.status = { ...state.status }
    }
  },

  setMetadata(key, value) {
    this.metadata[key] = value
  },

  setStatus(key, value) {
    this.status[key] = value
  },

  clone() {
    const newCTX = createImageCTX(this.width, this.height)
    newCTX.setState(this.getState())
    return newCTX
  }
}

// Canvas 交互相关方法 (仅用于初始化和导出)
const canvasMethods = {
  importFromCanvas(canvas) {
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    this.width = canvas.width
    this.height = canvas.height
    this.pixels = new Uint8ClampedArray(this.width * this.height * 4)
    this.pixels.set(imageData.data)
  },

  exportToCanvas(canvas) {
    const ctx = canvas.getContext('2d')
    const imageData = new ImageData(this.pixels, this.width, this.height)
    ctx.putImageData(imageData, 0, 0)
  },

  // 添加预览方法
  createPreview(targetCanvas) {
    if (!targetCanvas) {
      targetCanvas = document.createElement('canvas')
      targetCanvas.width = this.width
      targetCanvas.height = this.height
    }
    
    // 确保画布尺寸与图像匹配
    targetCanvas.width = this.width
    targetCanvas.height = this.height
    
    // 导出当前状态到画布
    this.exportToCanvas(targetCanvas)
    return targetCanvas
  },

  // 获取预览的 DataURL
  getPreviewURL(mimeType = 'image/png') {
    const canvas = this.createPreview()
    return canvas.toDataURL(mimeType)
  },

  // 更新预览方法
  updatePreview(targetCanvas, options = {}) {
    const {
      width = this.width,
      height = this.height,
      smoothing = true,
      quality = 'high'
    } = options

    if (!targetCanvas) return

    // 设置目标画布尺寸
    targetCanvas.width = width
    targetCanvas.height = height

    const ctx = targetCanvas.getContext('2d', { willReadFrequently: true })
    
    // 设置图像平滑
    if (smoothing) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = quality
    }

    // 创建临时画布进行导出
    const tempCanvas = this.createPreview()
    
    // 绘制到目标画布
    ctx.drawImage(tempCanvas, 0, 0, width, height)
    
    return targetCanvas
  }
}

// 数据导入导出相关方法
const ioMethods = {
  // 从 ImageData 导入
  importFromImageData(imageData) {
    this.width = imageData.width
    this.height = imageData.height
    this.pixels.set(imageData.data)
  },

  // 从 Uint8ClampedArray 导入
  importFromPixels(pixels, width, height) {
    if (pixels.length !== width * height * 4) {
      throw new Error('像素数据大小与指定尺寸不匹配')
    }
    this.width = width
    this.height = height
    this.pixels.set(pixels)
  },

  // 从 Base64 字符串导入
  async importFromBase64(base64String) {
    const image = new Image()
    image.src = base64String
    await new Promise(resolve => { image.onload = resolve })
    
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    
    this.importFromCanvas(canvas)
  },

  // 导出为 ImageData
  exportToImageData() {
    return new ImageData(this.pixels, this.width, this.height)
  },

  // 导出为 Base64
  exportToBase64(mimeType = 'image/png') {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    this.exportToCanvas(canvas)
    return canvas.toDataURL(mimeType)
  },

  // 导出为 Blob
  exportToBlob(mimeType = 'image/png') {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    this.exportToCanvas(canvas)
    return new Promise(resolve => canvas.toBlob(resolve, mimeType))
  },

  // 从原始缓冲区导入 (替代 importFromSharp)
  importFromRawBuffer(buffer, width, height, channels = 3, format = 'rgb') {
    if (buffer.length !== width * height * channels) {
      throw new Error('缓冲区大小与指定尺寸不匹配')
    }

    this.width = width
    this.height = height

    // 支持不同的格式转换为 RGBA
    switch (format.toLowerCase()) {
      case 'rgb':
        const rgba = new Uint8ClampedArray(width * height * 4)
        for (let i = 0; i < buffer.length; i += 3) {
          const j = (i / 3) * 4
          rgba[j] = buffer[i]
          rgba[j + 1] = buffer[i + 1]
          rgba[j + 2] = buffer[i + 2]
          rgba[j + 3] = 255
        }
        this.pixels.set(rgba)
        break
      
      case 'rgba':
        this.pixels.set(new Uint8ClampedArray(buffer))
        break

      default:
        throw new Error('不支持的格式：' + format)
    }
  },

  // 从 URL 导入
  async importFromURL(url) {
    const response = await fetch(url)
    const blob = await response.blob()
    const base64 = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    await this.importFromBase64(base64)
  },

  // 从 File/Blob 导入
  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const image = new Image()
          image.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = image.width
            canvas.height = image.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(image, 0, 0)
            
            // 更新当前上下文的尺寸和像素数据
            this.width = image.width
            this.height = image.height
            this.pixels = new Uint8ClampedArray(this.width * this.height * 4)
            const imageData = ctx.getImageData(0, 0, this.width, this.height)
            this.pixels.set(imageData.data)
            
            resolve()
          }
          
          image.onerror = () => {
            reject(new Error('图像加载失败'))
          }
          
          image.src = e.target.result
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsDataURL(file)
    })
  },

  // 从 Buffer 导入
  importFromBuffer(buffer, width, height, channels = 4) {
    if (buffer.length !== width * height * channels) {
      throw new Error('缓冲区大小与指定尺寸不匹配')
    }

    if (channels === 4) {
      this.pixels.set(new Uint8ClampedArray(buffer))
    } else if (channels === 3) {
      // RGB 转 RGBA
      const rgba = new Uint8ClampedArray(width * height * 4)
      for (let i = 0; i < buffer.length; i += 3) {
        const j = (i / 3) * 4
        rgba[j] = buffer[i]
        rgba[j + 1] = buffer[i + 1]
        rgba[j + 2] = buffer[i + 2]
        rgba[j + 3] = 255
      }
      this.pixels.set(rgba)
    } else {
      throw new Error('不支持的通道数')
    }

    this.width = width
    this.height = height
  },

  // 导出为 Buffer
  exportToBuffer() {
    return Buffer.from(this.pixels)
  }
}

export class ImageState {
  constructor() {
    this.metadata = {}
    this.status = {}
    this.history = []
    this.width = 0
    this.height = 0
    this.pixels = null
    // 添加监听器数组
    this._listeners = []
  }

  // 添加监听器方法
  addListener(callback) {
    if (typeof callback === 'function' && !this._listeners.includes(callback)) {
      this._listeners.push(callback)
    }
  }

  // 移除监听器方法
  removeListener(callback) {
    const index = this._listeners.indexOf(callback)
    if (index > -1) {
      this._listeners.splice(index, 1)
    }
  }

  // 通知监听器
  _notifyListeners(changeType, data) {
    this._listeners.forEach(listener => {
      listener({ type: changeType, data })
    })
  }

  // 修改现有方法以触发通知
  setMetadata(key, value) {
    this.metadata[key] = value
    this._notifyListeners('metadata', { key, value })
  }
  
  setStatus(key, value) {
    this.status[key] = value
    this._notifyListeners('status', { key, value })
  }
  
  setPixels(pixels, width, height) {
    this.width = width
    this.height = height
    this.pixels = new Uint8ClampedArray(pixels)
    this._notifyListeners('pixels', { width, height })
  }

  // 添加数据验证方法
  validateImageData() {
    // 检查基本属性
    if (!Number.isFinite(this.width) || this.width <= 0) {
      throw new Error('无效的图像宽度')
    }
    if (!Number.isFinite(this.height) || this.height <= 0) {
      throw new Error('无效的图像高度')
    }
    if (!(this.pixels instanceof Uint8ClampedArray)) {
      throw new Error('像素数据类型无效')
    }
    if (this.pixels.length !== this.width * this.height * 4) {
      throw new Error('像素数据大小与图像尺寸不匹配')
    }

    // 检查像素数据是否包含有效值
    for (let i = 0; i < this.pixels.length; i++) {
      if (!Number.isFinite(this.pixels[i])) {
        throw new Error(`像素数据在索引 ${i} 处包含无效值`)
      }
    }

    return true
  }

  // 添加克隆方法
  clone() {
    const newState = new ImageState()
    newState.metadata = { ...this.metadata }
    newState.status = { ...this.status }
    newState.history = [...this.history]
    newState.width = this.width
    newState.height = this.height
    newState.pixels = this.pixels ? new Uint8ClampedArray(this.pixels) : null
    return newState
  }
  
  addHistoryStep(step) {
    this.history.push(step)
  }
}

// 创建图像处理上下文的工厂函数
export const createImageCTX = (width = 1, height = 1) => {
  const ctx = {
    width,
    height,
    pixels: new Uint8ClampedArray(width * height * 4),
    state: new ImageState(),
    metadata: {},
    status: {},

    // 状态管理代理方法
    setMetadata(key, value) {
      this.state.setMetadata(key, value)
    },

    setStatus(key, value) {
      this.state.setStatus(key, value)
    },

    getState() {
      return {
        width: this.width,
        height: this.height,
        pixels: new Uint8ClampedArray(this.pixels),
        state: this.state.clone()
      }
    },

    setState(state) {
      if (!state) return
      
      this.width = state.width
      this.height = state.height
      if (state.pixels) {
        this.pixels = new Uint8ClampedArray(state.pixels)
      }
      if (state.state) {
        this.state = state.state.clone()
      }
    },

    // 添加监听器方法
    addStateListener(callback) {
      this.state.addListener(callback)
    },

    removeStateListener(callback) {
      this.state.removeListener(callback)
    }
  }

  // 合并所有方法
  const methods = {
    ...stateMethods,
    ...canvasMethods,
    ...ioMethods
  }

  return addMethods(ctx, methods)
}

// 添加更多工厂函数
export const createImageCTXFromImageData = (imageData) => {
  const imageCTX = createImageCTX(imageData.width, imageData.height)
  imageCTX.importFromImageData(imageData)
  return imageCTX
}

export const createImageCTXFromBase64 = async (base64String) => {
  const imageCTX = createImageCTX()
  await imageCTX.importFromBase64(base64String)
  return imageCTX
}

export const createImageCTXFromRawBuffer = (buffer, width, height, channels = 3, format = 'rgb') => {
  const imageCTX = createImageCTX(width, height)
  imageCTX.importFromRawBuffer(buffer, width, height, channels, format)
  return imageCTX
}

export const createImageCTXFromURL = async (url) => {
  const imageCTX = createImageCTX()
  await imageCTX.importFromURL(url)
  return imageCTX
}

export const createImageCTXFromFile = async (file) => {
  const imageCTX = createImageCTX()
  await imageCTX.importFromFile(file)
  return imageCTX
}

export const createImageCTXFromBuffer = (buffer, width, height, channels = 4) => {
  const imageCTX = createImageCTX(width, height)
  imageCTX.importFromBuffer(buffer, width, height, channels)
  return imageCTX
} 