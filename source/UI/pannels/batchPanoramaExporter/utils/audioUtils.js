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
  
  // 3. 使用静态导入的muxer库（已在文件顶部导入）
  
  // 4. 从视频文件中提取元数据
  const videoElement = document.createElement('video');
  videoElement.muted = true;
  
  // 设置视频源
  const videoUrl = URL.createObjectURL(videoBlob);
  videoElement.src = videoUrl;
  
  // 等待视频元数据加载
  await new Promise((resolve, reject) => {
    videoElement.onloadedmetadata = resolve;
    videoElement.onerror = reject;
    videoElement.load();
  });
  
  const videoInfo = {
    width: videoElement.videoWidth,
    height: videoElement.videoHeight,
    duration: videoElement.duration,
    fps: options.fps || 30
  };
  
  console.log(`视频信息: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}秒, ${videoInfo.fps}fps`);
  
  // 5. 准备音频数据
  console.log('准备音频数据...');
  const audioData = await prepareAudio(audioBuffer, {
    volume: options.volume || 0.8,
    videoLength: videoInfo.duration,
    needTrimAudio: videoInfo.duration < audioBuffer.duration,
    trimDuration: videoInfo.duration,
    loopAudio: videoInfo.duration > audioBuffer.duration,
    loopCount: Math.ceil(videoInfo.duration / audioBuffer.duration)
  });
  
  // 6. 创建目标容器
  const target = isMP4 ? new MP4ArrayBufferTarget() : new ArrayBufferTarget();
  
  // 7. 配置和创建muxer
  const muxerConfig = {
    target,
    video: {
      codec: isMP4 ? 'avc' : 'vp8',
      width: videoInfo.width,
      height: videoInfo.height,
      framerate: videoInfo.fps,
      // 添加完整的colorSpace信息
      colorSpace: {
        primaries: 'bt709',
        transfer: 'bt709',
        matrix: 'bt709',
        fullRange: true
      }
    },
    audio: {
      codec: isMP4 ? 'aac' : 'opus',
      numberOfChannels: audioData.numberOfChannels,
      sampleRate: audioData.sampleRate,
      bitrate: 128000
    }
  };
  
  // 对MP4设置特殊参数
  if (isMP4) {
    muxerConfig.fastStart = 'in-memory';
  }
  
  console.log('创建Muxer实例...');
  const muxer = isMP4 ? new MP4Muxer(muxerConfig) : new Muxer(muxerConfig);
  
  // 8. 提取视频和音频帧
  try {
    // 创建Canvas用于提取视频帧
    const canvas = document.createElement('canvas');
    canvas.width = videoInfo.width;
    canvas.height = videoInfo.height;
    const ctx = canvas.getContext('2d');
    
    // 创建视频编码器
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        // 添加视频帧到muxer时附带colorSpace信息
        const metaInfo = {
          ...meta,
          colorSpace: {
            primaries: 'bt709',
            transfer: 'bt709',
            matrix: 'bt709',
            fullRange: true
          }
        };
        muxer.addVideoChunk(chunk, metaInfo);
      },
      error: (e) => console.error('视频编码错误:', e)
    });
    
    // 配置视频编码器
    const videoEncoderConfig = {
      codec: isMP4 ? 'avc1.640028' : 'vp8',
      width: videoInfo.width,
      height: videoInfo.height,
      bitrate: 8000000,
      framerate: videoInfo.fps
    };
    
    // 为AVC编码添加特定参数
    if (isMP4) {
      videoEncoderConfig.avc = {
        format: 'annexb',
        profile: 'high',
        level: '4.0',
        bitDepth: 8,
        chromaFormat: '420'
      };
    }
    
    videoEncoder.configure(videoEncoderConfig);
    
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
      bitrate: 128000
    });
    
    // 设置视频元素到初始位置
    videoElement.currentTime = 0;
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 提取视频帧
    console.log('开始提取和编码视频帧...');
    const frameTime = 1000 / videoInfo.fps;
    const totalFrames = Math.ceil(videoInfo.duration * videoInfo.fps);
    
    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i * frameTime / 1000;
      await new Promise(resolve => setTimeout(resolve, 10)); // 等待视频更新
      
      // 绘制视频帧到Canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // 创建VideoFrame
      const frame = new VideoFrame(canvas, {
        timestamp: i * frameTime * 1000, // 微秒
        duration: frameTime * 1000 // 微秒
      });
      
      // 编码视频帧
      videoEncoder.encode(frame, { keyFrame: i % 30 === 0 });
      frame.close();
    }
    
    // 处理音频数据
    console.log('开始处理音频数据...');
    
    // 创建离线音频上下文用于处理音频
    const offlineContext = new OfflineAudioContext(
      audioData.numberOfChannels,
      audioData.length,
      audioData.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioData;
    source.connect(offlineContext.destination);
    source.start();
    
    // 渲染音频
    const renderBuffer = await offlineContext.startRendering();
    
    // 分块处理音频
    const chunkSize = Math.floor(audioData.sampleRate * 0.1); // 100ms 的数据
    
    for (let offset = 0; offset < renderBuffer.length; offset += chunkSize) {
      const length = Math.min(chunkSize, renderBuffer.length - offset);
      if (length <= 0) break;
      
      // 创建音频数据
      const audioFrameData = new Float32Array(length * renderBuffer.numberOfChannels);
      
      // 填充音频数据（平面格式）
      for (let channel = 0; channel < renderBuffer.numberOfChannels; channel++) {
        const channelData = renderBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          audioFrameData[channel * length + i] = channelData[offset + i];
        }
      }
      
      // 创建AudioData对象
      const audioFrame = new AudioData({
        format: 'f32-planar',
        sampleRate: renderBuffer.sampleRate,
        numberOfFrames: length,
        numberOfChannels: renderBuffer.numberOfChannels,
        timestamp: Math.floor((offset / renderBuffer.sampleRate) * 1000000),
        data: audioFrameData
      });
      
      // 编码音频帧
      audioEncoder.encode(audioFrame);
      audioFrame.close();
    }
    
    // 完成编码
    console.log('完成编码，等待刷新编码器...');
    await videoEncoder.flush();
    await audioEncoder.flush();
    
    // 完成muxer
    console.log('完成Muxer...');
    muxer.finalize();
    
    // 创建最终Blob
    const buffer = target.buffer;
    const finalMimeType = isMP4 ? 'video/mp4' : 'video/webm';
    const finalBlob = new Blob([buffer], { type: finalMimeType });
    
    // 清理资源
    URL.revokeObjectURL(videoUrl);
    videoElement.pause();
    
    console.log(`音视频合成完成! 最终文件大小: ${Math.round(finalBlob.size/1024/1024)}MB`);
    return finalBlob;
  } catch (error) {
    console.error('音视频合成过程中出错:', error);
    
    // 清理资源
    URL.revokeObjectURL(videoUrl);
    videoElement.pause();
    throw error;
  }
}

