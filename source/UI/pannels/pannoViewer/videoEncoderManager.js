import { createMuxer, ENCODER_CONFIG } from './videoMuxer.js';

// 统一的进度更新函数
export function updateProgress({
  frameCounter,
  totalFrames,
  thumbnailDataURL,
  progressCallback,
  stage = '渲染中...'
}) {
  if (!progressCallback) return;
  
  // 确保进度值在0到1之间
  const progress = Math.min(1, Math.max(0, frameCounter / totalFrames));
  
  progressCallback({
    progress,
    currentFrame: frameCounter,
    totalFrames,
    stage,
    frameImage: thumbnailDataURL
  });
}

// 添加自适应队列类
class AdaptiveFrameQueue {
  constructor(initialSize = 10, minSize = 5, maxSize = 60) {
    this.queue = [];
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.currentMaxSize = initialSize;
    this.lastProcessTime = Date.now();
    this.processingTimes = [];
  }

  async enqueue(frameData) {
    while (this.queue.length >= this.currentMaxSize) {
      const waitTime = this.calculateWaitTime();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.adjustQueueSize();
    }
    this.queue.push(frameData);
  }

  dequeue() {
    if (this.queue.length === 0) return null;
    const startTime = Date.now();
    const frameData = this.queue.shift();
    const processTime = Date.now() - startTime;
    
    this.processingTimes.push(processTime);
    if (this.processingTimes.length > 10) {
      this.processingTimes.shift();
    }
    
    this.lastProcessTime = Date.now();
    return frameData;
  }

  calculateWaitTime() {
    const avgProcessTime = this.getAverageProcessingTime();
    return Math.max(1, Math.min(avgProcessTime / 2, 100));
  }

  getAverageProcessingTime() {
    if (this.processingTimes.length === 0) return 10;
    return this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  adjustQueueSize() {
    const avgProcessTime = this.getAverageProcessingTime();
    const queueUtilization = this.queue.length / this.currentMaxSize;
    
    if (queueUtilization > 0.8 && avgProcessTime < 50) {
      // 队列接近满且处理速度快，增加容量
      this.currentMaxSize = Math.min(this.maxSize, this.currentMaxSize + 5);
    } else if (queueUtilization < 0.3 && avgProcessTime > 100) {
      // 队列较空且处理速度慢，减少容量
      this.currentMaxSize = Math.max(this.minSize, this.currentMaxSize - 2);
    }
  }

  get length() {
    return this.queue.length;
  }

  get capacity() {
    return this.currentMaxSize;
  }
}

export class VideoEncoderManager {
  constructor(options) {
    const { width, height, fps, format } = options;
    
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.format = format;
    
    // 计算编码器配置
    this.bitrate = this.format === 'mp4' 
      ? ENCODER_CONFIG.MP4_BITRATE 
      : ENCODER_CONFIG.WEBM_BITRATE;
    
    this.keyFrameInterval = ENCODER_CONFIG.KEYFRAME_INTERVAL[this.format](this.fps);
    this.quality = ENCODER_CONFIG.QUALITY;
    
    // 初始化编码器和混流器
    this.initializeMuxer({
      format: this.format,
      width: this.width,
      height: this.height,
      fps: this.fps,
      bitrate: this.bitrate,
      keyFrameInterval: this.keyFrameInterval,
      quality: this.quality
    });
    
    this.initializeEncoder(this.bitrate, this.keyFrameInterval, this.quality);
    
    // 替换自适应队列为确定性帧缓冲区
    this.frameBuffer = [];
    this.currentFrameIndex = 0;
    this.totalFrames = 0;
  }

  initializeMuxer(config) {
    this.muxer = createMuxer(config);
  }

  initializeEncoder(bitrate, keyFrameInterval, quality) {
    const codec = this.format === 'mp4' ? 'avc1.640033' : 'vp09.00.10.08';
    
    // 创建同步处理队列
    this.encodingQueue = [];
    this.isProcessingQueue = false;
    
    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        // 确保按顺序添加到muxer
        this.muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => console.error('VideoEncoder error:', e)
    });

    this.videoEncoder.configure({
      codec,
      width: this.width,
      height: this.height,
      bitrate,
      framerate: this.fps,
      quality,
      latencyMode: 'quality',
    });
  }

  // 完全重写帧处理流程，确保确定性
  async processFrames(totalFrames, frameGenerator) {
    this.totalFrames = totalFrames;
    
    // 第一步：预渲染所有帧并存储
    console.log('开始渲染所有帧...');
    const allFrames = [];
    const frameDuration = 1000000 / this.fps; // 微秒单位
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // 计算精确时间戳
      const timestamp = Math.round(frameIndex * frameDuration);
      
      // 渲染当前帧
      const frameData = await frameGenerator(frameIndex);
      
      // 存储帧数据和时间戳
      allFrames.push({
        frameIndex,
        timestamp,
        duration: frameDuration,
        imageData: frameData.imageData,
        thumbnailDataURL: frameData.thumbnailDataURL
      });
      
      // 更新进度信息不在这里处理，由frameGenerator负责
    }
    
    console.log('所有帧渲染完成，开始编码...');
    
    // 第二步：按顺序编码所有帧
    for (let i = 0; i < allFrames.length; i++) {
      const frame = allFrames[i];
      
      // 创建 VideoFrame
      const videoFrame = new VideoFrame(frame.imageData, {
        timestamp: frame.timestamp,
        duration: frame.duration
      });
      
      // 确定是否是关键帧
      const isKeyFrame = i % this.keyFrameInterval === 0;
      
      // 等待编码器准备好
      while (this.videoEncoder.encodeQueueSize > 2) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // 编码当前帧
      this.videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();
      
      // 更新进度 - 编码阶段
      // 编码阶段的进度从50%开始，到100%结束
      const encodingProgress = 0.5 + (i / allFrames.length) * 0.5;
      updateProgress({
        frameCounter: Math.floor(encodingProgress * totalFrames),
        totalFrames,
        thumbnailDataURL: frame.thumbnailDataURL,
        progressCallback: this._progressCallback,
        stage: '编码中...'
      });
    }
    
    // 确保所有帧都被处理
    await this.videoEncoder.flush();
    console.log('所有帧编码完成');
    
    // 最终进度更新
    updateProgress({
      frameCounter: totalFrames,
      totalFrames,
      thumbnailDataURL: allFrames[allFrames.length - 1]?.thumbnailDataURL,
      progressCallback: this._progressCallback,
      stage: '编码完成'
    });
    
    return true;
  }

  // 添加进度回调设置方法
  setProgressCallback(callback) {
    this._progressCallback = callback;
  }

  async finalize() {
    // 确保编码器已刷新
    await this.videoEncoder.flush();
    this.muxer.finalize();
    const buffer = this.muxer.target.buffer;
    const mimeType = this.format === 'mp4' ? 'video/mp4' : 'video/webm';
    return new Blob([buffer], { type: mimeType });
  }
}
