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
    console.log('codec',codec);
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

  // 完全重写帧处理流程，使用分批处理替代一次性处理所有帧
  async processFrames(totalFrames, frameGenerator) {
    this.totalFrames = totalFrames;
    
    console.log(`开始分批处理总共${totalFrames}帧...`);
    
    // 每批处理的帧数，根据分辨率动态调整
    const batchSize = this.width >= 3000 ? 50 : (this.width >= 2000 ? 100 : 200);
    console.log(`分辨率${this.width}x${this.height}，使用批次大小: ${batchSize}`);
    
    const frameDuration = 1000000 / this.fps; // 微秒单位
    let lastThumbnail = null;
    
    // 分批处理所有帧
    for (let startFrame = 0; startFrame < totalFrames; startFrame += batchSize) {
      const endFrame = Math.min(startFrame + batchSize, totalFrames);
      console.log(`处理批次 ${startFrame} 到 ${endFrame-1}，共 ${endFrame - startFrame} 帧`);
      
      // 第一步：渲染当前批次的所有帧
      const batchFrames = [];
      
      for (let frameIndex = startFrame; frameIndex < endFrame; frameIndex++) {
        // 计算精确时间戳
        const timestamp = Math.round(frameIndex * frameDuration);
        
        // 渲染当前帧
        const frameData = await frameGenerator(frameIndex);
        lastThumbnail = frameData.thumbnailDataURL;
        
        // 存储帧数据和时间戳
        batchFrames.push({
          frameIndex,
          timestamp,
          duration: frameDuration,
          imageData: frameData.imageData,
          thumbnailDataURL: frameData.thumbnailDataURL
        });
      }
      
      // 第二步：立即编码当前批次的所有帧
      for (let i = 0; i < batchFrames.length; i++) {
        const frame = batchFrames[i];
        
        // 创建 VideoFrame
        const videoFrame = new VideoFrame(frame.imageData, {
          timestamp: frame.timestamp,
          duration: frame.duration
        });
        
        // 确定是否是关键帧
        const isKeyFrame = frame.frameIndex % this.keyFrameInterval === 0;
        
        // 等待编码器准备好
        while (this.videoEncoder.encodeQueueSize > 2) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        // 编码当前帧
        this.videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
        videoFrame.close();
        
        // 释放资源 - 关键步骤：手动释放不再需要的资源
        if (frame.imageData && typeof frame.imageData.close === 'function') {
          frame.imageData.close();
        }
        
        // 计算总体进度
        const progress = frame.frameIndex / totalFrames;
        updateProgress({
          frameCounter: frame.frameIndex,
          totalFrames,
          thumbnailDataURL: frame.thumbnailDataURL,
          progressCallback: this._progressCallback,
          stage: '处理中...'
        });
      }
      
      // 清空当前批次的帧数据，帮助垃圾回收
      batchFrames.length = 0;
      
      // 给系统留出时间进行垃圾回收
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // 确保所有帧都被处理
    await this.videoEncoder.flush();
    console.log('所有帧处理完成');
    
    // 最终进度更新
    updateProgress({
      frameCounter: totalFrames,
      totalFrames,
      thumbnailDataURL: lastThumbnail,
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
