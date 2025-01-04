let sharpAvailable = false
let sharpInstance = null

// 添加手动设置sharp的方法
export function useSharp(sharp) {
    if (typeof sharp === 'function' || typeof sharp === 'object') {
        sharpInstance = sharp
        sharpAvailable = true
        return true
    }
    return false
}

// 修正sharp检测逻辑
try {
    const sharp = require('sharp')
    sharpInstance = sharp
    sharpAvailable = true
} catch(e) {
    console.warn('没有sharp可用,使用浏览器接口替代')
}
/**
 * 完全使用浏览器api实现的sharp兼容
 * 主要使用 Canvas API 和 ImageBitmap API 来处理图像
 */
const imageProcessors = {
  // 调整图像大小的纯函数
  async resize(source, width, height, options = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    
    canvas.width = width || source.width;
    canvas.height = height || source.height;
    
    // 使用更优的渲染设置
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = options.quality || 'high';
    
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return await createImageBitmap(canvas);
  }
  
  // ... 其他图像处理函数
};

class WebSharp {
  #cache = new Map();
  #source = null;
  
  constructor(input) {
    if (input === undefined || input === null) {
      throw new Error('输入不能为空');
    }
    this.input = input;
    this.operations = [];
  }

  // 扩展输入源支持
  async #getSourceImage() {
    // 如果已经处理过源图像，直接返回
    if (this.#source) {
      return this.#source;
    }

    try {
      if (this.input instanceof Blob) {
        this.#source = await createImageBitmap(this.input);
      } else if (this.input instanceof HTMLImageElement) {
        this.#source = this.input;
      } else if (typeof this.input === 'string') {
        // 处理 Base64
        if (this.input.startsWith('data:')) {
          const response = await fetch(this.input);
          const blob = await response.blob();
          this.#source = await createImageBitmap(blob);
        } 
        // 处理 URL
        else {
          const response = await fetch(this.input);
          const blob = await response.blob();
          this.#source = await createImageBitmap(blob);
        }
      } else if (this.input instanceof ArrayBuffer || ArrayBuffer.isView(this.input)) {
        // 处理 Buffer 或 TypedArray
        const blob = new Blob([this.input]);
        this.#source = await createImageBitmap(blob);
      } else {
        throw new Error('不支持的输入类型');
      }
      
      return this.#source;
    } catch (error) {
      throw new Error(`图像加载失败: ${error.message}`);
    }
  }

  // 创建新实例的静态方法
  static create(input) {
    return new WebSharp(input);
  }

  // 清理缓存
  async clear() {
    this.#cache.clear();
    if (this.#source instanceof ImageBitmap) {
      this.#source.close();
    }
    this.#source = null;
  }

  resize(width, height, options = {}) {
    // 将操作添加到队列而不是立即执行
    this.operations.push({
      type: 'resize',
      params: [width, height, options]
    });
    return this;
  }

  // 延迟执行所有操作直到需要结果
  async toBuffer() {
    let image = await this.#getSourceImage();
    
    // 生成操作的缓存键
    const cacheKey = JSON.stringify(this.operations);
    
    // 检查缓存
    if (this.#cache.has(cacheKey)) {
      return this.#cache.get(cacheKey);
    }

    // 按顺序执行所有操作
    for (const op of this.operations) {
      image = await imageProcessors[op.type](image, ...op.params);
    }
    
    // 缓存结果
    this.#cache.set(cacheKey, image);
    
    return image;
  }
}

export default WebSharp;