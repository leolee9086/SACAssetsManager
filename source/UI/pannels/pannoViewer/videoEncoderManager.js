import { createMuxer, ENCODER_CONFIG } from './videoMuxer.js';

// 工具函数
export function updateProgress({
  frameCounter,
  totalFrames,
  thumbnailDataURL,
  progressCallback
}) {
  const progress = Math.min(1, frameCounter / totalFrames);
  let stage = '渲染中...';
  if (frameCounter === 0) stage = '初始化中...';
  if (frameCounter >= totalFrames - 1) stage = '编码中...';

  if (progressCallback) {
    progressCallback({
      progress,
      currentFrame: frameCounter,
      totalFrames,
      stage,
      frameImage: thumbnailDataURL
    });
  }
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
    const {
      width,
      height,
      fps,
      format = 'mp4',
      bitrate = format === 'mp4' ? ENCODER_CONFIG.MP4_BITRATE : ENCODER_CONFIG.WEBM_BITRATE,
      keyFrameInterval = ENCODER_CONFIG.KEYFRAME_INTERVAL[format](fps),
      quality = ENCODER_CONFIG.QUALITY
    } = options;

    this.width = width;
    this.height = height;
    this.fps = fps;
    this.format = format;
    this.frameDuration = 1000000 / fps; // 微秒
    this.frameQueue = new AdaptiveFrameQueue(10, 5, 60);
    this.isEncoding = false;
    this.encodingStats = {
      totalFramesProcessed: 0,
      startTime: 0,
      lastProgressUpdate: 0,
      averageEncodingTime: 0
    };
    
    this.initializeMuxer({
      format,
      width,
      height,
      fps,
      bitrate,
      keyFrameInterval,
      quality
    });
    
    this.initializeEncoder(bitrate, keyFrameInterval, quality);
  }

  initializeMuxer(config) {
    this.muxer = createMuxer(config);
  }

  initializeEncoder(bitrate, keyFrameInterval, quality) {
    const codec = this.format === 'mp4' ? 'avc1.640033' : 'vp09.00.10.08';
    
    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
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

  async addFrame(imageData, thumbnailDataURL, frameIndex) {
    await this.frameQueue.enqueue({
      imageData,
      thumbnailDataURL,
      frameIndex
    });
  }

  async encode(frameData) {
    const videoFrame = new VideoFrame(frameData.imageData, {
      timestamp: frameData.frameIndex * this.frameDuration,
      duration: this.frameDuration
    });

    try {
      await this.videoEncoder.encode(videoFrame, {
        keyFrame: frameData.frameIndex % ENCODER_CONFIG.KEYFRAME_INTERVAL[this.format](this.fps) === 0
      });
    } finally {
      videoFrame.close();
    }
  }

  async startEncoding(totalFrames) {
    if (this.isEncoding) return;
    this.isEncoding = true;
    this.encodingStats.startTime = Date.now();
    
    try {
      let encodedFrames = 0;
      while (encodedFrames < totalFrames || this.frameQueue.length > 0) {
        const frameData = this.frameQueue.dequeue();
        if (frameData) {
          const encodeStartTime = Date.now();
          await this.encode(frameData);
          
          // 更新编码统计
          const encodingTime = Date.now() - encodeStartTime;
          this.encodingStats.averageEncodingTime = 
            (this.encodingStats.averageEncodingTime * encodedFrames + encodingTime) / (encodedFrames + 1);
          
          encodedFrames++;
          this.encodingStats.totalFramesProcessed = encodedFrames;
          
          // 定期输出性能统计
          if (Date.now() - this.encodingStats.lastProgressUpdate > 1000) {
            this.logEncodingStats(totalFrames);
            this.encodingStats.lastProgressUpdate = Date.now();
          }
        } else {
          // 动态调整等待时间
          const waitTime = Math.max(1, this.encodingStats.averageEncodingTime / 4);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } finally {
      this.isEncoding = false;
      this.logEncodingStats(totalFrames, true);
    }
  }

  logEncodingStats(totalFrames, isFinal = false) {
    const elapsedTime = (Date.now() - this.encodingStats.startTime) / 1000;
    const fps = this.encodingStats.totalFramesProcessed / elapsedTime;
    const queueSize = this.frameQueue.length;
    const queueCapacity = this.frameQueue.capacity;
    
    console.log(`编码统计:
      进度: ${this.encodingStats.totalFramesProcessed}/${totalFrames} (${((this.encodingStats.totalFramesProcessed/totalFrames)*100).toFixed(1)}%)
      平均编码时间: ${this.encodingStats.averageEncodingTime.toFixed(1)}ms
      编码FPS: ${fps.toFixed(1)}
      队列状态: ${queueSize}/${queueCapacity}
      ${isFinal ? '总耗时: ' + elapsedTime.toFixed(1) + '秒' : ''}
    `);
  }

  async processFrames(totalFrames, frameGenerator) {
    // 并行处理渲染和编码
    const encodingPromise = this.startEncoding(totalFrames);
    const renderingPromise = this.renderFrames(totalFrames, frameGenerator);
    
    await Promise.all([encodingPromise, renderingPromise]);
  }

  async renderFrames(totalFrames, frameGenerator) {
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const { imageData, thumbnailDataURL } = await frameGenerator(frameIndex);
      await this.addFrame(imageData, thumbnailDataURL, frameIndex);
    }
  }

  async finalize() {
    await this.videoEncoder.flush();
    this.muxer.finalize();
    const buffer = this.muxer.target.buffer;
    const mimeType = this.format === 'mp4' ? 'video/mp4' : 'video/webm';
    return new Blob([buffer], { type: mimeType });
  }
}
