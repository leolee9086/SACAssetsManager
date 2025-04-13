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

/**
 * 加载音频文件并解码
 * @param {File|string} file - 音频文件对象或路径
 * @returns {Promise<{audioContext: AudioContext, audioBuffer: AudioBuffer}>} 音频上下文和解码后的音频缓冲区
 */
export async function loadAudio(file) {
  // 创建AudioContext
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // 从File对象或文件路径加载
  let arrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else if (typeof file === 'string') {
    // 从路径加载
    const response = await fetch(file);
    arrayBuffer = await response.arrayBuffer();
  } else {
    throw new Error('无效的音频文件');
  }
  
  // 解码音频
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return { audioContext, audioBuffer };
}

/**
 * 处理音频(截断或循环)
 * @param {AudioBuffer} audioBuffer - 原始音频缓冲区
 * @param {Object} options - 处理选项
 * @returns {Promise<AudioBuffer>} 处理后的音频缓冲区
 */
export async function prepareAudio(audioBuffer, options) {
  const { needTrimAudio, loopAudio, trimDuration, loopCount, videoLength, volume = 1.0 } = options;
  
  // 创建离线音频上下文用于处理音频
  const audioContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.ceil(videoLength * audioBuffer.sampleRate),
    audioBuffer.sampleRate
  );
  
  // 创建音频源
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  if (loopAudio) {
    // 循环播放音频
    source.loop = true;
    source.loopEnd = audioBuffer.duration;
    // 设置循环次数足够覆盖视频时长
    source.start(0, 0, videoLength);
  } else if (needTrimAudio) {
    // 截断音频
    source.start(0, 0, trimDuration);
  } else {
    // 正常播放
    source.start(0);
  }
  
  // 加入音量控制
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // 渲染音频
  const processedBuffer = await audioContext.startRendering();
  return processedBuffer;
}


export class VideoEncoderManager {
  constructor(options) {
    const { width, height, fps, format, audioConfig = null } = options;
    
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.format = format;
    this.audioConfig = audioConfig;
    
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
      quality: this.quality,
      audioConfig: this.audioConfig
    });
    
    this.initializeEncoder(this.bitrate, this.keyFrameInterval, this.quality);
    
    // 如果有音频配置，初始化音频编码器
    if (this.audioConfig && this.audioConfig.audioBuffer) {
      this.initializeAudioEncoder();
    }
    
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

  initializeAudioEncoder() {
    if (!this.audioConfig || !this.audioConfig.audioBuffer) {
      console.warn('没有提供音频缓冲区，跳过音频编码器初始化');
      return;
    }

    // 暂时不初始化AudioEncoder，等到processAudio中处理完音频后再初始化
    // 这样可以确保使用处理后的音频参数
    
    // 存储音频信息以便后续处理
    this.audioInfo = {
      buffer: this.audioConfig.audioBuffer,
      processedBuffer: null,
      duration: this.audioConfig.audioBuffer.duration,
      sampleRate: this.audioConfig.audioBuffer.sampleRate,
      numberOfChannels: this.audioConfig.audioBuffer.numberOfChannels
    };
  }

  // 处理音频
  async processAudio(videoDuration) {
    if (!this.audioInfo || !this.audioInfo.buffer) {
      console.log('没有音频需要处理');
      return false;
    }
    
    const originalBuffer = this.audioInfo.buffer;
    console.log(`开始处理音频，视频时长: ${videoDuration}秒，音频时长: ${originalBuffer.duration}秒`);
    console.log('原始音频数据:', {
      duration: originalBuffer.duration,
      numberOfChannels: originalBuffer.numberOfChannels,
      sampleRate: originalBuffer.sampleRate,
      length: originalBuffer.length
    });
    
    // 检查原始音频通道数
    if (originalBuffer.numberOfChannels === 0) {
      console.error('原始音频无效: 通道数为0');
      return false;
    }
    
    try {
      // 直接复制原始音频数据来避免处理中可能发生的问题
      // 创建新的离线音频上下文
      const offlineCtx = new OfflineAudioContext(
        originalBuffer.numberOfChannels,
        Math.ceil(videoDuration * originalBuffer.sampleRate),
        originalBuffer.sampleRate
      );
      
      // 创建音频源节点
      const sourceNode = offlineCtx.createBufferSource();
      sourceNode.buffer = originalBuffer;
      
      // 音量控制
      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = this.audioConfig.volume || 0.8;
      
      // 连接节点
      sourceNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      
      // 声明音频播放模式：循环还是截断
      const isLoop = originalBuffer.duration < videoDuration;
      if (isLoop) {
        sourceNode.loop = true;
        sourceNode.loopEnd = originalBuffer.duration;
        console.log(`音频较短(${originalBuffer.duration.toFixed(2)}秒)，将循环播放到视频长度(${videoDuration.toFixed(2)}秒)`);
      } else {
        console.log(`音频较长(${originalBuffer.duration.toFixed(2)}秒)，将截断到视频长度(${videoDuration.toFixed(2)}秒)`);
      }
      
      // 开始播放，限制时长为视频时长
      sourceNode.start(0, 0, videoDuration);
      
      // 渲染音频
      console.log('开始渲染音频...');
      const processedBuffer = await offlineCtx.startRendering();
      
      // 再次验证处理后的音频
      console.log('处理后的音频数据:', {
        duration: processedBuffer.duration,
        numberOfChannels: processedBuffer.numberOfChannels,
        sampleRate: processedBuffer.sampleRate,
        length: processedBuffer.length
      });
      
      // 安全检查
      if (!processedBuffer || processedBuffer.numberOfChannels === 0) {
        console.error('音频处理失败: 处理后的音频无效或通道数为0');
        
        // 如果处理后的音频无效，尝试直接使用原始音频
        console.log('尝试直接使用原始音频...');
        const safeBuffer = originalBuffer;
        
        if (safeBuffer.numberOfChannels === 0) {
          console.error('无法处理的音频: 原始音频和处理后的音频都没有有效通道');
          return false;
        }
        
        // 初始化音频编码器 - 使用安全有效的音频数据
        this.setupAudioEncoder(safeBuffer);
        return this.encodeAudioBuffer(safeBuffer, videoDuration);
      }
      
      // 使用处理后的音频
      this.setupAudioEncoder(processedBuffer);
      return this.encodeAudioBuffer(processedBuffer, videoDuration);
      
    } catch (error) {
      console.error('音频处理失败:', error);
      console.error('错误堆栈:', error.stack);
      
      // 如果处理失败，尝试直接使用原始音频
      try {
        console.log('处理失败，尝试直接使用原始音频...');
        // 初始化音频编码器 - 使用原始音频数据
        this.setupAudioEncoder(originalBuffer);
        return this.encodeAudioBuffer(originalBuffer, videoDuration);
      } catch (fallbackError) {
        console.error('使用原始音频也失败:', fallbackError);
        return false;
      }
    }
  }
  
  // 设置音频编码器
  setupAudioEncoder(audioBuffer) {
    // 确保音频缓冲区有效
    if (!audioBuffer || audioBuffer.numberOfChannels === 0) {
      throw new Error('无效的音频缓冲区: 缺少通道数据');
    }
    
    try {
      // 初始化音频编码器
      this.audioEncoder = new AudioEncoder({
        output: (chunk, meta) => {
          if (this.muxer) {
            this.muxer.addAudioChunk(chunk, meta);
          } else {
            console.error('音频块无法添加: muxer不可用');
          }
        },
        error: (e) => {
          console.error('AudioEncoder错误:', e);
          console.error('错误堆栈:', e.stack);
        }
      });
      
      // 使用与原始实现完全相同的编码器配置
      const codec = this.format === 'mp4' ? 'mp4a.40.2' : 'opus';
      
      // 强制确保通道数至少为1，最多为2（大多数编码器支持的最大值）
      const safeChannelCount = Math.min(2, Math.max(1, audioBuffer.numberOfChannels));
      
      // 根据不同编解码器设置适当的比特率
      const bitrate = codec === 'aac' ? 192000 : 128000;
      
      // 配置编码器
      const config = {
        codec,
        numberOfChannels: safeChannelCount,
        sampleRate: audioBuffer.sampleRate,
        bitrate
      };
      
      this.audioEncoder.configure(config);
      
      console.log('音频编码器已配置:', {
        codec,
        numberOfChannels: safeChannelCount,
        sampleRate: audioBuffer.sampleRate,
        bitrate
      });
      
      return true;
    } catch (error) {
      console.error('音频编码器设置失败:', error);
      console.error('错误堆栈:', error.stack);
      
      // 尝试创建兼容模式的编码器
      try {
        console.log('尝试使用兼容模式设置音频编码器...');
        const codec = this.format === 'mp4' ? 'mp4a.40.2' : 'opus';
        
        this.audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            if (this.muxer) this.muxer.addAudioChunk(chunk, meta);
          },
          error: (e) => console.error('兼容模式AudioEncoder错误:', e)
        });
        
        this.audioEncoder.configure({
          codec,
          numberOfChannels: 1, // 最基础的单声道配置
          sampleRate: audioBuffer.sampleRate,
          bitrate: 128000
        });
        
        console.log('兼容模式音频编码器已配置');
        return true;
      } catch (fallbackError) {
        console.error('兼容模式音频编码器设置也失败:', fallbackError);
        this.audioEncoder = null;
        return false;
      }
    }
  }
  
  // 编码音频缓冲区
  async encodeAudioBuffer(audioBuffer, videoDuration) {
    console.log('开始编码音频数据...');
    
    // 分块处理音频数据
    const audioChunkSize = Math.floor(audioBuffer.sampleRate * 0.1); // 100ms 数据块
    const totalAudioChunks = Math.ceil(audioBuffer.length / audioChunkSize);
    
    // 强制确保通道数至少为1
    const safeChannelCount = Math.max(1, audioBuffer.numberOfChannels);
    
    for (let chunkIndex = 0; chunkIndex < totalAudioChunks; chunkIndex++) {
      const offset = chunkIndex * audioChunkSize;
      const length = Math.min(audioChunkSize, audioBuffer.length - offset);
      
      if (length <= 0) break;
      
      try {
        // 创建音频帧数据 - 完全按照原始实现方式
        const audioFrameData = new Float32Array(length * safeChannelCount);
        
        // 填充音频数据 - 确保有足够的通道数据
        for (let channel = 0; channel < safeChannelCount; channel++) {
          // 如果请求的通道超出可用通道，使用第一个通道的数据
          const actualChannel = Math.min(channel, audioBuffer.numberOfChannels - 1);
          const channelData = audioBuffer.getChannelData(actualChannel);
          
          for (let i = 0; i < length; i++) {
            audioFrameData[channel * length + i] = channelData[offset + i];
          }
        }
        
        // 计算时间戳
        const audioTimestamp = Math.floor((offset / audioBuffer.sampleRate) * 1000000);
        
        // 创建AudioData对象
        const audioFrame = new AudioData({
          format: 'f32-planar',
          sampleRate: audioBuffer.sampleRate,
          numberOfFrames: length,
          numberOfChannels: safeChannelCount,
          timestamp: audioTimestamp,
          data: audioFrameData
        });
        console.log('audioFrame',audioFrame,audioFrame.numberOfChannels);
        // 编码音频帧
        this.audioEncoder.encode(audioFrame);
        
        // 释放音频帧资源
        //audioFrame.close();
        
        // 更新进度
        if (chunkIndex % 10 === 0 || chunkIndex === totalAudioChunks - 1) {
          updateProgress({
            frameCounter: chunkIndex + 1,
            totalFrames: totalAudioChunks,
            progressCallback: this._progressCallback,
            stage: `音频编码: ${Math.round((chunkIndex + 1) / totalAudioChunks * 100)}%`
          });
          
          console.log(`音频编码进度: ${chunkIndex + 1}/${totalAudioChunks} (${Math.round((chunkIndex + 1) / totalAudioChunks * 100)}%)`);
        }
      } catch (e) {
        console.error(`音频帧 ${chunkIndex} 处理失败:`, e);
        if (chunkIndex === 0) {
          // 如果第一个帧就失败，可能是音频数据基本结构有问题
          console.error('首个音频帧处理失败，尝试使用假帧继续...');
          
          // 创建一个静音帧作为替代
          try {
            const silentData = new Float32Array(length * safeChannelCount).fill(0);
            const silentFrame = new AudioData({
              format: 'f32-planar',
              sampleRate: audioBuffer.sampleRate,
              numberOfFrames: length,
              numberOfChannels: safeChannelCount,
              timestamp: 0,
              data: silentData
            });
            
            this.audioEncoder.encode(silentFrame);
            silentFrame.close();
            console.log('已添加静音帧作为替代');
          } catch (silentError) {
            console.error('创建静音帧也失败:', silentError);
            return false;
          }
        }
        // 其他帧处理失败继续处理
      }
      
      // 等待编码器准备好
      while (this.audioEncoder && this.audioEncoder.encodeQueueSize > 2) {
        await new Promise(r => setTimeout(r, 1));
      }
    }
    
    // 完成音频编码
    if (this.audioEncoder) {
      await this.audioEncoder.flush();
      console.log('音频编码完成');
      return true;
    } else {
      console.error('音频编码器不可用，无法完成编码');
      return false;
    }
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
        
        try {
          // 创建 VideoFrame
          // 检查imageData的类型，以便正确创建VideoFrame
          let videoFrame;
          
          if (frame.imageData instanceof HTMLCanvasElement) {
            // 如果是Canvas元素，直接从Canvas创建VideoFrame
            videoFrame = new VideoFrame(frame.imageData, {
              timestamp: frame.timestamp,
              duration: frame.duration
            });
          } else if (frame.imageData instanceof ImageData) {
            // 如果是ImageData对象，从ImageData创建VideoFrame
            videoFrame = new VideoFrame(frame.imageData, {
              timestamp: frame.timestamp,
              duration: frame.duration
            });
          } else if (frame.imageData instanceof ImageBitmap) {
            // 如果是ImageBitmap，从ImageBitmap创建VideoFrame
            videoFrame = new VideoFrame(frame.imageData, {
              timestamp: frame.timestamp,
              duration: frame.duration
            });
          } else {
            console.error('无法识别的图像数据类型:', typeof frame.imageData, frame.imageData);
            continue; // 跳过此帧
          }
          
          // 确定是否是关键帧
          const isKeyFrame = frame.frameIndex % this.keyFrameInterval === 0;
          
          // 等待编码器准备好
          while (this.videoEncoder.encodeQueueSize > 2) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // 编码当前帧
          this.videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
          videoFrame.close();
        } catch (frameError) {
          console.error(`处理第${frame.frameIndex}帧时出错:`, frameError);
          // 继续处理下一帧
        }
        
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
    
    // 如果有音频，处理音频
    if (this.audioConfig && this.audioConfig.audioBuffer) {
      const videoDuration = totalFrames / this.fps;
      await this.processAudio(videoDuration);
    }
    
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
    
    // 如果存在音频编码器，确保音频编码器也已刷新
    if (this.audioEncoder) {
      await this.audioEncoder.flush();
    }
    
    this.muxer.finalize();
    const buffer = this.muxer.target.buffer;
    const mimeType = this.format === 'mp4' ? 'video/mp4' : 'video/webm';
    return new Blob([buffer], { type: mimeType });
  }
}
