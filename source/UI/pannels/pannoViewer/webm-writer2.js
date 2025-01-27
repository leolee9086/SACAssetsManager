import { WebMMuxer } from './webmMuxer.js';

export class WebMWriter {
    constructor(options = {}) {
      this.width = options.width || 2560;
      this.height = options.height || 1440;
      this.codec = options.codec || 'VP8';
      this.frames = [];
      this.keyFrameInterval = options.keyFrameInterval || 30;
      this.bitrate = options.bitrate || 2500000;
      this.encoder = null;
      this.muxer = null;
      this.initPromise = this.initEncoderAndMuxer();
    }
  
    async initEncoder() {
      // 检查浏览器支持的编码器
      const supportedCodecs = await VideoEncoder.isConfigSupported({
        codec: 'vp09.00.10.08', // VP9 Profile 0, Level 1
        width: this.width,
        height: this.height,
        bitrate: this.bitrate
      });
  
      if (!supportedCodecs.supported) {
        // 尝试回退到VP8
        this.codec = 'vp8';
        const vp8Supported = await VideoEncoder.isConfigSupported({
          codec: 'vp8',
          width: this.width,
          height: this.height,
          bitrate: this.bitrate
        });
  
        if (!vp8Supported.supported) {
          throw new Error('浏览器不支持VP8/VP9编码器');
        }
      }
  
      // 初始化视频编码器
      const config = {
        codec: this.codec === 'VP9' ? 'vp09.00.10.08' : 'vp8',
        width: this.width,
        height: this.height,
        bitrate: this.bitrate,
        framerate: 30,
        latencyMode: 'quality'
      };
  
      // 创建视频编码器
      this.encoder = new VideoEncoder({
        output: (chunk, metadata) => {
          this.frames.push({ chunk, metadata });
        },
        error: (e) => {
          console.error('编码器错误:', e);
        }
      });
  
      // 配置编码器
      await this.encoder.configure(config);
      console.log(this.encoder)
    }
  
    async initEncoderAndMuxer() {
      await this.initEncoder();
      
      // 修复muxer初始化参数
      this.muxer = new WebMMuxer({
        target: 'buffer',
        video: {
          codec: this.codec === 'VP8' ? 'VP8' : 'VP9',
          width: this.width,
          height: this.height,
          frameRate: 30
        }
      });
      // 添加await确保初始化完成
      await this.muxer.init();
    }
  
    async addFrame(bitmap, options = {}) {
    
      // 等待编码器初始化完成
      await this.initPromise;
     console.log(bitmap, options)
      // 从options中获取时间戳和duration
      const { timestamp = 0, duration = 1000000 / 30, type = 'delta' } = options;

      // 确保bitmap的宽高与编码器配置一致
      if (bitmap.width !== this.width || bitmap.height !== this.height) {
        console.warn(`Bitmap尺寸(${bitmap.width}x${bitmap.height})与编码器配置(${this.width}x${this.height})不匹配`);
        // 可以在这里添加缩放逻辑或直接抛出错误
        throw new Error('输入帧尺寸与编码器配置不匹配');
      }

      // 创建VideoFrame
      const videoFrame = new VideoFrame(bitmap, {
        timestamp,
        duration
      });

      // 设置关键帧
      const keyFrame = type === 'key' || this.frames.length % this.keyFrameInterval === 0;
      console.log(videoFrame)
      // 编码帧
      this.encoder.encode(videoFrame, { keyFrame });

      // 立即关闭VideoFrame
      videoFrame.close();
    }
  
    async complete() {
      await this.initPromise;
      await this.encoder.flush();

      // 修复chunk数据结构
      const chunks = this.frames.map(f => ({
        data: f.chunk,
        timestamp: f.chunk.timestamp || 0,  // 确保时间戳存在
        duration: f.chunk.duration || 33333, // 添加默认duration
        isKeyframe: f.chunk.type === 'key'  // 使用标准关键帧标识
      }));

      // 按时间戳排序（修复负数时间戳问题）
      chunks.sort((a, b) => a.timestamp - b.timestamp);

      // 使用正确的方法写入chunks
      for (const chunk of chunks) {
        this.muxer.addVideoChunk(chunk);
      }

      // 添加延时确保数据写入完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const webmData = this.muxer.finalize();
      
      // 创建Blob
      const blob = new Blob([webmData], {
        type: 'video/webm'
      });

      // 清理资源
      this.encoder.close();
      this.frames = [];
      this.muxer = null;
      this.writer = null;

      return blob;
    }
  
    cancel() {
      if (this.encoder) {
        this.encoder.close();
      }
      this.frames = [];
    }
  }