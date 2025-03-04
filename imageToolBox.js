/**
 * imageToolBox.js - 全面的Web图像处理工具箱参考
 * 版本: 1.0.0
 * 
 * 这个模块提供了Web平台上可实现的各种图像处理操作的综合参考。
 * 每个操作都包括中文名称、推荐实现技术和难度级别。
 * 
 * 难度级别说明:
 * - 基础: 适合初学者，通常使用标准Canvas API或简单库
 * - 中级: 需要一定的图像处理知识，可能使用专业库
 * - 高级: 需要专业知识和经验，通常涉及复杂算法或WebGL
 * - 专家: 需要深入的专业知识，通常涉及研究级算法或性能优化
 * 
 * */
const imageToolBox = {
    // 基础图像操作
    basic: {
      load: {
        name: "加载图像",
        tech: ["createImageBitmap", "Image", "fetch+blob", "FileReader"],
        level: "基础"
      },
      save: {
        name: "保存图像", 
        tech: ["canvas.toDataURL", "canvas.toBlob", "FileSaver.js", "Blob URL"],
        level: "基础"
      },
      resize: {
        name: "调整大小",
        tech: ["canvas", "CSS transform", "Sharp.js", "Pica.js"],
        level: "基础"
      },
      crop: {
        name: "裁剪",
        tech: ["canvas", "CSS clip", "Sharp.js", "image-cropper.js"],
        level: "基础"
      },
      rotate: {
        name: "旋转",
        tech: ["canvas.rotate", "CSS transform", "OpenCV.js", "EXIF自动旋转"],
        level: "基础"
      },
      flip: {
        name: "翻转",
        tech: ["canvas", "CSS transform", "OpenCV.js", "scale(-1)"],
        level: "基础"
      },
      convert: {
        name: "图像格式转换",
        tech: ["canvas.toBlob", "FileReader", "Sharp.js", "squoosh"],
        level: "基础"
      },
      compress: {
        name: "图像压缩",
        tech: ["canvas质量参数", "compressorjs", "browser-image-compression", "TinyPNG API"],
        level: "基础"
      },
      metadata: {
        name: "读取图像元数据",
        tech: ["exif-js", "Jimp", "FileReader+ArrayBuffer", "piexifjs"],
        level: "中级"
      },
      scale: {
        name: "按比例缩放",
        tech: ["canvas", "CSS transform", "Pica.js", "bicubic算法"],
        level: "基础"
      },
      preview: {
        name: "生成缩略图",
        tech: ["canvas", "createImageBitmap", "offscreenCanvas", "blob URL"],
        level: "基础"
      },
      orient: {
        name: "EXIF方向校正",
        tech: ["EXIF读取+canvas", "exif-js+变换", "自动方向检测"],
        level: "中级"
      },
      aspectRatio: {
        name: "纵横比调整",
        tech: ["canvas", "object-fit", "裁剪算法", "letterbox填充"],
        level: "基础"
      }
    },
    
    // 色彩操作
    color: {
      convert: {
        name: "色彩空间转换",
        tech: ["OpenCV.js (cvtColor)", "WebGL", "自定义JS", "color-convert"],
        level: "中级"
      },
      adjust: {
        name: "亮度/对比度/饱和度",
        tech: ["CSS filter", "WebGL", "canvas", "OpenCV.js"],
        level: "基础" 
      },
      balance: {
        name: "白平衡",
        tech: ["WebGL", "canvas", "OpenCV.js", "灰世界算法"],
        level: "中级"
      },
      curves: {
        name: "曲线调整",
        tech: ["WebGL", "canvas", "LUT", "贝塞尔曲线"],
        level: "高级"
      },
      lut: {
        name: "LUT查找表",
        tech: ["WebGL", "OpenCV.js", "Sharp.js", "自定义着色器"],
        level: "高级"
      },
      grade: {
        name: "色彩分级",
        tech: ["WebGL", "canvas", "CSS filter", "color lift/gamma/gain"],
        level: "高级"
      },
      histogram: {
        name: "直方图处理",
        tech: ["canvas", "OpenCV.js", "WebGL", "d3.js可视化"],
        level: "中级"
      },
      equalize: {
        name: "直方图均衡化",
        tech: ["OpenCV.js", "canvas", "WebGL", "自适应均衡化"],
        level: "中级"
      },
      quantize: {
        name: "色彩量化",
        tech: ["RgbQuant.js", "自定义算法", "canvas+算法", "中位切分法"],
        level: "中级"
      },
      palette: {
        name: "提取调色板",
        tech: ["color-thief.js", "Vibrant.js", "k-means聚类", "octree算法"],
        level: "中级"
      },
      dominant: {
        name: "主色提取",
        tech: ["fast-average-color", "Vibrant.js", "canvas像素分析", "颜色直方图"],
        level: "基础"
      },
      contrast: {
        name: "自适应对比度",
        tech: ["OpenCV.js", "canvas", "WebGL", "CLAHE算法"],
        level: "中级"
      },
      gamma: {
        name: "伽马校正",
        tech: ["WebGL", "canvas", "CSS filter", "power函数"],
        level: "中级"
      },
      colorize: {
        name: "色彩化",
        tech: ["WebGL", "canvas", "blend模式", "HSL调整"],
        level: "中级"
      },
      split: {
        name: "通道分离与合并",
        tech: ["OpenCV.js", "canvas", "WebGL", "TypedArray操作"],
        level: "中级"
      },
      temperature: {
        name: "色温调整",
        tech: ["WebGL", "canvas", "CSS filter", "RGB偏移"],
        level: "基础"
      },
      tint: {
        name: "色调调整",
        tech: ["WebGL", "canvas", "CSS filter", "颜色混合"],
        level: "基础"
      },
      vibrance: {
        name: "自然饱和度",
        tech: ["WebGL", "canvas", "选择性饱和度增强", "智能饱和度"],
        level: "中级"
      }
    },
    
    // 滤镜与增强
    filters: {
      blur: {
        name: "模糊",
        tech: ["CSS filter", "WebGL", "OpenCV.js", "高斯/运动/方框模糊"],
        level: "基础"
      },
      sharpen: {
        name: "锐化",
        tech: ["WebGL", "OpenCV.js", "canvas", "unsharp mask"],
        level: "中级"
      },
      denoise: {
        name: "降噪",
        tech: ["OpenCV.js", "ONNX Runtime", "WebGL", "双边/非局部平均"],
        level: "高级"
      },
      artistic: {
        name: "艺术效果",
        tech: ["WebGL", "CSS filter", "canvas", "着色器效果"],
        level: "中级"
      },
      edge: {
        name: "边缘检测",
        tech: ["OpenCV.js", "WebGL", "canvas", "Canny/Sobel"],
        level: "中级"
      },
      emboss: {
        name: "浮雕效果",
        tech: ["WebGL", "canvas", "CSS filter", "卷积核"],
        level: "中级"
      },
      threshold: {
        name: "阈值处理",
        tech: ["canvas", "OpenCV.js", "WebGL", "自适应阈值"],
        level: "基础"
      },
      hdr: {
        name: "HDR效果",
        tech: ["WebGL", "OpenCV.js", "canvas", "色调映射"],
        level: "高级"
      },
      vignette: {
        name: "暗角效果",
        tech: ["canvas", "CSS", "WebGL", "径向渐变"],
        level: "基础"
      },
      grain: {
        name: "胶片颗粒",
        tech: ["WebGL", "canvas", "噪点生成", "柏林噪声"],
        level: "中级"
      },
      glitch: {
        name: "故障艺术",
        tech: ["WebGL", "canvas", "像素偏移", "随机干扰"],
        level: "中级"
      },
      pixelate: {
        name: "像素化",
        tech: ["canvas", "WebGL", "CSS", "马赛克"],
        level: "基础"
      },
      tiltShift: {
        name: "移轴效果",
        tech: ["WebGL", "canvas", "选择性模糊", "径向/线性模糊"],
        level: "高级"
      },
      bloom: {
        name: "泛光效果",
        tech: ["WebGL", "多通道渲染", "高斯模糊+混合"],
        level: "高级"
      },
      cartoon: {
        name: "卡通化",
        tech: ["OpenCV.js", "WebGL", "边缘检测+色彩量化"],
        level: "中级"
      },
      halftone: {
        name: "半色调",
        tech: ["canvas", "WebGL", "点阵模式", "阈值图案"],
        level: "中级"
      },
      duotone: {
        name: "双色调",
        tech: ["canvas", "WebGL", "颜色映射", "渐变映射"],
        level: "基础"
      }
    },
    
    // 几何变换
    transform: {
      perspective: {
        name: "透视校正",
        tech: ["WebGL", "OpenCV.js", "CSS 3D", "透视变换矩阵"],
        level: "高级"
      },
      warp: {
        name: "图像变形",
        tech: ["WebGL", "canvas", "OpenCV.js", "网格变形"],
        level: "高级"
      },
      distort: {
        name: "镜头畸变校正",
        tech: ["OpenCV.js", "WebGL", "canvas", "畸变参数估计"],
        level: "高级"
      },
      stitch: {
        name: "全景拼接",
        tech: ["OpenCV.js", "WebGL", "canvas", "特征匹配"],
        level: "高级"
      },
      morph: {
        name: "图像变形",
        tech: ["WebGL", "canvas", "PIXI.js", "三角剖分"],
        level: "高级"
      },
      liquify: {
        name: "液化",
        tech: ["WebGL", "canvas", "mesh变形", "流场"],
        level: "高级"
      },
      fisheye: {
        name: "鱼眼效果",
        tech: ["WebGL", "canvas", "OpenCV.js", "球面映射"],
        level: "中级"
      },
      pinch: {
        name: "挤压变形",
        tech: ["WebGL", "canvas", "向心变换", "非线性变换"],
        level: "中级"
      },
      spherize: {
        name: "球面化",
        tech: ["WebGL", "canvas", "球面投影", "3D映射"],
        level: "中级"
      },
      bulge: {
        name: "凸出效果",
        tech: ["WebGL", "canvas", "径向变换", "非线性映射"],
        level: "中级"
      },
      lens: {
        name: "镜头效果",
        tech: ["WebGL", "着色器", "光学模拟", "折射模型"],
        level: "高级"
      },
      homography: {
        name: "单应性变换",
        tech: ["OpenCV.js", "WebGL", "透视变换", "四点映射"],
        level: "高级"
      }
    },
    
    // 分析与特征提取
    analysis: {
      contour: {
        name: "轮廓提取",
        tech: ["OpenCV.js", "canvas", "WebGL", "边缘跟踪"],
        level: "中级"
      },
      feature: {
        name: "特征点检测",
        tech: ["OpenCV.js", "ONNX Runtime", "WebGL", "SIFT/ORB/SURF"],
        level: "高级"
      },
      face: {
        name: "人脸检测",
        tech: ["ONNX Runtime", "TensorFlow.js", "OpenCV.js", "face-api.js"],
        level: "高级"
      },
      object: {
        name: "物体检测",
        tech: ["ONNX Runtime", "TensorFlow.js", "MediaPipe", "YOLOv8"],
        level: "高级"
      },
      segmentation: {
        name: "图像分割",
        tech: ["ONNX Runtime", "OpenCV.js", "TensorFlow.js", "U-Net"],
        level: "高级"
      },
      ocr: {
        name: "文字识别",
        tech: ["Tesseract.js", "ONNX Runtime", "TensorFlow.js", "PaddleOCR"],
        level: "高级"
      },
      barcode: {
        name: "条码/二维码",
        tech: ["ZXing.js", "jsQR", "QuaggaJS", "BarcodeDetector API"],
        level: "中级"
      },
      landmark: {
        name: "特征点标记",
        tech: ["face-api.js", "MediaPipe", "TensorFlow.js", "姿态估计"],
        level: "高级"
      },
      tracking: {
        name: "目标跟踪",
        tech: ["OpenCV.js", "TensorFlow.js", "MediaPipe", "KCF/MOSSE追踪器"],
        level: "高级"
      },
      measurement: {
        name: "图像测量",
        tech: ["OpenCV.js", "canvas", "参考物比例", "像素距离计算"],
        level: "中级"
      },
      classification: {
        name: "图像分类",
        tech: ["TensorFlow.js", "ONNX Runtime", "MobileNet", "ResNet"],
        level: "高级"
      },
      similarity: {
        name: "图像相似度",
        tech: ["pHash", "SSIM", "特征向量比较", "感知哈希"],
        level: "中级"
      },
      focus: {
        name: "焦点/清晰度分析",
        tech: ["梯度分析", "OpenCV.js", "拉普拉斯算子", "高频分量分析"],
        level: "中级"
      },
      scene: {
        name: "场景理解",
        tech: ["TensorFlow.js", "ONNX Runtime", "MobileNetV3", "语义分割"],
        level: "专家"
      }
    },
    
    // 特效与合成
    effects: {
      blend: {
        name: "图层混合",
        tech: ["canvas", "WebGL", "CSS mix-blend-mode", "自定义混合着色器"],
        level: "中级"
      },
      mask: {
        name: "蒙版处理",
        tech: ["canvas", "WebGL", "CSS mask", "alpha通道"],
        level: "中级"
      },
      chroma: {
        name: "色键抠图",
        tech: ["WebGL", "canvas", "OpenCV.js", "色相距离"],
        level: "高级"
      },
      matting: {
        name: "AI抠图",
        tech: ["ONNX Runtime", "TensorFlow.js", "MediaPipe", "Portrait Segmentation"],
        level: "高级"
      },
      styleTransfer: {
        name: "风格迁移",
        tech: ["ONNX Runtime", "TensorFlow.js", "WebGL", "神经风格迁移"],
        level: "高级"
      },
      composite: {
        name: "图像合成",
        tech: ["canvas", "WebGL", "CSS", "多层合成"],
        level: "中级"
      },
      overlay: {
        name: "图像叠加",
        tech: ["canvas", "CSS", "WebGL", "透明度混合"],
        level: "基础"
      },
      reflection: {
        name: "倒影/反射",
        tech: ["canvas", "WebGL", "CSS", "翻转+透明渐变"],
        level: "基础"
      },
      lightLeak: {
        name: "漏光效果",
        tech: ["canvas", "CSS", "WebGL", "径向渐变+混合模式"],
        level: "中级"
      },
      glare: {
        name: "眩光",
        tech: ["WebGL", "CSS", "canvas", "光晕生成"],
        level: "中级"
      },
      lensFlair: {
        name: "镜头光晕",
        tech: ["WebGL", "canvas", "光源模拟", "自定义着色器"],
        level: "高级"
      },
      shadows: {
        name: "投影生成",
        tech: ["canvas", "CSS", "WebGL", "轮廓提取+模糊"],
        level: "中级"
      },
      nightVision: {
        name: "夜视效果",
        tech: ["WebGL", "canvas", "色彩映射", "噪点添加"],
        level: "中级"
      },
      splash: {
        name: "局部彩色",
        tech: ["canvas", "WebGL", "颜色分离", "蒙版处理"],
        level: "中级"
      },
      weather: {
        name: "天气效果",
        tech: ["canvas", "WebGL", "粒子系统", "雨雪雾特效"],
        level: "中级"
      }
    },
    
    // 视频处理
    video: {
      extract: {
        name: "视频帧提取",
        tech: ["WebCodecs", "canvas+video", "MediaPipe", "OffscreenCanvas"],
        level: "中级"
      },
      stabilize: {
        name: "视频稳定",
        tech: ["OpenCV.js", "WebGL", "ONNX Runtime", "光流+变换"],
        level: "高级"
      },
      filter: {
        name: "视频滤镜",
        tech: ["WebGL", "canvas", "CSS filter", "WebCodecs"],
        level: "中级"
      },
      transition: {
        name: "视频转场",
        tech: ["WebGL", "canvas", "CSS animation", "GLSL着色器"],
        level: "高级"
      },
      interpolate: {
        name: "帧插值",
        tech: ["ONNX Runtime", "WebGL", "canvas", "光流估计"],
        level: "高级"
      },
      compress: {
        name: "视频压缩",
        tech: ["WebCodecs", "MediaRecorder", "FFmpeg.wasm", "H.264/VP9编码"],
        level: "高级"
      },
      trim: {
        name: "视频剪辑",
        tech: ["MediaSource Extensions", "VideoContext", "FFmpeg.wasm"],
        level: "中级"
      },
      slowfast: {
        name: "变速播放",
        tech: ["WebCodecs", "时间重采样", "帧插值", "playbackRate"],
        level: "中级"
      },
      reverse: {
        name: "倒放",
        tech: ["帧重排序", "WebCodecs", "FFmpeg.wasm", "canvas回放"],
        level: "中级"
      },
      concat: {
        name: "视频拼接",
        tech: ["MediaSource Extensions", "FFmpeg.wasm", "WebCodecs"],
        level: "高级"
      },
      overlay: {
        name: "视频叠加",
        tech: ["canvas", "WebGL", "CSS mix-blend-mode", "chroma key"],
        level: "中级"
      },
      caption: {
        name: "字幕处理",
        tech: ["WebVTT", "canvas绘制", "VideoTrack API", "自定义渲染"],
        level: "中级"
      },
      gif: {
        name: "GIF生成",
        tech: ["gif.js", "canvas序列", "whammy", "WebCodecs"],
        level: "中级"
      },
      timelapse: {
        name: "延时摄影",
        tech: ["帧采样", "canvas", "WebCodecs", "FFmpeg.wasm"],
        level: "中级"
      }
    },
    
    // AI增强与生成
    ai: {
      superRes: {
        name: "超分辨率",
        tech: ["ONNX Runtime", "TensorFlow.js", "WebGL", "ESRGAN"],
        level: "高级"
      },
      denoising: {
        name: "AI降噪",
        tech: ["ONNX Runtime", "TensorFlow.js", "WebGL", "NAFNet"],
        level: "高级"
      },
      inpainting: {
        name: "内容填充",
        tech: ["ONNX Runtime", "TensorFlow.js", "WebGL", "LaMa"],
        level: "高级"
      },
      generation: {
        name: "图像生成",
        tech: ["ONNX Runtime", "TensorFlow.js", "WebGL", "Stable Diffusion Web"],
        level: "专家"
      },
      depthMap: {
        name: "深度估计",
        tech: ["ONNX Runtime", "TensorFlow.js", "MediaPipe", "MiDaS"],
        level: "高级"
      },
      pose: {
        name: "姿态估计",
        tech: ["ONNX Runtime", "TensorFlow.js", "MediaPipe", "BlazePose"],
        level: "高级"
      },
      restoration: {
        name: "照片修复",
        tech: ["ONNX Runtime", "TensorFlow.js", "GFPGAN", "WebGL"],
        level: "专家"
      },
      colorization: {
        name: "黑白照片上色",
        tech: ["ONNX Runtime", "TensorFlow.js", "DeOldify", "GAN模型"],
        level: "专家"
      },
      faceSwap: {
        name: "人脸替换",
        tech: ["ONNX Runtime", "MediaPipe", "TensorFlow.js", "人脸对齐"],
        level: "专家"
      },
      aging: {
        name: "人脸老化/年轻化",
        tech: ["ONNX Runtime", "TensorFlow.js", "GAN模型", "StyleGAN定向编辑"],
        level: "专家"
      },
      expression: {
        name: "表情迁移",
        tech: ["MediaPipe", "TensorFlow.js", "特征点映射", "GAN模型"],
        level: "专家"
      },
      textToImage: {
        name: "文本生成图像",
        tech: ["TensorFlow.js", "Stable Diffusion Web", "CLIP"],
        level: "专家"
      },
      imageToText: {
        name: "图像描述生成",
        tech: ["TensorFlow.js", "CLIP", "BLIP", "图像理解模型"],
        level: "专家"
      }
    },
    
    // 创意编码
    creative: {
      pixelSort: {
        name: "像素排序",
        tech: ["WebGL", "canvas", "自定义JS", "像素操作算法"],
        level: "中级"
      },
      fractal: {
        name: "分形渲染",
        tech: ["WebGL", "WebGPU", "canvas", "曼德勃罗集/朱利亚集"],
        level: "高级"
      },
      particles: {
        name: "粒子系统",
        tech: ["WebGL", "canvas", "Three.js", "GPU加速粒子"],
        level: "高级"
      },
      noise: {
        name: "噪声生成",
        tech: ["WebGL", "canvas", "自定义JS", "Perlin/Simplex噪声"],
        level: "中级"
      },
      generative: {
        name: "生成艺术",
        tech: ["canvas", "SVG", "WebGL", "随机/递归/L系统"],
        level: "中级"
      },
      cellular: {
        name: "元胞自动机",
        tech: ["canvas", "WebGL", "生命游戏", "反应扩散系统"],
        level: "中级"
      },
      dataMoshing: {
        name: "数据抓取",
        tech: ["WebGL", "canvas", "像素流操作", "压缩伪影利用"],
        level: "高级"
      },
      ascii: {
        name: "ASCII艺术",
        tech: ["canvas", "亮度映射", "字符渲染", "CSS网格"],
        level: "中级"
      },
      voronoi: {
        name: "泰森多边形",
        tech: ["canvas", "WebGL", "d3-delaunay", "几何算法"],
        level: "中级"
      },
      isometric: {
        name: "等距艺术",
        tech: ["canvas", "SVG", "Three.js", "正轴测投影"],
        level: "中级"
      },
      flow: {
        name: "流场可视化",
        tech: ["canvas", "WebGL", "向量场", "粒子追踪"],
        level: "高级"
      },
      shader: {
        name: "着色器艺术",
        tech: ["WebGL", "WebGPU", "GLSL", "shader-toy风格"],
        level: "高级"
      }
    },
    
    // 优化方案
    optimization: {
      worker: {
        name: "Web Worker并行处理",
        tech: ["WebWorker", "OffscreenCanvas", "SharedArrayBuffer", "MessageChannel"],
        level: "高级"
      },
      webAssembly: {
        name: "WebAssembly加速",
        tech: ["Wasm", "Emscripten", "AssemblyScript", "Rust/C++编译"],
        level: "高级"
      },
      tiling: {
        name: "分块处理",
        tech: ["canvas", "WebGL", "自定义JS", "记忆化渲染"],
        level: "中级"
      },
      streaming: {
        name: "流式处理",
        tech: ["WebCodecs", "TransformStream", "ReadableStream", "管道处理"],
        level: "高级"
      },
      progressive: {
        name: "渐进式处理",
        tech: ["requestIdleCallback", "setTimeout", "requestAnimationFrame", "任务分片"],
        level: "中级"
      },
      gpu: {
        name: "GPU加速计算",
        tech: ["WebGL", "WebGPU", "gpu.js", "GPGPU技术"],
        level: "高级"
      },
      simd: {
        name: "SIMD向量化",
        tech: ["WebAssembly SIMD", "SIMD.js", "Wasm优化", "并行数据处理"],
        level: "专家"
      },
      memoryManagement: {
        name: "内存优化",
        tech: ["对象池", "TypedArray", "OffscreenCanvas", "手动垃圾回收"],
        level: "高级"
      },
      lazy: {
        name: "延迟加载与处理",
        tech: ["Intersection Observer", "虚拟滚动", "分批处理", "可视优先"],
        level: "中级"
      },
      caching: {
        name: "处理结果缓存",
        tech: ["IndexedDB", "CacheAPI", "localStorage", "内存缓存"],
        level: "中级"
      },
      transfer: {
        name: "零拷贝传输",
        tech: ["Transferable Objects", "SharedArrayBuffer", "ArrayBuffer.transfer"],
        level: "高级"
      }
    },
    
    // 批处理与自动化
    batch: {
      queue: {
        name: "批量队列处理",
        tech: ["Promise.all", "async/await", "Web Worker", "并行限制器"],
        level: "中级"
      },
      directory: {
        name: "文件夹批处理",
        tech: ["File System Access API", "拖放API", "input[type=file][webkitdirectory]", "目录遍历"],
        level: "中级"
      },
      presets: {
        name: "预设应用",
        tech: ["JSON配置", "localStorage", "IndexedDB", "模板系统"],
        level: "中级"
      },
      macros: {
        name: "操作宏录制",
        tech: ["JSON序列化", "函数队列", "IndexedDB", "操作回放"],
        level: "高级"
      },
      autoCorrect: {
        name: "智能自动校正",
        tech: ["图像分析算法", "ONNX Runtime", "TensorFlow.js", "自动色彩/对比度"],
        level: "高级"
      },
      batchResize: {
        name: "批量调整大小",
        tech: ["Web Worker", "Promise.all", "并行化", "进度报告"],
        level: "中级"
      },
      watermark: {
        name: "批量水印",
        tech: ["canvas", "worker", "图像合成", "位置算法"],
        level: "中级"
      },
      renamer: {
        name: "批量重命名",
        tech: ["File System Access API", "正则表达式", "元数据提取", "名称生成"],
        level: "中级"
      }
    },
    
    // 高级交互与编辑
    interaction: {
      selection: {
        name: "智能选区",
        tech: ["MediaPipe", "OpenCV.js", "Canvas路径", "自动边缘检测"],
        level: "高级"
      },
      brushes: {
        name: "自定义画笔",
        tech: ["Canvas 2D", "WebGL", "压感API", "笔刷引擎"],
        level: "中级"
      },
      healing: {
        name: "修复画笔",
        tech: ["OpenCV.js inpaint", "WebGL", "Canvas像素采样", "内容感知填充"],
        level: "高级"
      },
      layering: {
        name: "图层系统",
        tech: ["多Canvas叠加", "WebGL", "自定义合成引擎", "图层管理器"],
        level: "高级"
      },
      history: {
        name: "历史记录与撤销",
        tech: ["命令模式", "快照", "差分记录", "状态管理"],
        level: "中级"
      },
      gestures: {
        name: "手势操作",
        tech: ["Hammer.js", "Pointer Events", "TouchEvents", "手势识别"],
        level: "中级"
      },
      drawing: {
        name: "手绘工具",
        tech: ["canvas", "SVG路径", "WebGL", "矢量绘制"],
        level: "中级"
      },
      pen: {
        name: "钢笔工具",
        tech: ["贝塞尔曲线", "SVG路径", "canvas", "控制点交互"],
        level: "高级"
      },
      magneticLasso: {
        name: "磁性套索",
        tech: ["边缘检测", "路径吸附", "canvas", "实时计算"],
        level: "高级"
      },
      cropUI: {
        name: "交互式裁剪",
        tech: ["拖拽控制点", "canvas", "CSS", "9点控制"],
        level: "中级"
      },
      clone: {
        name: "仿制图章",
        tech: ["canvas", "像素复制", "源/目标映射", "实时预览"],
        level: "中级"
      },
      perspective: {
        name: "透视变换UI",
        tech: ["四点控制", "WebGL", "矩阵计算", "实时预览"],
        level: "高级"
      }
    },
    
    // 3D与深度处理
    depthAndVolume: {
      pointCloud: {
        name: "点云生成与处理",
        tech: ["Three.js", "WebGL", "ONNX深度模型", "点云库"],
        level: "高级"
      },
      depthEffects: {
        name: "深度图效果",
        tech: ["WebGL", "CSS filter(backdrop)", "Three.js", "深度映射着色器"],
        level: "高级"
      },
      photoTo3D: {
        name: "照片转3D模型",
        tech: ["ONNX Runtime", "Three.js", "MediaPipe", "深度估计"],
        level: "专家"
      },
      volumetric: {
        name: "体积渲染",
        tech: ["WebGL", "Three.js", "自定义着色器", "光线投射"],
        level: "专家"
      },
      parallax: {
        name: "视差效果",
        tech: ["CSS 3D", "WebGL", "深度图+位移", "多层位移"],
        level: "中级"
      },
      normalMap: {
        name: "法线图生成",
        tech: ["WebGL", "深度图导数", "Height to Normal", "切线空间"],
        level: "高级"
      },
      relighting: {
        name: "重光照",
        tech: ["WebGL", "法线图", "光照模型", "PBS着色器", "实时渲染"],
        level: "高级"
      },
      displacement: {
        name: "位移映射",
        tech: ["WebGL", "Three.js", "深度图", "高度图置换"],
        level: "高级"
      },
      stereoscopic: {
        name: "立体成像",
        tech: ["WebGL", "左右视差", "红蓝3D", "双目视觉"],
        level: "高级"
      },
      holographic: {
        name: "全息效果",
        tech: ["WebGL", "视差映射", "光场模拟", "深度视差"],
        level: "专家"
      },
      vr360: {
        name: "VR全景处理",
        tech: ["WebGL", "equirectangular投影", "Three.js", "立体全景"],
        level: "高级"
      }
    },
    
    // 格式与兼容性
    formats: {
      avif: {
        name: "AVIF处理",
        tech: ["squoosh.js", "avif.js", "WebCodecs", "浏览器原生支持"],
        level: "高级"
      },
      webp: {
        name: "WebP处理",
        tech: ["libwebp.js", "squoosh.js", "Canvas转换", "浏览器API"],
        level: "中级"
      },
      hdr: {
        name: "HDR格式支持",
        tech: ["hdr.js", "WebGL", "EXR加载器", "色调映射"],
        level: "高级"
      },
      raw: {
        name: "RAW格式处理",
        tech: ["libraw.js", "Web Assembly", "自定义解码器", "DNG处理"],
        level: "专家"
      },
      svg: {
        name: "SVG处理与转换",
        tech: ["svg.js", "Canvas转SVG", "SVG DOM操作", "矢量化"],
        level: "中级"
      },
      pdf: {
        name: "PDF图像提取与处理",
        tech: ["pdf.js", "jsPDF", "pdfkit", "PDF内容读写"],
        level: "高级"
      },
      heif: {
        name: "HEIF/HEIC支持",
        tech: ["heic2any", "libheif.js", "浏览器API", "iOS照片兼容"],
        level: "高级"
      },
      gif: {
        name: "GIF优化与处理",
        tech: ["gif.js", "gifenc", "LZW压缩", "帧优化"],
        level: "中级"
      },
      jpeg: {
        name: "JPEG编码优化",
        tech: ["mozjpeg.js", "JPEG量化表调整", "渐进式JPEG", "WebP转换"],
        level: "中级"
      },
      png: {
        name: "PNG优化",
        tech: ["pngquant.js", "UPNG.js", "无损压缩", "索引色优化"],
        level: "中级"
      }
    },
    
    // 性能监控与分析
    performance: {
      profiling: {
        name: "性能分析",
        tech: ["Performance API", "Chrome DevTools", "自定义计时", "FirePerf"],
        level: "高级"
      },
      metrics: {
        name: "性能指标收集",
        tech: ["Web Vitals", "性能标记", "UserTiming API", "资源计时"],
        level: "中级"
      },
      monitoring: {
        name: "实时性能监控",
        tech: ["requestAnimationFrame计时", "FPS监测", "内存使用追踪", "性能观察器"],
        level: "高级"
      },
      optimization: {
        name: "自适应性能优化",
        tech: ["设备检测", "能力降级", "分辨率缩放", "复杂度自适应"],
        level: "高级"
      },
      bottleneck: {
        name: "瓶颈检测",
        tech: ["Chrome性能分析", "内存快照", "GPU分析", "执行时间分布"],
        level: "高级"
      }
    },
    
    // 特殊处理需求
    special: {
      forensic: {
        name: "图像取证",
        tech: ["噪声分析", "ELA分析", "元数据提取", "伪影检测"],
        level: "专家"
      },
      medical: {
        name: "医学图像处理",
        tech: ["DICOM.js", "窗宽窗位", "伪彩色增强", "图像融合"],
        level: "专家"
      },
      satellite: {
        name: "卫星图像处理",
        tech: ["GeoTIFF.js", "多波段处理", "假彩色合成", "地理校正"],
        level: "专家"
      },
      microscopy: {
        name: "显微图像处理",
        tech: ["尺度校准", "Z-stack合成", "细胞分割", "特征增强"],
        level: "专家"
      },
      thermal: {
        name: "热成像处理",
        tech: ["伪彩色映射", "温度校准", "辐射校正", "高动态范围处理"],
        level: "高级"
      },
      xray: {
        name: "X光图像增强",
        tech: ["对比度调整", "降噪算法", "边缘增强", "直方图均衡化"],
        level: "高级"
      }
    },
    
    // 打印与输出
    output: {
      print: {
        name: "打印优化",
        tech: ["CMYK转换", "DPI调整", "打印预览", "分页算法"],
        level: "中级"
      },
      colorProfiles: {
        name: "色彩配置文件管理",
        tech: ["ICC配置文件", "sRGB/Adobe RGB", "色彩空间转换", "嵌入式配置文件"],
        level: "高级"
      },
      precision: {
        name: "高精度图像输出",
        tech: ["16位/通道处理", "HDR输出", "色彩精确性", "色域映射"],
        level: "高级"
      },
      sharing: {
        name: "社交媒体优化",
        tech: ["缩略图生成", "元数据处理", "平台特定压缩", "尺寸自适应"],
        level: "中级"
      },
      export: {
        name: "批量导出",
        tech: ["多格式导出", "导出预设", "命名规则", "质量设置"],
        level: "中级"
      }
    },
    
    // 移动设备专用处理
    mobile: {
      captureEnhance: {
        name: "拍摄增强",
        tech: ["MediaStream处理", "实时滤镜", "HDR合成", "防抖算法"],
        level: "高级"
      },
      quickEdit: {
        name: "快速编辑工具",
        tech: ["手势操作", "预设应用", "实时预览", "性能优化"],
        level: "中级"
      },
      lowPower: {
        name: "低功耗处理",
        tech: ["算法简化", "逐步渲染", "硬件加速", "批处理减少"],
        level: "高级"
      },
      offlineProcessing: {
        name: "离线处理",
        tech: ["后台处理", "IndexedDB存储", "Service Worker", "队列管理"],
        level: "高级"
      },
      sensorIntegration: {
        name: "传感器集成",
        tech: ["陀螺仪交互", "ARCore/ARKit", "环境光感应", "位置服务"],
        level: "高级"
      }
    },
    
    // 图像比较与版本控制
    versioning: {
      comparison: {
        name: "图像比较",
        tech: ["像素差异计算", "滑动对比", "直方图比较", "结构相似性"],
        level: "中级"
      },
      versioning: {
        name: "版本控制",
        tech: ["差异存储", "非破坏性编辑", "修改历史", "回滚功能"],
        level: "高级"
      },
      beforeAfter: {
        name: "前后对比",
        tech: ["交互式滑块", "叠加对比", "分屏展示", "动画过渡"],
        level: "中级"
      },
      auditTrail: {
        name: "编辑审计",
        tech: ["操作日志", "修改追踪", "编辑元数据", "时间线可视化"],
        level: "中级"
      }
    },
    
    // 水印与安全
    security: {
      watermark: {
        name: "数字水印",
        tech: ["不可见水印", "频域嵌入", "鲁棒性水印", "QR码/条形码"],
        level: "高级"
      },
      encryption: {
        name: "图像加密",
        tech: ["视觉加密", "像素置乱", "Web Crypto API", "密钥管理"],
        level: "高级"
      },
      tamperDetection: {
        name: "篡改检测",
        tech: ["哈希验证", "噪声分析", "ELA检测", "边缘分析"],
        level: "高级"
      },
      authentication: {
        name: "图像认证",
        tech: ["数字签名", "区块链验证", "元数据验证", "特征匹配"],
        level: "高级"
      },
      dcma: {
        name: "版权保护",
        tech: ["数字指纹", "内容识别", "使用限制", "授权管理"],
        level: "高级"
      }
    },
    
    // 图像恢复与修复
    recovery: {
      missing: {
        name: "丢失数据恢复",
        tech: ["内容感知填充", "AI修复", "边缘延续", "纹理合成"],
        level: "高级"
      },
      scratches: {
        name: "划痕修复",
        tech: ["修复画笔", "自动检测", "线性插值", "PatchMatch"],
        level: "中级"
      },
      colorFading: {
        name: "褪色恢复",
        tech: ["色彩增强", "历史参考", "色彩平衡", "对比度恢复"],
        level: "中级"
      },
      degradation: {
        name: "老化照片修复",
        tech: ["噪点减少", "裂缝修复", "折痕消除", "色彩恢复"],
        level: "高级"
      },
      lossy: {
        name: "压缩伪影减少",
        tech: ["JPEG伪影消除", "边缘增强", "细节恢复", "自适应滤波"],
        level: "高级"
      }
    },

    // 图像合成与融合
    composition: {
      layerBlend: {
        name: "图层混合模式",
        tech: ["canvas globalCompositeOperation", "WebGL混合模式", "自定义混合算法", "CSS混合模式"],
        level: "中级"
      },
      maskApply: {
        name: "蒙版应用",
        tech: ["canvas剪切区域", "WebGL alpha通道", "位图蒙版", "Alpha合成"],
        level: "中级"
      },
      imageStitching: {
        name: "图像拼接",
        tech: ["canvas绘制", "特征匹配", "边缘融合", "渐变混合"],
        level: "中级"
      },
      panoramaBuilder: {
        name: "全景图构建",
        tech: ["OpenCV.js", "Canvas 2D", "WebGL", "投影变换"],
        level: "高级"
      },
      focus: {
        name: "焦点堆叠",
        tech: ["图像对齐", "清晰度检测", "多层融合", "OpenCV.js"],
        level: "高级"
      },
      exposureBlend: {
        name: "曝光融合",
        tech: ["HDR合成", "局部色调映射", "权重混合", "多分辨率融合"],
        level: "高级"
      },
      collage: {
        name: "图像拼贴",
        tech: ["canvas", "grid布局", "自动排列", "模板系统"],
        level: "中级"
      }
    },

    // 像素与位操作
    pixelOps: {
      bitPlanes: {
        name: "位平面提取",
        tech: ["位运算", "TypedArray", "canvas", "位掩码"],
        level: "中级"
      },
      pixelAccess: {
        name: "像素随机访问",
        tech: ["getImageData", "Uint8ClampedArray", "TypedArray视图", "WebGL纹理"],
        level: "基础"
      },
      binaryOps: {
        name: "图像位运算",
        tech: ["AND/OR/XOR运算", "canvas", "TypedArray", "位操作"],
        level: "中级"
      },
      rle: {
        name: "游程编码",
        tech: ["压缩算法", "自定义JS", "二值图像", "TypedArray"],
        level: "中级"
      },
      dithering: {
        name: "抖动算法",
        tech: ["Floyd-Steinberg", "Bayer矩阵", "Blue Noise", "误差扩散"],
        level: "中级"
      },
      medianCut: {
        name: "中值切分量化",
        tech: ["色彩量化", "八叉树", "自定义JS", "减色算法"],
        level: "中级"
      }
    },

    // 绘图与标注
    drawing: {
      annotate: {
        name: "图像标注",
        tech: ["canvas", "SVG", "标记层", "交互式箭头/文字"],
        level: "中级"
      },
      measureTool: {
        name: "测量工具",
        tech: ["canvas", "像素距离", "校准尺度", "角度测量"],
        level: "中级"
      },
      highlight: {
        name: "区域高亮",
        tech: ["canvas", "SVG蒙版", "CSS混合", "选区突出"],
        level: "基础"
      },
      shapes: {
        name: "绘制矢量图形",
        tech: ["canvas路径", "SVG", "贝塞尔曲线", "矢量编辑"],
        level: "中级"
      },
      pixelPaint: {
        name: "像素级绘制",
        tech: ["canvas", "putImageData", "放大视图", "色彩选择器"],
        level: "中级"
      },
      gridOverlay: {
        name: "网格叠加",
        tech: ["canvas", "SVG网格", "CSS网格", "参考线"],
        level: "基础"
      }
    },

    // 图像修饰与美化
    enhancement: {
      vignette: {
        name: "暗角/边缘渐变",
        tech: ["canvas径向渐变", "WebGL着色器", "CSS混合", "蒙版"],
        level: "基础"
      },
      border: {
        name: "图像边框",
        tech: ["canvas描边", "CSS border", "SVG框架", "图案边框"],
        level: "基础"
      },
      filmGrain: {
        name: "胶片颗粒",
        tech: ["噪点生成", "canvas", "WebGL", "噪点叠加"],
        level: "中级"
      },
      frame: {
        name: "相框效果",
        tech: ["canvas", "CSS", "图像合成", "边框模板"],
        level: "基础"
      },
      textOverlay: {
        name: "文字叠加",
        tech: ["canvas文字", "CSS定位", "SVG文本", "字体处理"],
        level: "基础"
      },
      reflection: {
        name: "倒影/镜像效果",
        tech: ["canvas翻转+透明度", "CSS反射", "WebGL", "合成"],
        level: "中级"
      }
    },

    // 实用工具与助手
    utilities: {
      colorPicker: {
        name: "颜色拾取器",
        tech: ["canvas getImageData", "鼠标事件", "颜色转换", "放大视图"],
        level: "基础"
      },
      gridGenerator: {
        name: "网格生成器",
        tech: ["canvas", "SVG", "参数化网格", "动态间距"],
        level: "基础"
      },
      imageComparison: {
        name: "图像对比",
        tech: ["滑动分割", "透明度切换", "差异高亮", "canvas合成"],
        level: "中级"
      },
      histogramViewer: {
        name: "直方图查看器",
        tech: ["canvas绘制", "数据统计", "RGB/HSL直方图", "交互式"],
        level: "中级"
      },
      metadataEditor: {
        name: "元数据编辑器",
        tech: ["EXIF.js", "piexif", "表单UI", "数据验证"],
        level: "中级"
      },
      guidesAndRulers: {
        name: "参考线与标尺",
        tech: ["canvas", "拖拽交互", "像素测量", "辅助绘制"],
        level: "中级"
      }
    },

    // 图像序列处理
    sequence: {
      timelapse: {
        name: "延时摄影处理",
        tech: ["时间插值", "平滑过渡", "曝光均衡", "序列对齐"],
        level: "高级"
      },
      spriteSheet: {
        name: "精灵图生成",
        tech: ["canvas拼接", "网格排列", "JSON数据", "动画帧"],
        level: "中级"
      },
      gifCreator: {
        name: "GIF动画创建",
        tech: ["gif.js", "帧控制", "优化设置", "canvas序列"],
        level: "中级"
      },
      batchAlignment: {
        name: "批量图像对齐",
        tech: ["特征匹配", "变换矩阵", "序列稳定", "参考帧"],
        level: "高级"
      },
      keyframeAnimation: {
        name: "关键帧动画",
        tech: ["补间算法", "canvas序列", "动画控制", "时间线"],
        level: "中级"
      }
    },

    // 图像变形与扭曲
    distortion: {
      liquidReshape: {
        name: "液态变形",
        tech: ["WebGL", "网格变形", "矢量场", "交互式变形"],
        level: "高级"
      },
      warp: {
        name: "网格变形",
        tech: ["三角形网格", "贝塞尔变换", "控制点拖拽", "WebGL"],
        level: "高级"
      },
      spherize: {
        name: "球面化",
        tech: ["极坐标变换", "canvas", "WebGL", "径向变形算法"],
        level: "中级"
      },
      pinch: {
        name: "挤压变形",
        tech: ["径向变形", "canvas", "WebGL", "交互式控制"],
        level: "中级"
      },
      wave: {
        name: "波浪效果",
        tech: ["正弦变换", "WebGL", "参数化波形", "动画波纹"],
        level: "中级"
      },
      swirl: {
        name: "漩涡效果",
        tech: ["极坐标旋转", "canvas", "WebGL", "参数化强度"],
        level: "中级"
      }
    },

    // 图像分割与区域操作
    segmentation: {
      regionGrow: {
        name: "区域生长",
        tech: ["种子填充", "canvas", "OpenCV.js", "连通区域"],
        level: "中级"
      },
      watershed: {
        name: "分水岭算法",
        tech: ["OpenCV.js", "形态学处理", "标记控制", "区域分割"],
        level: "高级"
      },
      grabCut: {
        name: "交互式分割",
        tech: ["OpenCV.js", "前景/背景标记", "图割算法", "边界细化"],
        level: "高级"
      },
      contourTrace: {
        name: "轮廓提取",
        tech: ["OpenCV.js", "边缘跟踪", "轮廓简化", "矢量化"],
        level: "中级"
      },
      blobAnalysis: {
        name: "区块分析",
        tech: ["连通组件标记", "形状描述", "尺寸过滤", "特性计算"],
        level: "中级"
      },
      colorSegment: {
        name: "颜色分割",
        tech: ["K-means聚类", "颜色量化", "区域标记", "颜色距离"],
        level: "中级"
      }
    },

    // 测量与计量工具
    measurement: {
      pixelCount: {
        name: "像素计数",
        tech: ["掩膜统计", "阈值计数", "区域累积", "密度分析"],
        level: "基础"
      },
      distanceTool: {
        name: "距离测量",
        tech: ["欧氏距离", "路径长度", "校准转换", "像素/实际单位"],
        level: "基础"
      },
      angleTool: {
        name: "角度测量",
        tech: ["向量计算", "三点角度", "极坐标", "交互式标记"],
        level: "基础"
      },
      areaMeasure: {
        name: "面积计算",
        tech: ["像素累加", "多边形面积", "校准转换", "不规则形状"],
        level: "中级"
      },
      objectCount: {
        name: "物体计数",
        tech: ["连通组件", "形状检测", "Hough变换", "计数统计"],
        level: "中级"
      },
      scaleCalibration: {
        name: "比例尺校准",
        tech: ["参考标记", "比例转换", "单位设置", "全局/局部校准"],
        level: "中级"
      }
    },

    // 色彩校准与管理
    colorManagement: {
      calibration: {
        name: "显示器校准",
        tech: ["色彩配置文件", "伽马校正", "色彩测试", "ICC应用"],
        level: "高级"
      },
      softProofing: {
        name: "软打样",
        tech: ["设备模拟", "色彩空间转换", "纸张模拟", "油墨模拟"],
        level: "高级"
      },
      outOfGamut: {
        name: "超出色域检测",
        tech: ["色域映射", "警告标记", "色彩空间比较", "可打印检查"],
        level: "高级"
      },
      deviceEmulation: {
        name: "设备仿真",
        tech: ["设备配置文件", "色彩校正", "屏幕类型模拟", "显示条件"],
        level: "高级"
      },
      targetMatch: {
        name: "目标匹配",
        tech: ["色彩匹配", "参考样本", "LAB比较", "色差计算"],
        level: "高级"
      },
      colorBlindSim: {
        name: "色盲模拟",
        tech: ["色盲类型", "色彩转换矩阵", "色觉模拟", "无障碍检查"],
        level: "中级"
      }
    },

    // 文档与文本处理
    document: {
      ocrPrep: {
        name: "OCR预处理",
        tech: ["二值化", "倾斜校正", "噪点移除", "对比度增强"],
        level: "中级"
      },
      textExtraction: {
        name: "文本提取",
        tech: ["Tesseract.js", "OCR引擎", "文本区域检测", "块识别"],
        level: "高级"
      },
      documentScan: {
        name: "文档扫描增强",
        tech: ["边缘检测", "透视校正", "阴影去除", "自动裁剪"],
        level: "中级"
      },
      signatureExtract: {
        name: "签名提取",
        tech: ["背景消除", "颜色分离", "形态学操作", "区域识别"],
        level: "中级"
      },
      barcodeScan: {
        name: "条码/二维码识别",
        tech: ["jsQR", "ZXing.js", "图像预处理", "多码检测"],
        level: "中级"
      },
      documentCleanup: {
        name: "文档清理",
        tech: ["污点去除", "线条增强", "背景均化", "文本锐化"],
        level: "中级"
      }
    },

    // 特殊视觉效果
    visualEffects: {
      tiltshift: {
        name: "移轴效果",
        tech: ["选择性模糊", "深度图", "渐变模糊", "微缩景观"],
        level: "中级"
      },
      lensFlareSim: {
        name: "镜头光晕",
        tech: ["光源检测", "光晕叠加", "光斑生成", "透明度混合"],
        level: "中级"
      },
      glitchEffect: {
        name: "故障艺术效果",
        tech: ["随机位移", "通道偏移", "噪点叠加", "像素排序"],
        level: "中级"
      },
      halftone: {
        name: "半调印刷效果",
        tech: ["点阵模式", "角度控制", "形状变化", "密度映射"],
        level: "中级"
      },
      cameraEffects: {
        name: "相机特效模拟",
        tech: ["胶片颗粒", "镜头畸变", "色差", "渐晕效果"],
        level: "中级"
      },
      pixelate: {
        name: "像素化效果",
        tech: ["区块化", "马赛克", "低分辨率模拟", "可变大小"],
        level: "基础"
      }
    },
    
    // 图像压缩与优化策略
    compressionStrategies: {
      perceptual: {
        name: "感知优化压缩",
        tech: ["视觉模型", "心理物理学", "感知掩蔽", "重要性采样"],
        level: "高级"
      },
      contentAware: {
        name: "内容感知压缩",
        tech: ["重点区域保留", "背景高压缩", "人脸检测", "细节分析"],
        level: "高级"
      },
      progressive: {
        name: "渐进式加载优化",
        tech: ["渐进式JPEG", "交错PNG", "多分辨率", "优先级加载"],
        level: "中级"
      },
      vectorConversion: {
        name: "矢量化转换",
        tech: ["轮廓跟踪", "颜色简化", "路径优化", "SVG导出"],
        level: "高级"
      },
      textureAtlas: {
        name: "纹理图集生成",
        tech: ["精灵拼接", "空间优化", "边缘扩展", "UV坐标"],
        level: "中级"
      },
      responsiveImgs: {
        name: "响应式图像集",
        tech: ["多分辨率", "srcset生成", "内容裁剪", "艺术指导"],
        level: "中级" 
      }
    },

    // 图像质量评估与分析
    qualityAssessment: {
      noiseEstimation: {
        name: "噪点评估",
        tech: ["方差分析", "频率域分析", "块差分", "多尺度噪声评估"],
        level: "高级"
      },
      blurDetection: {
        name: "模糊检测",
        tech: ["拉普拉斯算子", "梯度方差", "频率分析", "边缘清晰度"],
        level: "中级"
      },
      artifactAnalysis: {
        name: "压缩伪影分析",
        tech: ["块边缘检测", "DCT系数分析", "振铃效应检测", "伪彩分析"],
        level: "高级"
      },
      perceptualQuality: {
        name: "感知质量评分",
        tech: ["SSIM", "PSNR", "MS-SSIM", "视觉模型"],
        level: "高级"
      },
      exposureAnalysis: {
        name: "曝光分析",
        tech: ["直方图分析", "过/欠曝检测", "高光/阴影统计", "区域亮度评估"],
        level: "中级"
      }
    },
    
    // 图像对比度与细节增强
    detailEnhancement: {
      localContrast: {
        name: "局部对比度增强",
        tech: ["自适应直方图均衡化", "多尺度增强", "CLAHE", "Retinex算法"],
        level: "高级"
      },
      unsharpMask: {
        name: "锐化蒙版",
        tech: ["高斯差分", "参数化锐化", "高通滤波", "边缘保护"],
        level: "中级"
      },
      highPassSharpen: {
        name: "高通滤波锐化",
        tech: ["频域滤波", "WebGL", "canvas", "阈值控制"],
        level: "中级"
      },
      detailStructure: {
        name: "结构细节分解",
        tech: ["小波变换", "双边滤波", "引导滤波", "多尺度分解"],
        level: "高级"
      },
      microContrast: {
        name: "微对比度增强",
        tech: ["局部自适应算法", "纹理增强", "中频强化", "清晰度滤镜"],
        level: "高级"
      }
    },
    
    // 图像修复与补全
    inpainting: {
      contentAwareFill: {
        name: "内容感知填充",
        tech: ["PatchMatch", "扩散算法", "结构重建", "纹理合成"],
        level: "高级"
      },
      seamlessClone: {
        name: "无缝克隆",
        tech: ["泊松融合", "梯度域混合", "OpenCV.js", "边缘平滑"],
        level: "高级"
      },
      removeObject: {
        name: "物体移除",
        tech: ["标记区域修复", "上下文感知填充", "结构重建", "扩散算法"],
        level: "高级"
      },
      faceRetouching: {
        name: "人像修复",
        tech: ["面部识别", "皮肤平滑", "特征保留", "面部重塑"],
        level: "高级"
      },
      textureRepair: {
        name: "纹理修复",
        tech: ["纹理合成", "样本匹配", "重复图案检测", "纹理延续"],
        level: "高级"
      }
    },
    
    // 图像格式与导出工具
    exportTools: {
      animatedWebP: {
        name: "动画WebP生成",
        tech: ["帧序列", "WebP编码器", "动画参数", "压缩设置"],
        level: "中级"
      },
      avifConverter: {
        name: "AVIF转换器",
        tech: ["AVIF编码", "质量控制", "兼容性检查", "元数据保留"],
        level: "高级"
      },
      responsiveSet: {
        name: "响应式图像集生成",
        tech: ["多分辨率输出", "srcset格式", "自适应裁剪", "尺寸序列"],
        level: "中级"
      },
      iconGenerator: {
        name: "图标/favicon生成",
        tech: ["多尺寸生成", "PNG/ICO转换", "App图标集", "SVG优化"],
        level: "中级"
      },
      markdownExport: {
        name: "Markdown图像导出",
        tech: ["图像URL生成", "Data URL嵌入", "图像+描述", "备用文本"],
        level: "基础"
      }
    },
    
    // 社交媒体优化
    socialMedia: {
      profilePicture: {
        name: "头像优化",
        tech: ["智能裁剪", "尺寸适配", "平台规格", "脸部居中"],
        level: "基础"
      },
      coverGenerator: {
        name: "封面图生成",
        tech: ["多平台尺寸", "安全区域", "视觉焦点保留", "文字叠加"],
        level: "中级"
      },
      instagramFilter: {
        name: "Instagram风格滤镜",
        tech: ["预设LUT", "复古效果", "色彩分级", "胶片模拟"],
        level: "中级"
      },
      storyFormat: {
        name: "故事格式适配",
        tech: ["9:16裁剪", "动态元素", "视觉设计", "垂直内容优化"],
        level: "中级"
      },
      thumbnailOptimizer: {
        name: "缩略图优化",
        tech: ["关键内容检测", "对比度增强", "文字可读性", "点击率优化"],
        level: "中级"
      }
    },

    // 前端特定图像优化
    webOptimization: {
      lazyLoading: {
        name: "延迟加载实现",
        tech: ["交叉观察器", "占位符生成", "模糊预览", "渐进式加载"],
        level: "中级"
      },
      imagePreview: {
        name: "微型预览图",
        tech: ["极小缩略图", "模糊化处理", "数据URI", "LQIP生成"],
        level: "中级"
      },
      adaptiveSizing: {
        name: "自适应尺寸",
        tech: ["客户端尺寸检测", "尺寸查询", "动态裁剪", "响应式加载"],
        level: "中级"
      },
      cssFilterPresets: {
        name: "CSS滤镜预设",
        tech: ["filter属性组合", "动态生成", "性能优化", "交互式调整"],
        level: "基础"
      },
      dominantColorLoading: {
        name: "主色占位加载",
        tech: ["色彩提取", "背景色匹配", "过渡效果", "视觉连续性"],
        level: "基础"
      }
    },

    // 教育与可视化工具
    educational: {
      algorithmVisualizer: {
        name: "算法可视化",
        tech: ["逐步执行", "中间结果", "参数调整", "对比展示"],
        level: "中级"
      },
      kernelBuilder: {
        name: "卷积核构建器",
        tech: ["交互式矩阵", "实时预览", "预设库", "自定义内核"],
        level: "中级"
      },
      histogramInteractive: {
        name: "交互式直方图",
        tech: ["实时更新", "区间选择", "色彩通道", "分布分析"],
        level: "中级"
      },
      filterExplainer: {
        name: "滤镜原理解析",
        tech: ["步骤分解", "参数影响", "算法图解", "交互式演示"],
        level: "中级"
      },
      colorTheory: {
        name: "色彩理论工具",
        tech: ["色彩空间可视化", "色彩和谐", "对比度分析", "色彩心理学"],
        level: "中级"
      }
    },
    
    // 性能与基准测试
    performance: {
      benchmarking: {
        name: "性能基准测试",
        tech: ["时间测量", "比较分析", "瓶颈检测", "性能报告"],
        level: "中级"
      },
      processingQueue: {
        name: "处理队列优化",
        tech: ["任务调度", "优先级处理", "批量操作", "异步流程"],
        level: "高级"
      },
      memoryUsage: {
        name: "内存使用分析",
        tech: ["内存检测", "对象池", "垃圾回收优化", "内存泄漏检测"],
        level: "高级"
      },
      workerDistribution: {
        name: "Web Worker分发",
        tech: ["多线程处理", "负载均衡", "消息传递", "共享内存"],
        level: "高级"
      },
      gpuAcceleration: {
        name: "GPU加速检测",
        tech: ["能力检测", "硬件加速", "着色器优化", "回退方案"],
        level: "高级"
      }
    },
    
    // 辅助功能与无障碍
    accessibility: {
      colorBlindness: {
        name: "色盲模式",
        tech: ["色彩转换", "色盲类型", "适应性调整", "色彩强化"],
        level: "中级"
      },
      contrastEnhancer: {
        name: "对比度增强器",
        tech: ["WCAG标准", "文本可读性", "自适应对比", "无障碍检查"],
        level: "中级"
      },
      alternativeText: {
        name: "图像描述生成",
        tech: ["内容识别", "语义描述", "辅助标签", "上下文感知"],
        level: "高级"
      },
      patternRecognition: {
        name: "图案识别辅助",
        tech: ["边缘强化", "形状识别", "纹理分析", "特征突出"],
        level: "高级"
      },
      animationControl: {
        name: "动画效果控制",
        tech: ["减少运动", "速度调整", "暂停选项", "无动画模式"],
        level: "基础"
      }
    },
    
    // 图像处理工作流
    workflow: {
      batchProcessor: {
        name: "批处理工作流",
        tech: ["操作序列", "预设应用", "条件处理", "批量输出"],
        level: "中级"
      },
      macroRecorder: {
        name: "宏录制与回放",
        tech: ["操作记录", "参数保存", "序列化", "自动化执行"],
        level: "中级"
      },
      processingPipeline: {
        name: "处理管道构建",
        tech: ["可视化流程", "节点编辑", "条件分支", "数据流"],
        level: "高级"
      },
      presetManager: {
        name: "预设管理器",
        tech: ["保存/加载设置", "分类组织", "导入/导出", "云同步"],
        level: "中级"
      },
      historyTracker: {
        name: "历史记录追踪",
        tech: ["操作堆栈", "状态恢复", "分支历史", "选择性撤销"],
        level: "中级"
      }
    }
};

