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

async function createTextVideo() {
  // 视频配置
  const config = {
    width: 1920,
    height: 1080,
    fps: 30,
    format: 'mp4',
    quality: 0.9
  };

  // 滕王阁序文本
  const textContent = `豫章故郡，洪都新府。星分翼轸，地接衡庐。
  襟三江而带五湖，控蛮荆而引瓯越。
  物华天宝，龙光射牛斗之墟；人杰地灵，徐孺下陈蕃之榻。
  雄州雾列，俊采星驰。台隍枕夷夏之交，宾主尽东南之美。
  都督阎公之雅望，棨戟遥临；宇文新州之懿范，襜帷暂驻。
  十旬休假，胜友如云；千里逢迎，高朋满座。
  腾蛟起凤，孟学士之词宗；紫电青霜，王将军之武库。
  家君作宰，路出名区；童子何知，躬逢胜饯。`.split('；');

  const encoder = new VideoEncoderManager(config);

  // 创建帧生成器
  const frameGenerator = async (frameIndex) => {
    // 使用普通 Canvas 代替 OffscreenCanvas
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');

    // 设置背景
    ctx.fillStyle = '#F5F5DC';  // 米色背景
    ctx.fillRect(0, 0, config.width, config.height);

    // 设置文字样式
    ctx.fillStyle = '#000000';
    ctx.font = '48px KaiTi';  // 楷体
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 计算当前应显示的文本
    const currentTextIndex = Math.floor(frameIndex / (config.fps * 2));  // 每句显示2秒
    const currentText = currentTextIndex < textContent.length ? textContent[currentTextIndex] : '';

    // 添加文字渐入效果
    const fadeInProgress = (frameIndex % (config.fps * 2)) / config.fps;
    ctx.globalAlpha = Math.min(1, fadeInProgress);

    // 绘制文字
    const lines = currentText.split('，');
    lines.forEach((line, i) => {
      ctx.fillText(
        line, 
        config.width / 2,
        config.height / 2 - (lines.length - 1) * 30 + i * 60
      );
    });

    // 创建缩略图
    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = 192;
    thumbnailCanvas.height = 108;
    const thumbnailCtx = thumbnailCanvas.getContext('2d');
    thumbnailCtx.drawImage(canvas, 0, 0, 192, 108);
    const thumbnailBlob = await new Promise(resolve => thumbnailCanvas.toBlob(resolve));
    const thumbnailDataURL = await blobToDataURL(thumbnailBlob);

    return { 
      imageData: canvas, // 直接返回canvas元素
      thumbnailDataURL 
    };
  };

  // 计算总帧数（每句话2秒）
  const totalFrames = textContent.length * config.fps * 2;

  // 开始渲染
  await encoder.processFrames(totalFrames, frameGenerator);

  // 完成编码并获取视频文件
  const videoBlob = await encoder.finalize();
  return videoBlob;
}

// 辅助函数：将Blob转换为DataURL
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// 使用示例
async function main() {
  try {
    console.log('开始生成视频...');
    const videoBlob = await createTextVideo();
    
    // 创建视频下载链接
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '滕王阁序.mp4';
    a.click();
    
    console.log('视频生成完成！');
  } catch (error) {
    console.error('视频生成失败：', error);
  }
} 

await main()