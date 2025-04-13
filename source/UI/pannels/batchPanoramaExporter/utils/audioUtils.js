/**
 * 批量全景导出组件 - 音频处理工具函数
 */

// 添加静态导入
import { MP4Muxer, MP4ArrayBufferTarget, Muxer, ArrayBufferTarget } from '../../../../../src/toolBox/base/useDeps/useMuxer/useVideoMuxer.js';

/**
 * 加载音频文件并解码
 * @param {File|string} file - 音频文件对象或路径
 * @returns {Promise<{audioContext: AudioContext, audioBuffer: AudioBuffer}>} 音频上下文和解码后的音频缓冲区
 */
export async function loadAudio(file) {
  // 创建AudioContext
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log(file)
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
 * 根据适配模式处理音频与视频时长关系
 * @param {AudioBuffer} audioBuffer - 音频缓冲区
 * @param {Object} profile - 视频配置信息
 * @returns {Object} 处理后的音频选项
 */
export function processAudioForVideo(audioBuffer, profile) {
  const audioLength = audioBuffer.duration; // 音频时长(秒)
  let videoLength = profile.duration; // 原始视频时长
  let rotations = profile.rotations; // 原始旋转圈数
  
  // 记录原始参数用于调试
  console.log(`音频处理 - 原始参数: 音频长度=${audioLength.toFixed(2)}秒, 视频长度=${videoLength}秒, 旋转圈数=${rotations}`);
  
  // 数据有效性检查
  if (!audioBuffer || audioLength <= 0) {
    console.error('无效的音频缓冲区或音频长度为0');
    return {
      needTrimAudio: false,
      audioPlaybackRate: 1.0,
      videoLength: videoLength,
      audioLength: 0,
      error: '无效音频'
    };
  }
  
  // 确保音频设置存在
  if (!profile.audio) {
    console.error('配置中缺少音频设置');
    return {
      needTrimAudio: false,
      audioPlaybackRate: 1.0,
      videoLength: videoLength,
      audioLength: audioLength,
      error: '配置中缺少音频设置'
    };
  }
  
  if (profile.audio.adaptMode === 'fitAudio') {
    // 音频适配模式: 调整视频时长以匹配音频
    // 确保有效性
    if (audioLength <= 0) {
      console.error('音频长度无效，使用原始视频长度');
      return {
        needTrimAudio: false,
        audioPlaybackRate: 1.0,
        videoLength: videoLength,
        audioLength: 0,
        error: '音频长度无效'
      };
    }
    
    // 记录原始参数
    const originalDuration = videoLength;
    const originalRotations = rotations;
    
    // 使用音频时长作为视频时长
    videoLength = audioLength;
    
    // 使用配置的旋转圈数
    rotations = profile.audio.rotationsForAudio || 2;
    
    console.log(`适配音频时长模式: 音频长度=${audioLength.toFixed(2)}秒, 旋转圈数=${rotations}`);
    
    // 直接修改原始profile对象 - 这是关键步骤
    const newDuration = Math.ceil(videoLength);
    profile.duration = newDuration;
    profile.rotations = rotations;
    
    // 额外调试，确认参数已更新
    console.log(`检查参数更新: ${profile.duration === newDuration ? '时长已更新' : '时长未更新!'}`);
    console.log(`检查参数更新: ${profile.rotations === rotations ? '旋转圈数已更新' : '旋转圈数未更新!'}`);
    
    // 记录参数变更
    console.log(`已更新视频参数 - 新值: 时长=${profile.duration}秒, 旋转圈数=${profile.rotations}`);
    console.log(`原始参数 - 时长=${originalDuration}秒, 旋转圈数=${originalRotations}`);
    
    // 返回详细的参数
    return {
      needTrimAudio: false,
      audioPlaybackRate: 1.0,
      videoLength: videoLength,
      audioLength: audioLength,
      adaptedToAudio: true,
      originalDuration: originalDuration,
      originalRotations: originalRotations,
      effectiveMode: 'fitAudio',
      finalDuration: profile.duration,
      finalRotations: profile.rotations
    };
  } else {
    // 视频适配模式: 调整音频以匹配视频
    console.log(`适配视频时长模式: 视频长度=${videoLength}秒, 音频长度=${audioLength.toFixed(2)}秒`);
    
    if (audioLength < videoLength) {
      // 音频较短: 需要循环播放
      const loopCount = Math.ceil(videoLength / audioLength);
      console.log(`音频较短，需要循环${loopCount}次来匹配视频`);
      
      return {
        needTrimAudio: false,
        loopAudio: true,
        loopCount: loopCount,
        audioPlaybackRate: 1.0,
        videoLength: videoLength,
        audioLength: audioLength,
        adaptedToVideo: true,
        effectiveMode: 'fitVideo-loop',
        finalDuration: videoLength
      };
    } else if (audioLength > videoLength) {
      // 音频较长: 需要裁剪
      console.log(`音频较长，将裁剪到视频长度${videoLength}秒`);
      
      return {
        needTrimAudio: true,
        trimDuration: videoLength,
        audioPlaybackRate: 1.0,
        videoLength: videoLength,
        audioLength: audioLength,
        adaptedToVideo: true,
        effectiveMode: 'fitVideo-trim',
        finalDuration: videoLength
      };
    } else {
      // 时长相近: 无需特殊处理
      console.log(`音频与视频时长匹配，无需调整`);
      
      return {
        needTrimAudio: false,
        audioPlaybackRate: 1.0,
        videoLength: videoLength,
        audioLength: audioLength,
        adaptedToVideo: true,
        effectiveMode: 'fitVideo-exact',
        finalDuration: videoLength
      };
    }
  }
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

/**
 * 从音频缓冲区创建Blob
 * @param {AudioBuffer} audioBuffer - 音频缓冲区
 * @param {string} format - 音频格式 ('mp3' | 'wav')
 * @returns {Promise<Blob>} 音频Blob对象
 */
export async function audioBufferToBlob(audioBuffer, format = 'wav') {
  return new Promise((resolve) => {
    // 使用Web Audio API将AudioBuffer转换回Blob
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    offlineContext.startRendering().then(renderedBuffer => {
      // 导出为WAV格式
      const wav = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      resolve(blob);
    });
  });
}

/**
 * 将AudioBuffer转换为WAV格式
 * @param {AudioBuffer} buffer - 音频缓冲区
 * @returns {ArrayBuffer} WAV格式数据
 */
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const result = new Uint8Array(length);
  const view = new DataView(result.buffer);
  
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, length - 8, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numOfChan, true);
  // sample rate
  view.setUint32(24, buffer.sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numOfChan * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, length - 44, true);
  
  // Write the PCM samples
  const data = view.buffer;
  const channels = [];
  let offset = 44;
  
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < numOfChan; j++) {
      let sample = Math.max(-1, Math.min(1, channels[j][i])) * 0x7FFF;
      if (sample < 0) sample = 0xFFFF + sample + 1;
      view.setUint16(offset, sample, true);
      offset += 2;
    }
  }
  
  return data;
}

/**
 * 辅助函数：将字符串写入DataView
 * @param {DataView} view - 数据视图
 * @param {number} offset - 起始偏移量
 * @param {string} string - 要写入的字符串
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * 提取MP4轨道信息
 * @param {Uint8Array} data - MP4数据
 * @returns {Promise<Object>} 轨道信息
 */
async function extractMP4TrackInfo(data) {
  // 手动解析MP4头部以提取编解码器信息
  // MP4格式是基于盒子结构的
  try {
    // MP4盒子结构中常见编解码器标识
    // 查找ftyp盒子来确定文件类型
    const findBox = (data, type) => {
      for (let i = 0; i < data.length - 4; i++) {
        // 盒子结构: 大小(4字节) + 类型(4字节)
        if (String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]) === type) {
          return i;
        }
      }
      return -1;
    };
    
    // 查找ftyp盒子
    const ftypIndex = findBox(data, 'ftyp');
    if (ftypIndex < 0) {
      console.warn('MP4解析: 找不到ftyp盒子');
      return defaultMP4TrackInfo();
    }
    
    // 查找moov盒子
    const moovIndex = findBox(data, 'moov');
    if (moovIndex < 0) {
      console.warn('MP4解析: 找不到moov盒子');
      return defaultMP4TrackInfo();
    }
    
    // 检测编解码器，默认使用H.264 High Profile Level 4.0
    let codec = 'avc1.640033';
    
    // 尝试找到avcC盒子来验证编解码器
    const avcCIndex = findBox(data.slice(moovIndex), 'avcC');
    if (avcCIndex > 0) {
      console.log('MP4解析: 找到avcC盒子，确认为H.264编码');
      // 如果找到了avcC盒子，证实这是H.264编码
      codec = 'avc1.640033'; // 使用支持大多数视频的编码配置
    }
    
    // 解析分辨率
    // 这只是默认值，实际上应该从stsd盒子中提取
    const width = 1920;
    const height = 1080;
    
    // 创建编解码器描述信息
    // 对于H.264，编解码器特定描述信息是序列参数集(SPS)和图像参数集(PPS)
    // 这里我们创建一个简单的描述
    const description = new Uint8Array([
      0x00, 0x00, 0x00, 0x01, // 起始码
      0x67, 0x64, 0x00, 0x28, 0xac, 0x2c, 0xa8, 0x0a, // SPS
      0x00, 0x00, 0x00, 0x01, // 起始码
      0x68, 0xce, 0x38, 0x80  // PPS
    ]);
    
    return {
      videoTrack: {
        codec,
        width,
        height,
        description
      }
    };
  } catch (error) {
    console.error('解析MP4轨道信息失败:', error);
    return defaultMP4TrackInfo();
  }
}

/**
 * 默认MP4轨道信息
 */
function defaultMP4TrackInfo() {
  return {
    videoTrack: {
      codec: 'avc1.640028', // H.264 High Profile Level 4.0
      width: 1920,
      height: 1080,
      description: new Uint8Array([
        0x00, 0x00, 0x00, 0x01, // 起始码
        0x67, 0x64, 0x00, 0x28, // SPS
        0x00, 0x00, 0x00, 0x01, // 起始码
        0x68, 0xce, 0x38, 0x80  // PPS
      ])
    }
  };
}

/**
 * 提取WebM轨道信息
 * @param {Uint8Array} data - WebM数据
 * @returns {Promise<Object>} 轨道信息
 */
async function extractWebMTrackInfo(data) {
  // 手动解析WebM头部
  try {
    // 查找EBML元素
    const findElement = (data, id) => {
      for (let i = 0; i < data.length - 4; i++) {
        if (data[i] === id[0] && data[i + 1] === id[1]) {
          return i;
        }
      }
      return -1;
    };
    
    // WebM使用EBML格式，头部通常包含DocType标记
    const ebmlHeaderId = [0x1A, 0x45, 0xDF, 0xA3];
    const ebmlIndex = findElement(data, ebmlHeaderId);
    
    if (ebmlIndex < 0) {
      console.warn('WebM解析: 找不到EBML头');
      return defaultWebMTrackInfo();
    }
    
    // 尝试确定视频编解码器
    let codec = 'vp8';
    
    // 检查是否包含VP9编码标识
    const vp9SignatureBytes = [0x83, 0x81, 0x00];
    let isVP9 = false;
    
    for (let i = 0; i < data.length - vp9SignatureBytes.length; i++) {
      if (data[i] === vp9SignatureBytes[0] && 
          data[i + 1] === vp9SignatureBytes[1] && 
          data[i + 2] === vp9SignatureBytes[2]) {
        isVP9 = true;
        break;
      }
    }
    
    if (isVP9) {
      codec = 'vp9';
      console.log('WebM解析: 检测到VP9编码');
    } else {
      console.log('WebM解析: 假设为VP8编码');
    }
    
    return {
      videoTrack: {
        codec,
        width: 1920,
        height: 1080,
        description: new Uint8Array([0x01, 0x02, 0x03]) // 简单的描述符，WebM通常不需要太详细的描述
      }
    };
  } catch (error) {
    console.error('解析WebM轨道信息失败:', error);
    return defaultWebMTrackInfo();
  }
}

/**
 * 默认WebM轨道信息
 */
function defaultWebMTrackInfo() {
  return {
    videoTrack: {
      codec: 'vp8',
      width: 1920,
      height: 1080,
      description: new Uint8Array([0x01, 0x02, 0x03])
    }
  };
}

/**
 * 合并视频和音频
 * @param {Blob} videoBlob - 视频Blob对象
 * @param {AudioBuffer} audioBuffer - 音频缓冲区
 * @param {Object} options - 合成选项
 * @returns {Promise<Blob>} 合成后的视频Blob对象
 */
export async function mergeAudioWithVideo(videoBlob, audioBuffer, options) {
  console.log('开始处理音视频合成，视频大小:', Math.round(videoBlob.size/1024/1024), 'MB');
  
  // 1. 确认VideoBlob是否可用
  if (!videoBlob || videoBlob.size === 0) {
    throw new Error('视频Blob无效或大小为0');
  }
  
  // 2. 从视频blob获取视频数据和格式信息
  const videoMimeType = videoBlob.type;
  const isMP4 = videoMimeType.includes('mp4');
  const format = isMP4 ? 'mp4' : 'webm';
  console.log(`检测到视频格式: ${format}, MIME类型: ${videoMimeType}`);
  
  // 3. 创建视频元素获取元数据并准备解码
  const videoElement = document.createElement('video');
  videoElement.muted = true;
  videoElement.playsInline = true;
  
  // 设置视频源
  const videoUrl = URL.createObjectURL(videoBlob);
  videoElement.src = videoUrl;
  
  // 等待视频元数据加载
  await new Promise((resolve) => {
    videoElement.onloadedmetadata = resolve;
    videoElement.load();
  });
  
  const videoInfo = {
    width: videoElement.videoWidth,
    height: videoElement.videoHeight,
    duration: videoElement.duration,
    fps: options.fps || 30
  };
  
  console.log(`视频信息: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}秒, ${videoInfo.fps}fps`);
  
  // 4. 准备音频数据
  console.log('准备音频数据...');
  const audioData = await prepareAudio(audioBuffer, {
    volume: options.volume || 0.8,
    videoLength: videoInfo.duration,
    needTrimAudio: videoInfo.duration < audioBuffer.duration,
    trimDuration: videoInfo.duration,
    loopAudio: videoInfo.duration > audioBuffer.duration,
    loopCount: Math.ceil(videoInfo.duration / audioBuffer.duration)
  });

  try {
    // 5. 使用编码器API和批处理方式处理视频
    console.log('开始批处理视频和音频...');
    
    // 创建Target
    const target = isMP4 ? new MP4ArrayBufferTarget() : new ArrayBufferTarget();
    
    // 计算编码器参数
    const bitrate = 8000000; // 8 Mbps
    const keyFrameInterval = isMP4 ? Math.round(videoInfo.fps * 2) : Math.round(videoInfo.fps); // 2秒或1秒一个关键帧
    
    // 配置muxer
    const muxerConfig = {
      target,
      video: {
        codec: isMP4 ? 'avc' : 'vp8',
        width: videoInfo.width,
        height: videoInfo.height,
        framerate: videoInfo.fps
      },
      audio: {
        codec: isMP4 ? 'aac' : 'opus',
        numberOfChannels: audioData.numberOfChannels,
        sampleRate: audioData.sampleRate,
        bitrate: 192000
      }
    };
    
    // 为MP4添加特殊配置
    if (isMP4) {
      muxerConfig.fastStart = 'in-memory';
    }
    
    // 创建muxer
    const muxer = isMP4 ? new MP4Muxer(muxerConfig) : new Muxer(muxerConfig);
    
    // 创建视频编码器
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => console.error('视频编码错误:', e)
    });
    
    // 配置视频编码器 - 使用与videoEncoderManager.js相同的配置
    videoEncoder.configure({
      codec: isMP4 ? 'avc1.640033' : 'vp09.00.10.08',
      width: videoInfo.width,
      height: videoInfo.height,
      bitrate: bitrate,
      framerate: videoInfo.fps,
      latencyMode: 'quality',
      // AVC特定配置
      avc: isMP4 ? {
        format: 'annexb',
        profile: 'high',
        level: '5.1',
        bitDepth: 8,
        chromaFormat: '420'
      } : undefined
    });
    
    // 创建音频编码器
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (e) => console.error('音频编码错误:', e)
    });
    
    // 配置音频编码器
    audioEncoder.configure({
      codec: isMP4 ? 'mp4a.40.2' : 'opus',
      numberOfChannels: audioData.numberOfChannels,
      sampleRate: audioData.sampleRate,
      bitrate: 192000
    });
    
    // 创建Canvas用于逐帧提取
    const canvas = document.createElement('canvas');
    canvas.width = videoInfo.width;
    canvas.height = videoInfo.height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    
    // 使用更可靠的方法提取视频帧
    console.log('开始提取视频帧...');
    
    // 计算总帧数和其他参数
    const totalFrames = Math.ceil(videoInfo.duration * videoInfo.fps);
    const frameDuration = 1000000 / videoInfo.fps; // 微秒单位
    
    // 使用播放方式逐帧提取（更可靠）
    videoElement.currentTime = 0;
    await new Promise(resolve => {
      videoElement.onseeked = resolve;
    });
    
    // 播放视频并捕获帧
    const capturedFrames = [];
    let frameCounter = 0;
    
    // 预分配内存，使用更简单的结构避免内存问题
    const frameTimes = [];
    for (let i = 0; i < totalFrames; i++) {
      frameTimes.push(i / videoInfo.fps);
    }
    
    console.log(`准备提取 ${totalFrames} 帧...`);
    
    // 递归提取每一帧，确保不会跳帧
    async function extractFrame(index) {
      if (index >= totalFrames) {
        return; // 所有帧都已提取
      }
      
      // 设置精确的时间点
      const targetTime = frameTimes[index];
      videoElement.currentTime = targetTime;
      
      // 等待视频到达指定时间点
      await new Promise(resolve => {
        videoElement.onseeked = resolve;
      });
      
      // 清除Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制当前帧
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // 创建并编码VideoFrame
      const timestamp = Math.round(index * frameDuration);
      const isKeyFrame = index % keyFrameInterval === 0;
      
      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestamp,
        duration: frameDuration
      });
      
      // 等待编码器队列不满
      while (videoEncoder.encodeQueueSize > 2) {
        await new Promise(r => setTimeout(r, 1));
      }
      
      // 编码当前帧
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();
      
      // 更新进度
      frameCounter++;
      if (frameCounter % 30 === 0 || frameCounter === totalFrames) {
        console.log(`视频编码进度: ${frameCounter}/${totalFrames} (${Math.round((frameCounter / totalFrames) * 100)}%)`);
      }
      
      // 处理下一帧
      await extractFrame(index + 1);
    }
    
    // 开始帧提取过程
    try {
      await extractFrame(0);
    } catch (e) {
      console.error('帧提取过程中出错:', e);
      throw e;
    }
    
    // 确保视频编码器已完成
    await videoEncoder.flush();
    console.log('视频编码完成');
    
    // 处理音频数据 - 也采用分批处理
    console.log('开始处理音频数据...');
    
    // 分块处理音频
    const audioChunkSize = Math.floor(audioData.sampleRate * 0.1); // 100ms 数据块
    const totalAudioChunks = Math.ceil(audioData.length / audioChunkSize);
    
    // 分批处理音频
    for (let chunkIndex = 0; chunkIndex < totalAudioChunks; chunkIndex++) {
      const offset = chunkIndex * audioChunkSize;
      const length = Math.min(audioChunkSize, audioData.length - offset);
      
      if (length <= 0) break;
      
      // 创建音频数据
      const audioFrameData = new Float32Array(length * audioData.numberOfChannels);
      
      // 填充音频数据（平面格式）
      for (let channel = 0; channel < audioData.numberOfChannels; channel++) {
        const channelData = audioData.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          audioFrameData[channel * length + i] = channelData[offset + i];
        }
      }
      
      // 精确计算时间戳 (微秒)
      const audioTimestamp = Math.floor((offset / audioData.sampleRate) * 1000000);
      
      try {
        // 创建AudioData
        const audioFrame = new AudioData({
          format: 'f32-planar',
          sampleRate: audioData.sampleRate,
          numberOfFrames: length,
          numberOfChannels: audioData.numberOfChannels,
          timestamp: audioTimestamp,
          data: audioFrameData
        });
        
        // 编码音频
        audioEncoder.encode(audioFrame);
        audioFrame.close();
        
        // 输出进度
        if (chunkIndex % 10 === 0 || chunkIndex === totalAudioChunks - 1) {
          console.log(`音频编码进度: ${chunkIndex + 1}/${totalAudioChunks} (${Math.round((chunkIndex + 1) / totalAudioChunks * 100)}%)`);
        }
      } catch (e) {
        console.warn('音频帧处理错误:', e);
      }
      
      // 控制编码队列深度
      while (audioEncoder.encodeQueueSize > 2) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    // 完成音频编码
    await audioEncoder.flush();
    console.log('音频编码完成');
    
    // 完成muxer
    console.log('完成Muxer处理...');
    muxer.finalize();
    
    // 创建最终Blob
    const buffer = target.buffer;
    const finalBlob = new Blob([buffer], { type: isMP4 ? 'video/mp4' : 'video/webm' });
    
    // 清理资源
    URL.revokeObjectURL(videoUrl);
    videoElement.pause();
    
    console.log(`音视频合成完成! 最终文件大小: ${Math.round(finalBlob.size/1024/1024)}MB`);
    return finalBlob;
    
  } catch (error) {
    console.error('音视频合成过程中出错:', error);
    URL.revokeObjectURL(videoUrl);
    videoElement.pause();
    throw error;
  }
}

