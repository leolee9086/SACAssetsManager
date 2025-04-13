/**
 * 批量全景导出组件 - 音频处理工具函数
 */

// 添加静态导入
import { MP4Muxer, MP4ArrayBufferTarget, Muxer, ArrayBufferTarget } from '../../../../../src/toolBox/base/useDeps/useMuxer/useVideoMuxer.js';
// 导入VideoEncoderManager
import { VideoEncoderManager, loadAudio as loadAudioFromEncoder } from '../../../pannels/pannoViewer/videoEncoderManager.js';

/**
 * 加载音频文件并解码
 * @param {File|string} file - 音频文件对象或路径
 * @returns {Promise<{audioContext: AudioContext, audioBuffer: AudioBuffer}>} 音频上下文和解码后的音频缓冲区
 */
export async function loadAudio(file) {
  return loadAudioFromEncoder(file);
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
  console.log('使用VideoEncoderManager实现的音频合成...');
  return mergeAudioWithVideoUsingEncoder(videoBlob, audioBuffer, options);
}

/**
 * 使用VideoEncoderManager实现的音频合成函数
 * @param {Blob} videoBlob - 视频Blob对象
 * @param {AudioBuffer} audioBuffer - 音频缓冲区
 * @param {Object} options - 合成选项
 * @returns {Promise<Blob>} 合成后的视频Blob对象
 */
async function mergeAudioWithVideoUsingEncoder(videoBlob, audioBuffer, options) {
  console.log('开始处理音视频合成，视频大小:', Math.round(videoBlob.size/1024/1024), 'MB');
  
  // 1. 确认VideoBlob是否可用
  if (!videoBlob || videoBlob.size === 0) {
    throw new Error('视频Blob无效或大小为0');
  }
  
  // 2. 验证音频数据
  if (!audioBuffer) {
    console.error('音频数据无效：', audioBuffer);
    throw new Error('音频缓冲区无效');
  }
  
  console.log('原始音频信息：', {
    duration: audioBuffer.duration,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
    length: audioBuffer.length
  });
  
  // 检查原始音频通道数
  if (audioBuffer.numberOfChannels === 0) {
    console.error('警告: 原始音频通道数为0，这可能导致问题');
    // 不立即抛出错误，而是尝试继续处理
  }
  
  // 3. 从视频blob获取视频数据和格式信息
  const videoMimeType = videoBlob.type;
  const isMP4 = videoMimeType.includes('mp4');
  const format = isMP4 ? 'mp4' : 'webm';
  console.log(`检测到视频格式: ${format}, MIME类型: ${videoMimeType}`);
  
  // 4. 创建并配置视频元素
  const videoElement = document.createElement('video');
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.preload = "auto";
  
  // 设置视频源
  const videoUrl = URL.createObjectURL(videoBlob);
  videoElement.src = videoUrl;
  
  // 等待视频完全加载
  await new Promise((resolve) => {
    const loadHandler = () => {
      videoElement.removeEventListener('loadeddata', loadHandler);
      resolve();
    };
    videoElement.addEventListener('loadeddata', loadHandler);
    videoElement.load();
  });
  
  // 额外等待确保视频可以播放
  await new Promise((resolve) => {
    const canPlayHandler = () => {
      videoElement.removeEventListener('canplay', canPlayHandler);
      resolve();
    };
    
    if (videoElement.readyState >= 3) { // HAVE_FUTURE_DATA或更高
      resolve();
    } else {
      videoElement.addEventListener('canplay', canPlayHandler);
    }
  });
  
  // 尝试播放一小段视频，以确保解码器已初始化
  try {
    await videoElement.play();
    // 播放极短时间后暂停
    setTimeout(() => {
      videoElement.pause();
    }, 100);
  } catch (e) {
    console.warn('视频预播放测试失败，这可能会影响帧提取:', e);
  }
  
  const videoInfo = {
    width: videoElement.videoWidth,
    height: videoElement.videoHeight,
    duration: videoElement.duration,
    fps: options.fps || 30
  };
  
  console.log(`视频信息: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}秒, ${videoInfo.fps}fps`);
  
  try {
    // 5. 直接使用安全的音频处理方法
    console.log('使用安全方法处理音频数据...');
    
    // 创建一个安全的音频缓冲区
    let safeAudioBuffer = audioBuffer;
    
    // 如果原始音频通道数为0，创建一个包含静音数据的单通道音频缓冲区
    if (audioBuffer.numberOfChannels === 0) {
      console.log('创建替代静音音频...');
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      safeAudioBuffer = audioContext.createBuffer(
        1, // 强制使用单通道
        Math.ceil(videoInfo.duration * (audioBuffer.sampleRate || 44100)),
        audioBuffer.sampleRate || 44100
      );
      // 填充静音数据
      const silentChannel = safeAudioBuffer.getChannelData(0);
      silentChannel.fill(0);
      console.log('已创建静音替代音频');
    }
    
    // 直接处理音频，避免使用prepareAudio可能导致的问题
    let processedAudioBuffer;
    try {
      // 创建离线音频上下文
      const offlineCtx = new OfflineAudioContext(
        safeAudioBuffer.numberOfChannels,
        Math.ceil(videoInfo.duration * safeAudioBuffer.sampleRate),
        safeAudioBuffer.sampleRate
      );
      
      // 创建音频源节点
      const sourceNode = offlineCtx.createBufferSource();
      sourceNode.buffer = safeAudioBuffer;
      
      // 音量控制
      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = options.volume || 0.8;
      
      // 连接节点
      sourceNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      
      // 声明音频播放模式：循环还是截断
      const isLoop = safeAudioBuffer.duration < videoInfo.duration;
      if (isLoop) {
        sourceNode.loop = true;
        sourceNode.loopEnd = safeAudioBuffer.duration;
        console.log(`音频较短(${safeAudioBuffer.duration.toFixed(2)}秒)，将循环播放到视频长度(${videoInfo.duration.toFixed(2)}秒)`);
      } else {
        console.log(`音频较长(${safeAudioBuffer.duration.toFixed(2)}秒)，将截断到视频长度(${videoInfo.duration.toFixed(2)}秒)`);
      }
      
      // 开始播放，限制时长为视频时长
      sourceNode.start(0, 0, videoInfo.duration);
      
      // 渲染音频
      console.log('开始渲染音频...');
      processedAudioBuffer = await offlineCtx.startRendering();
      
      // 验证处理后的音频
      console.log('处理后的音频信息：', {
        duration: processedAudioBuffer.duration,
        numberOfChannels: processedAudioBuffer.numberOfChannels,
        sampleRate: processedAudioBuffer.sampleRate,
        length: processedAudioBuffer.length
      });
      
      // 安全检查
      if (!processedAudioBuffer || processedAudioBuffer.numberOfChannels === 0) {
        console.error('音频处理失败: 处理后的音频无效或通道数为0');
        // 回退到原始音频，除非它也无效
        processedAudioBuffer = safeAudioBuffer.numberOfChannels > 0 ? safeAudioBuffer : null;
      }
    } catch (audioProcessError) {
      console.error('音频渲染失败:', audioProcessError);
      // 如果处理失败，尝试使用原始音频
      processedAudioBuffer = safeAudioBuffer.numberOfChannels > 0 ? safeAudioBuffer : null;
    }
    
    // 最终检查音频数据
    if (!processedAudioBuffer || processedAudioBuffer.numberOfChannels === 0) {
      console.error('无法获取有效的音频数据，将继续但不包含音频');
      // 继续但不包含音频
      processedAudioBuffer = null;
    }
    
    // 创建一个临时canvas，用于逐帧提取视频
    const canvas = document.createElement('canvas');
    canvas.width = videoInfo.width;
    canvas.height = videoInfo.height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    
    // 计算总帧数
    const totalFrames = Math.ceil(videoInfo.duration * videoInfo.fps);
    console.log(`计算总帧数: ${totalFrames} 帧`);
    
    // 创建VideoEncoderManager，如果有有效音频则包含音频
    const encoderManager = new VideoEncoderManager({
      width: videoInfo.width,
      height: videoInfo.height,
      fps: videoInfo.fps,
      format: format,
      // 只有在有有效音频时才添加音频配置
      audioConfig: processedAudioBuffer ? {
        audioBuffer: processedAudioBuffer,
        volume: options.volume || 0.8
      } : null
    });
    
    // 设置进度回调
    if (options.progressCallback) {
      encoderManager.setProgressCallback((progress) => {
        if (options.progressCallback) {
          options.progressCallback({
            ...progress,
            stage: `${progress.stage} (新引擎)` // 标记为新引擎处理
          });
        }
      });
    }
    
    // 计算微秒级帧持续时间，与VideoEncoderManager保持一致
    const frameDuration = Math.floor(1000000 / videoInfo.fps);
    
    // 预先定位视频，避免第一帧提取时间过长
    videoElement.currentTime = 0;
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 创建帧生成器函数
    const frameGenerator = async (frameIndex) => {
      try {
        console.log(`===== 开始处理帧 ${frameIndex} =====`);
        
        // 计算精确的帧时间，单位为秒
        const frameTime = frameIndex / videoInfo.fps;
        console.log(`帧 ${frameIndex}: 目标时间=${frameTime.toFixed(5)}秒`);
        
        // 记录当前位置
        const currentPosition = videoElement.currentTime;
        console.log(`帧 ${frameIndex}: 处理前视频位置=${currentPosition.toFixed(5)}秒`);
        
        // 确保时间在有效范围内
        if (frameTime >= videoInfo.duration) {
          console.warn(`帧时间 ${frameTime.toFixed(3)}秒 超出视频长度 ${videoInfo.duration.toFixed(3)}秒，使用最后一帧`);
          videoElement.currentTime = videoInfo.duration - 0.001; // 使用接近结尾但有效的时间
        } else {
          videoElement.currentTime = frameTime;
        }
        
        // 使用Promise.all和超时保护
        let timeoutId;
        let isSeeked = false;
        
        const seekPromise = new Promise((resolve) => {
          const seekHandler = () => {
            clearTimeout(timeoutId);
            videoElement.removeEventListener('seeked', seekHandler);
            isSeeked = true;
            console.log(`帧 ${frameIndex}: seeked事件触发成功，新位置=${videoElement.currentTime.toFixed(5)}秒`);
            resolve('seeked');
          };
          videoElement.addEventListener('seeked', seekHandler);
        });
        
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn(`帧 ${frameIndex} (${frameTime.toFixed(5)}秒) 定位超时，实际位置=${videoElement.currentTime.toFixed(5)}秒`);
            resolve('timeout');
          }, 500); // 增加超时时间
        });
        
        // 等待视频定位完成或超时
        const result = await Promise.race([seekPromise, timeoutPromise]);
        console.log(`帧 ${frameIndex}: seek结果=${result}, 当前视频位置=${videoElement.currentTime.toFixed(5)}秒`);
        
        // 如果超时但位置接近目标，给它更多时间
        if (result === 'timeout' && !isSeeked) {
          const currentDiff = Math.abs(videoElement.currentTime - frameTime);
          if (currentDiff > 0.1) { // 偏差较大
            console.log(`帧 ${frameIndex}: 位置偏差较大(${currentDiff.toFixed(5)}秒)，等待额外时间...`);
            // 额外等待
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // 再次记录实际时间位置
        const actualTime = videoElement.currentTime;
        console.log(`帧 ${frameIndex}: 最终视频位置=${actualTime.toFixed(5)}秒, 目标=${frameTime.toFixed(5)}秒, 偏差=${Math.abs(actualTime - frameTime).toFixed(5)}秒`);
        
        // 清除Canvas并绘制当前帧
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // 创建微型画布用于进度显示
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = 160;
        thumbnailCanvas.height = 160 * (canvas.height / canvas.width);
        const thumbCtx = thumbnailCanvas.getContext('2d');
        thumbCtx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        const thumbnailDataURL = thumbnailCanvas.toDataURL('image/jpeg', 0.5);
        
        // 计算与VideoEncoderManager一致的时间戳（微秒）
        const timestamp = Math.floor(frameIndex * frameDuration);
        
        // 创建新的ImageBitmap作为帧数据，避免共享同一个Canvas引用
        const frameImageBitmap = await createImageBitmap(canvas);
        
        console.log(`帧 ${frameIndex}: 处理完成，时间戳=${timestamp}微秒，对应=${(timestamp/1000000).toFixed(5)}秒`);
        
        // 返回帧数据，使用ImageBitmap而非Canvas
        return {
          imageData: frameImageBitmap,
          thumbnailDataURL,
          timestamp,
          actualTime, // 附加实际视频时间
          requestedTime: frameTime // 附加请求的时间
        };
      } catch (frameError) {
        console.error(`提取第${frameIndex}帧时出错:`, frameError);
        // 提供一个替代帧
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加错误文本
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`帧 ${frameIndex} 提取失败`, 20, canvas.height / 2);
        ctx.fillText(`错误: ${frameError.message}`, 20, canvas.height / 2 + 30);
        
        // 创建新的ImageBitmap
        const errorImageBitmap = await createImageBitmap(canvas);
        
        return {
          imageData: errorImageBitmap,
          thumbnailDataURL: null,
          timestamp: Math.floor(frameIndex * frameDuration),
          error: frameError.message
        };
      }
    };
    
    // 显式添加验证机制，确保不跳帧
    const validateFrames = true;
    if (validateFrames) {
      console.log('启用帧验证机制，确保每帧都不同');
      
      // 封装原始frameGenerator添加验证
      const originalFrameGenerator = frameGenerator;
      const frameCache = new Map();
      
      // 覆盖frameGenerator
      const validatingFrameGenerator = async (frameIndex) => {
        // 调用原始生成器
        const frameData = await originalFrameGenerator(frameIndex);
        
        // 验证此帧是否与前一帧相同
        if (frameIndex > 0 && frameCache.has(frameIndex - 1)) {
          const lastFrame = frameCache.get(frameIndex - 1);
          const timeDiff = Math.abs(frameData.actualTime - lastFrame.actualTime);
          
          if (timeDiff < 0.001) {
            console.warn(`警告: 帧 ${frameIndex} 与前一帧时间相同! 当前=${frameData.actualTime.toFixed(5)}, 前一帧=${lastFrame.actualTime.toFixed(5)}`);
            
            // 尝试重新定位和抓取
            console.log(`尝试重新抓取帧 ${frameIndex}，使用强制偏移...`);
            
            // 先退回一点
            videoElement.currentTime = frameData.requestedTime - 0.1;
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 再次尝试定位到正确位置
            videoElement.currentTime = frameData.requestedTime;
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 重新抓取
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const retryCapturedTime = videoElement.currentTime;
            
            console.log(`帧 ${frameIndex} 重新抓取完成，新位置=${retryCapturedTime.toFixed(5)}秒`);
            
            // 更新图像数据
            if (frameData.imageData && typeof frameData.imageData.close === 'function') {
              frameData.imageData.close();
            }
            frameData.imageData = await createImageBitmap(canvas);
            frameData.actualTime = retryCapturedTime;
          }
        }
        
        // 缓存当前帧
        frameCache.set(frameIndex, {
          actualTime: frameData.actualTime,
          timestamp: frameData.timestamp
        });
        
        // 仅保留最近几帧以节省内存
        if (frameIndex > 5) {
          frameCache.delete(frameIndex - 5);
        }
        
        return frameData;
      };
      
      // 使用包含验证的生成器
      await encoderManager.processFrames(totalFrames, validatingFrameGenerator);
    } else {
      // 直接使用原始生成器
      await encoderManager.processFrames(totalFrames, frameGenerator);
    }
    
    // 完成编码
    console.log('视频帧处理完成，等待编码器完成处理...');
    const finalBlob = await encoderManager.finalize();
    
    // 清理资源
    URL.revokeObjectURL(videoUrl);
    videoElement.pause();
    videoElement.src = '';
    videoElement.load();
    videoElement.remove();
    
    console.log(`音视频合成完成! 最终文件大小: ${Math.round(finalBlob.size/1024/1024)}MB`);
    return finalBlob;
    
  } catch (error) {
    console.error('使用VideoEncoderManager音视频合成过程中出错:', error);
    console.error('错误详情:', error.stack);
    
    // 清理资源
    URL.revokeObjectURL(videoUrl);
    videoElement.pause();
    videoElement.src = '';
    videoElement.load();
    videoElement.remove();
    
    // 尝试使用原始方法
    console.log('尝试使用原始方法合成...');
    try {
      const result = await $mergeAudioWithVideo(videoBlob, audioBuffer, options);
      console.log('使用原始方法合成成功');
      return result;
    } catch (fallbackError) {
      console.error('使用原始方法合成也失败:', fallbackError);
      throw error;
    }
  }
}

// 保留原始实现作为备用方案
export async function mergeAudioWithVideoOriginal(videoBlob, audioBuffer, options) {
  console.log('使用原始实现的音视频合成...');
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
    // 返回值占位
    return new Blob([], { type: 'video/mp4' });
  } catch (error) {
    console.error('音视频合成过程中出错:', error);
    URL.revokeObjectURL(videoUrl);
    videoElement.pause();
    throw error;
  }
}

/**
 * 合并视频和音频
 * @param {Blob} videoBlob - 视频Blob对象
 * @param {AudioBuffer} audioBuffer - 音频缓冲区
 * @param {Object} options - 合成选项
 * @returns {Promise<Blob>} 合成后的视频Blob对象
 */
export async function $mergeAudioWithVideo(videoBlob, audioBuffer, options) {
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
    
    // 使用与videoEncoderManager一致的编码器配置
    const bitrate = isMP4 ? 8000000 : 5000000; // MP4: 8 Mbps, WebM: 5 Mbps
    const keyFrameInterval = isMP4 ? Math.round(videoInfo.fps * 2) : Math.round(videoInfo.fps); // 2秒或1秒一个关键帧
    const quality = 0.95; // 高质量设置
    
    // 配置muxer
    const muxerConfig = {
      target,
      video: {
        codec: isMP4 ? 'avc' : 'vp9', // 更新为与videoEncoderManager一致的codec
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
    
    // 配置视频编码器 - 使用与videoEncoderManager.js一致的配置
    videoEncoder.configure({
      codec: isMP4 ? 'avc1.640033' : 'vp09.00.10.08', // 标准化编解码器字符串
      width: videoInfo.width,
      height: videoInfo.height,
      bitrate: bitrate,
      framerate: videoInfo.fps,
      latencyMode: 'quality',
      quality: quality
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
    
    // 重构为分批处理模式，不再使用递归
    console.log('开始提取视频帧...');
    
    // 计算总帧数和其他参数
    const totalFrames = Math.ceil(videoInfo.duration * videoInfo.fps);
    const frameDuration = 1000000 / videoInfo.fps; // 微秒单位
    
    // 确定每批处理的帧数，根据分辨率调整
    const batchSize = videoInfo.width >= 3000 ? 50 : (videoInfo.width >= 2000 ? 100 : 200);
    console.log(`分辨率${videoInfo.width}x${videoInfo.height}，使用批次大小: ${batchSize}`);
    
    // 分批处理所有帧
    for (let startFrame = 0; startFrame < totalFrames; startFrame += batchSize) {
      const endFrame = Math.min(startFrame + batchSize, totalFrames);
      console.log(`处理批次 ${startFrame} 到 ${endFrame-1}，共 ${endFrame - startFrame} 帧`);
      
      // 处理当前批次的所有帧
      for (let frameIndex = startFrame; frameIndex < endFrame; frameIndex++) {
        // 计算精确的帧时间
        const frameTime = frameIndex / videoInfo.fps;
        
        // 设置精确的时间点
        videoElement.currentTime = frameTime;
        
        // 等待视频到达指定时间点
        await new Promise(resolve => {
          videoElement.onseeked = resolve;
        });
        
        // 清除Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制当前帧
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // 创建VideoFrame
        const timestamp = Math.round(frameIndex * frameDuration);
        const isKeyFrame = frameIndex % keyFrameInterval === 0;
        
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
        
        // 关键改进：及时关闭VideoFrame释放资源
        videoFrame.close();
        
        // 更新进度
        if (frameIndex % 30 === 0 || frameIndex === totalFrames - 1) {
          console.log(`视频编码进度: ${frameIndex + 1}/${totalFrames} (${Math.round(((frameIndex + 1) / totalFrames) * 100)}%)`);
        }
      }
      
      // 批次结束后给系统时间进行垃圾回收
      await new Promise(resolve => setTimeout(resolve, 10));
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
        
        // 关闭音频帧以释放资源
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

