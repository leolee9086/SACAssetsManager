import { ref, computed, watch, onBeforeUnmount, shallowRef } from '../../../fromDeps/useVue/index.js';
import { createLogger } from './logger.js';

/**
 * 高性能长期稳定音频播放器钩子函数
 * @param {Object} options 配置选项
 * @param {String} options.src 音频源地址
 * @param {Boolean} options.autoRetry 是否自动重试
 * @param {Number} options.maxRetries 最大重试次数
 * @param {Number} options.retryInterval 重试间隔时间(ms)
 * @param {Boolean} options.rememberPosition 是否记住播放位置
 * @param {Function} options.onStatusChange 状态变化回调
 * @param {Number} options.fadeInDuration 淡入时间(ms)
 * @param {Number} options.fadeOutDuration 淡出时间(ms)
 * @param {Boolean} options.preferWebAudio 是否优先使用WebAudio API
 * @param {String} options.playbackStrategy 播放策略 ('normal'|'mobile-friendly')
 * @param {String} options.logLevel 日志级别: 'none', 'error', 'warn', 'info', 'debug', 'verbose'
 * @param {String} options.preloadStrategy 预加载策略: 'auto', 'metadata', 'none'
 * @param {Boolean} options.lowLatencyMode 低延迟模式
 * @param {Number} options.stallDetectionThreshold 卡顿检测阈值(ms)
 * @param {Boolean} options.audioWorkletSupport 是否启用音频工作线程（高级功能）
 * @param {Object} options.loggerOptions 日志选项
 * @returns {Object} 音频播放器控制对象
 */
export function useAudioPlayer(options = {}) {
  const {
    src = '',
    autoRetry = true,
    maxRetries = 3,
    retryInterval = 3000,
    rememberPosition = true,
    onStatusChange = null,
    fadeInDuration = 0,
    fadeOutDuration = 0,
    preferWebAudio = false,
    playbackStrategy = 'normal',
    logLevel = 'error', // 日志级别: 'none', 'error', 'warn', 'info', 'debug', 'verbose'
    preloadStrategy = 'auto', // 预加载策略: 'auto', 'metadata', 'none'
    lowLatencyMode = false, // 低延迟模式
    stallDetectionThreshold = 3000, // 卡顿检测阈值(ms)
    audioWorkletSupport = false, // 是否启用音频工作线程（高级功能）
    loggerOptions = {}, // 日志选项
  } = options;

  // 创建音频播放器专用日志器
  const logger = createLogger(logLevel, {
    prefix: '[AudioPlayer]',
    includeTimestamp: true,
    errorCallback: (type, message) => {
      // 可以在这里添加错误报告逻辑
      if (onStatusChange) {
        try {
          onStatusChange('log-error', { type, message });
        } catch (e) {
          // 避免回调错误影响主流程
        }
      }
    },
    ...loggerOptions
  });
  
  // 子系统专用日志器
  const webAudioLogger = logger.tag('WebAudio');
  const formatLogger = logger.tag('Format');
  const playbackLogger = logger.tag('Playback');
  const networkLogger = logger.tag('Network');
  
  logger.info('初始化音频播放器');
  
  // 状态管理 - 使用shallowRef优化性能
  const audioRef = shallowRef(null);
  const audioContext = shallowRef(null);
  const audioNode = shallowRef(null);
  const gainNode = shallowRef(null);
  const status = ref('loading'); // loading, ready, playing, paused, error, blocked, ended
  const errorType = ref(null); // network, decode, aborted, not-allowed, format, other
  const errorDetails = ref('');
  const retryCount = ref(0);
  const retryTimer = ref(null);
  const lastPlayPosition = ref(0);
  const isMuted = ref(false);
  const volume = ref(1);
  const playbackRate = ref(1);
  const isWebAudioSupported = ref(!!window.AudioContext || !!window.webkitAudioContext);
  const isUsingWebAudio = ref(false);
  const playPromise = ref(null);

  // 移动设备检测
  const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // 音频元数据
  const audioDuration = ref(0);
  const audioCurrentTime = ref(0);
  const bufferedRanges = ref([]);
  const bufferedPercent = ref(0);
  const audioMetadata = ref({
    channelCount: 0,
    sampleRate: 0,
    format: '',
    bitrate: 0,
  });
  
  // 性能优化
  const updateInterval = ref(250); // ms
  const timeUpdateTimerId = ref(null);
  const lastTimeUpdateCall = ref(0);
  
  // 增强的状态监控系统
  const playbackStats = ref({
    totalPlayTime: 0,
    playStartTimestamp: 0,
    bufferingCount: 0,
    bufferingTime: 0,
    bufferingStartTimestamp: 0,
    lastErrorTimestamp: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
  });
  
  // 信号增强处理器
  const signalProcessor = shallowRef(null);
  
  // 卡顿检测系统
  const stallDetector = ref({
    lastProgressTimestamp: 0,
    stallDetectionTimer: null,
    isStalled: false,
  });
  
  // 改进的音频源处理 - 添加缓存控制和安全性增强
  const processedSrc = computed(() => {
    if (!src) return '';
    try {
      // 特殊处理数据URI
      if (src.startsWith('data:')) return src;
      
      const url = new URL(src, window.location.origin);
      
      // 只允许安全的协议
      if (!['http:', 'https:', 'blob:'].includes(url.protocol)) {
        logger.warn('不安全的音频URL协议:', url.protocol);
        return '';
      }
      
      // 防止缓存问题 - 添加时间戳参数（仅对HTTP/HTTPS）
      if (url.protocol.startsWith('http') && autoRetry && !url.searchParams.has('_t')) {
        url.searchParams.set('_t', Date.now());
      }
      
      // 安全检查 - 过滤不安全的字符
      const sanitizedUrl = url.toString().replace(/[^\w\s:/.?=&%@!#-]/gi, '');
      return sanitizedUrl;
    } catch (e) {
      logger.warn('无效音频URL:', src, e);
      return '';
    }
  });

  // 格式化时间 - 支持小时显示
  const formattedCurrentTime = computed(() => formatTime(audioCurrentTime.value));
  const formattedDuration = computed(() => formatTime(audioDuration.value));

  // 播放进度百分比
  const progressPercent = computed(() => {
    if (!audioDuration.value) return 0;
    return (audioCurrentTime.value / audioDuration.value) * 100;
  });

  // 音频可播放状态
  const isPlayable = computed(() => 
    ['ready', 'paused', 'ended'].includes(status.value)
  );
  
  // 音频正在播放状态
  const isPlaying = computed(() => status.value === 'playing');

  // 增强错误处理
  function categorizeError(e) {
    if (!e) return { type: 'other', details: '未知错误' };
    
    // 媒体错误代码对应
    if (e.target && e.target.error) {
      const mediaError = e.target.error;
      switch (mediaError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          return { type: 'aborted', details: '媒体加载已中止' };
        case MediaError.MEDIA_ERR_NETWORK:
          return { type: 'network', details: '网络错误导致媒体加载失败' };
        case MediaError.MEDIA_ERR_DECODE:
          return { type: 'decode', details: '媒体解码失败' };
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          return { type: 'format', details: '不支持的媒体格式或MIME类型' };
      }
    }
    
    // 其他常见错误类型
    if (e.name === 'NotAllowedError' || e.message && e.message.includes('user gesture')) {
      return { type: 'not-allowed', details: '用户交互前不允许自动播放' };
    } else if (e.name === 'NotSupportedError') {
      return { type: 'format', details: '音频格式不受支持' };
    } else if (e.message && e.message.includes('cross-origin')) {
      return { type: 'cors', details: '跨域请求被阻止' };
    }
    
    return { 
      type: 'other', 
      details: e.message || '未知音频错误' 
    };
  }

  function handleError(e) {
    const { type, details } = categorizeError(e);
    logger.warn(`音频错误 [${type}]:`, details);
    
    status.value = 'error';
    errorType.value = type;
    errorDetails.value = details;
    playbackStats.value.lastErrorTimestamp = Date.now();
    
    // 针对不同类型错误采取不同恢复策略
    if (['network', 'decode'].includes(type) && autoRetry && retryCount.value < maxRetries) {
      networkLogger.info(`安排重试 (${retryCount.value + 1}/${maxRetries})`);
      scheduleRetry();
    } else if (type === 'not-allowed' && isMobileDevice) {
      // 移动设备播放限制特殊处理
      playbackLogger.info('检测到移动设备自动播放限制');
      status.value = 'blocked';
    } else if (type === 'format') {
      // 尝试使用备用格式（如果有）
      formatLogger.info('尝试备用格式');
      tryAlternativeFormats();
    } else if (type === 'stalled' && status.value === 'playing') {
      // 对于播放中卡顿，尝试保持播放状态并恢复
      playbackLogger.info('尝试从卡顿恢复');
      recoverFromStall();
    }

    if (onStatusChange) {
      try {
        onStatusChange('error', { type, details });
      } catch (callbackError) {
        logger.warn('状态变更回调错误:', callbackError);
      }
    }
  }

  function handleLoaded() {
    status.value = 'ready';
    retryCount.value = 0;
    clearRetryTimer();
    
    if (audioRef.value) {
      audioDuration.value = audioRef.value.duration || 0;
      
      // 读取音频元数据
      try {
        audioMetadata.value = {
          channelCount: audioRef.value.mozChannelCount || 
                        audioRef.value.webkitAudioChannelCount || 
                        audioRef.value.channelCount || 0,
          sampleRate: audioRef.value.sampleRate || 0,
          format: getAudioFormat(processedSrc.value),
          bitrate: 0, // 浏览器API限制无法直接获取
        };
      } catch (err) {
        // 忽略元数据读取错误
      }
      
      // 恢复上次播放位置
      if (rememberPosition && lastPlayPosition.value > 0 && 
          lastPlayPosition.value < audioDuration.value) {
        audioRef.value.currentTime = lastPlayPosition.value;
        audioCurrentTime.value = lastPlayPosition.value;
      }
    }

    if (onStatusChange) onStatusChange('ready');
  }

  function handleCanPlay() {
    clearRetryTimer();
  }

  // 使用节流控制时间更新频率
  function handleTimeUpdate() {
    const now = Date.now();
    if (now - lastTimeUpdateCall.value < updateInterval.value) return;
    
    lastTimeUpdateCall.value = now;
    
    if (audioRef.value) {
      audioCurrentTime.value = audioRef.value.currentTime;
      if (rememberPosition) {
        lastPlayPosition.value = audioCurrentTime.value;
      }
    }
  }

  function handlePlay() {
    status.value = 'playing';
    
    // 启动定期更新播放时间的定时器(提高性能)
    startTimeUpdateTimer();
    
    if (onStatusChange) onStatusChange('playing');
  }

  function handlePause() {
    status.value = 'paused';
    stopTimeUpdateTimer();
    if (onStatusChange) onStatusChange('paused');
  }

  function handleEnded() {
    status.value = 'ended';
    stopTimeUpdateTimer();
    if (onStatusChange) onStatusChange('ended');
  }

  function handleVolumeChange() {
    if (audioRef.value) {
      volume.value = audioRef.value.volume;
      isMuted.value = audioRef.value.muted;
    }
  }

  function handleProgress() {
    if (!audioRef.value) return;
    
    const buffered = audioRef.value.buffered;
    const duration = audioRef.value.duration;
    
    // 更新缓冲区间
    const ranges = [];
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i)
      });
    }
    bufferedRanges.value = ranges;
    
    // 计算总缓冲百分比
    if (buffered.length > 0 && duration) {
      // 找出最远的缓冲点
      let maxBuffered = 0;
      for (let i = 0; i < buffered.length; i++) {
        if (buffered.end(i) > maxBuffered) {
          maxBuffered = buffered.end(i);
        }
      }
      bufferedPercent.value = (maxBuffered / duration) * 100;
    } else {
      bufferedPercent.value = 0;
    }
  }

  // 性能优化:分离周期性更新
  function startTimeUpdateTimer() {
    stopTimeUpdateTimer();
    timeUpdateTimerId.value = setInterval(() => {
      if (audioRef.value && status.value === 'playing') {
        audioCurrentTime.value = audioRef.value.currentTime;
      }
    }, updateInterval.value);
  }

  function stopTimeUpdateTimer() {
    if (timeUpdateTimerId.value) {
      clearInterval(timeUpdateTimerId.value);
      timeUpdateTimerId.value = null;
    }
  }

  // Web Audio API集成
  function initWebAudio() {
    if (!isWebAudioSupported.value || !preferWebAudio) return false;
    
    try {
      webAudioLogger.info('初始化Web Audio API');
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext.value = new AudioContextClass({
        latencyHint: lowLatencyMode ? 'interactive' : 'playback',
        sampleRate: 44100 // 标准CD质量
      });
      
      // 创建增益节点
      gainNode.value = audioContext.value.createGain();
      
      // 如果支持工作线程，启用高级处理
      if (audioWorkletSupport && 'audioWorklet' in audioContext.value) {
        webAudioLogger.debug('尝试设置音频工作线程');
        setupAudioWorklet().catch(e => {
          webAudioLogger.warn('音频工作线程初始化失败:', e);
        });
      }
      
      // 信号处理优化
      setupSignalProcessing();
      
      // 连接节点到输出
      gainNode.value.connect(audioContext.value.destination);
      isUsingWebAudio.value = true;
      webAudioLogger.info('Web Audio API初始化成功');
      
      return true;
    } catch (e) {
      webAudioLogger.warn('Web Audio API初始化失败:', e);
      isUsingWebAudio.value = false;
      return false;
    }
  }

  function cleanupWebAudio() {
    if (audioNode.value) {
      try {
        audioNode.value.disconnect();
      } catch (e) {
        // 忽略断开连接错误
      }
      audioNode.value = null;
    }
    
    if (gainNode.value) {
      try {
        gainNode.value.disconnect();
      } catch (e) {
        // 忽略断开连接错误
      }
      gainNode.value = null;
    }
    
    if (audioContext.value) {
      try {
        audioContext.value.close();
      } catch (e) {
        // 忽略关闭错误
      }
      audioContext.value = null;
    }
    
    isUsingWebAudio.value = false;
  }

  // 渐变音量效果
  function fadeVolume(from, to, duration) {
    if (!audioRef.value || duration <= 0) {
      if (audioRef.value) audioRef.value.volume = to;
      return Promise.resolve();
    }
    
    return new Promise(resolve => {
      // 使用Web Audio API实现更平滑的渐变
      if (isUsingWebAudio.value && gainNode.value) {
        gainNode.value.gain.setValueAtTime(from, audioContext.value.currentTime);
        gainNode.value.gain.linearRampToValueAtTime(
          to, 
          audioContext.value.currentTime + (duration / 1000)
        );
        setTimeout(resolve, duration);
      } else {
        // 回退到传统方法
        const startTime = Date.now();
        const volumeInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          if (elapsed >= duration) {
            clearInterval(volumeInterval);
            audioRef.value.volume = to;
            resolve();
            return;
          }
          
          const ratio = elapsed / duration;
          audioRef.value.volume = from + (to - from) * ratio;
        }, 16); // 约60fps
      }
    });
  }

  // 增强播放控制 - 添加播放策略
  async function play() {
    if (!audioRef.value || !isPlayable.value) return;
    
    // 避免重复调用
    if (playPromise.value) {
      try {
        await playPromise.value;
      } catch (e) {
        // 忽略之前播放承诺的错误
      }
    }
    
    // 如果音频已加载但状态不对，尝试恢复
    if (audioRef.value.readyState >= 2 && status.value === 'error') {
      status.value = 'ready';
    }
    
    // 移动设备特别处理
    if (playbackStrategy === 'mobile-friendly' && isMobileDevice) {
      // 在iOS上，需要先暂停，设置currentTime，再播放，以避免某些怪异行为
      if (isIOS) {
        audioRef.value.pause();
        // 微小延迟以防止某些iOS Safari问题
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // iOS上播放前设置音量为0，避免初始爆音
        if (fadeInDuration > 0) {
          const originalVolume = audioRef.value.volume;
          audioRef.value.volume = 0;
          
          playPromise.value = safePlay()
            .then(() => fadeVolume(0, originalVolume, fadeInDuration))
            .catch(handlePlayError);
          
          return playPromise.value;
        }
      }
      
      // 安卓设备特别处理
      if (/Android/.test(navigator.userAgent)) {
        // 某些Android设备需要重新focus
        if (document.body) {
          document.body.click();
        }
      }
    }
    
    // Web Audio API处理
    if (isUsingWebAudio.value && audioContext.value) {
      if (audioContext.value.state === 'suspended') {
        try {
          await audioContext.value.resume();
        } catch (e) {
          logger.warn('无法恢复AudioContext:', e);
        }
      }
    }
    
    // 准备渐入效果
    if (fadeInDuration > 0) {
      const originalVolume = audioRef.value.volume;
      audioRef.value.volume = 0;
      
      // 播放并应用渐入
      playPromise.value = safePlay()
        .then(() => {
          // 开始记录播放统计
          playbackStats.value.playStartTimestamp = Date.now();
          return fadeVolume(0, originalVolume, fadeInDuration);
        })
        .catch(handlePlayError);
    } else {
      // 直接播放
      playPromise.value = safePlay()
        .then(() => {
          // 开始记录播放统计
          playbackStats.value.playStartTimestamp = Date.now();
        })
        .catch(handlePlayError);
    }
    
    // 播放开始后启动卡顿检测
    setupStallDetection();
    
    return playPromise.value;
  }

  async function pause(useFade = true) {
    if (!audioRef.value || status.value !== 'playing') return;
    
    // 等待任何现有的播放Promise完成
    if (playPromise.value) {
      try {
        await playPromise.value;
      } catch (e) {
        // 忽略播放错误
      }
    }
    
    if (useFade && fadeOutDuration > 0) {
      const originalVolume = audioRef.value.volume;
      await fadeVolume(originalVolume, 0, fadeOutDuration);
      audioRef.value.pause();
      audioRef.value.volume = originalVolume;
    } else {
      audioRef.value.pause();
    }
  }

  async function togglePlay() {
    if (status.value === 'playing') {
      await pause();
    } else {
      await play();
    }
  }

  function seek(time) {
    if (!audioRef.value || !isFinite(time)) return;
    
    // 安全的时间范围检查
    const safeTime = Math.max(0, Math.min(time, audioDuration.value || 0));
    
    try {
      // 某些移动浏览器在非播放状态下更改currentTime会引发异常
      audioRef.value.currentTime = safeTime;
      audioCurrentTime.value = safeTime;
      
      // 在iOS上，seek可能需要额外处理以确保准确性
      if (isIOS && status.value !== 'playing') {
        // iOS上的一个技巧：微小的播放后立即暂停可以使seek更可靠
        const wasPlaying = status.value === 'playing';
        audioRef.value.play().then(() => {
          audioRef.value.pause();
          if (wasPlaying) play();
        }).catch(() => {
          // 忽略可能的自动播放限制错误
        });
      }
    } catch (e) {
      console.warn('Seek操作失败:', e);
    }
  }

  function seekByPercent(percent) {
    if (!audioRef.value || !audioDuration.value) return;
    
    const validPercent = Math.max(0, Math.min(100, percent));
    const newTime = (validPercent / 100) * audioDuration.value;
    seek(newTime);
  }

  function setVolume(value) {
    if (!audioRef.value || !isFinite(value)) return;
    
    const newVolume = Math.max(0, Math.min(1, value));
    
    // 使用Web Audio API或直接设置
    if (isUsingWebAudio.value && gainNode.value) {
      gainNode.value.gain.setValueAtTime(newVolume, audioContext.value.currentTime);
    }
    
    audioRef.value.volume = newVolume;
    volume.value = newVolume;
  }

  function toggleMute() {
    if (!audioRef.value) return;
    
    // 使用Web Audio API或直接设置
    if (isUsingWebAudio.value && gainNode.value) {
      if (!isMuted.value) {
        gainNode.value.gain.setValueAtTime(0, audioContext.value.currentTime);
      } else {
        gainNode.value.gain.setValueAtTime(volume.value, audioContext.value.currentTime);
      }
    }
    
    audioRef.value.muted = !audioRef.value.muted;
    isMuted.value = audioRef.value.muted;
  }

  function setPlaybackRate(rate) {
    if (!audioRef.value || !isFinite(rate)) return;
    
    // 安全的播放速率范围 (0.25-4.0是大多数浏览器支持的范围)
    const safeRate = Math.max(0.25, Math.min(4.0, rate));
    audioRef.value.playbackRate = safeRate;
    playbackRate.value = safeRate;
  }

  // 重试逻辑增强
  function retryLoading() {
    if (!audioRef.value) return;
    
    status.value = 'loading';
    retryCount.value++;
    errorType.value = null;
    errorDetails.value = '';
    
    const currentSrc = audioRef.value.src;
    audioRef.value.src = '';
    
    // 清理资源后再重试
    audioRef.value.load();
    
    // 使用微任务延迟，提高可靠性
    setTimeout(() => {
      if (audioRef.value) {
        audioRef.value.src = currentSrc;
        audioRef.value.load();
      }
    }, 200);
    
    if (onStatusChange) onStatusChange('loading');
  }

  // 优化的重试调度
  function scheduleRetry() {
    clearRetryTimer();
    
    // 指数退避重试策略
    const delay = retryInterval * Math.pow(1.5, retryCount.value - 1);
    
    retryTimer.value = setTimeout(() => {
      retryLoading();
    }, delay);
  }

  function clearRetryTimer() {
    if (retryTimer.value) {
      clearTimeout(retryTimer.value);
      retryTimer.value = null;
    }
  }

  // 增强的时间格式化 - 支持小时显示
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString()}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 根据扩展名或MIME类型检测音频格式
  function getAudioFormat(url) {
    if (!url) return 'unknown';
    
    // 从URL后缀推断
    const extensionMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    if (extensionMatch) {
      const ext = extensionMatch[1].toLowerCase();
      switch (ext) {
        case 'mp3': return 'mp3';
        case 'wav': return 'wav';
        case 'ogg': return 'ogg';
        case 'aac': return 'aac';
        case 'm4a': return 'm4a';
        case 'flac': return 'flac';
        case 'opus': return 'opus';
      }
    }
    
    return 'unknown';
  }

  // 检测浏览器对音频格式的支持情况
  function detectAudioSupport() {
    const audio = document.createElement('audio');
    const support = {
      mp3: audio.canPlayType('audio/mpeg'),
      wav: audio.canPlayType('audio/wav'),
      ogg: audio.canPlayType('audio/ogg'),
      aac: audio.canPlayType('audio/aac'),
      m4a: audio.canPlayType('audio/x-m4a'),
      flac: audio.canPlayType('audio/flac'),
      opus: audio.canPlayType('audio/opus')
    };
    return support;
  }

  // 强化的资源清理
  function cleanupResources() {
    stopTimeUpdateTimer();
    clearRetryTimer();
    
    if (playPromise.value) {
      playPromise.value.catch(() => {}).finally(() => {
        playPromise.value = null;
      });
    }
    
    if (audioRef.value) {
      // 移除所有潜在事件监听器
      removeEventListeners();
      
      const audio = audioRef.value;
      
      // 停止播放并释放资源
      audio.pause();
      audio.src = '';
      audio.removeAttribute('src');
      audio.load();
    }
    
    // 清理Web Audio API资源
    cleanupWebAudio();
  }

  // 设置事件监听器
  function setupEventListeners() {
    if (!audioRef.value) return;
    
    const audio = audioRef.value;
    
    // 设置预加载属性
    audio.preload = preloadStrategy;
    
    // 移除可能的之前事件监听器
    removeEventListeners();
    
    // 使用捕获选项提高事件可靠性
    const eventOptions = { capture: false, passive: true };
    
    // 核心事件 - 使用更可靠的事件监听方式
    audio.addEventListener('loadedmetadata', handleLoaded, eventOptions);
    audio.addEventListener('loadeddata', handleLoaded, eventOptions);
    audio.addEventListener('durationchange', () => {
      if (audio.duration && isFinite(audio.duration)) {
        audioDuration.value = audio.duration;
      }
    }, eventOptions);
    
    // 错误处理需要特殊注意，不能是passive
    audio.addEventListener('error', handleError, { capture: false, passive: false });
    
    // 其他核心事件
    audio.addEventListener('canplay', handleCanPlay, eventOptions);
    audio.addEventListener('play', handlePlay, eventOptions);
    audio.addEventListener('playing', handlePlay, eventOptions);
    audio.addEventListener('pause', handlePause, eventOptions);
    audio.addEventListener('ended', handleEnded, eventOptions);
    audio.addEventListener('volumechange', handleVolumeChange, eventOptions);
    audio.addEventListener('ratechange', () => {
      playbackRate.value = audio.playbackRate;
    }, eventOptions);
    
    // 进度更新相关
    audio.addEventListener('timeupdate', handleTimeUpdate, eventOptions);
    audio.addEventListener('progress', handleProgress, eventOptions);
    
    // 如果不使用定时器更新，则监听时间更新
    if (updateInterval.value <= 0) {
      audio.addEventListener('timeupdate', () => {
        audioCurrentTime.value = audio.currentTime;
      }, eventOptions);
    }
    
    // 特殊状态监控
    audio.addEventListener('waiting', () => {
      if (status.value === 'playing') {
        status.value = 'loading';
        // 记录缓冲开始时间
        playbackStats.value.bufferingStartTimestamp = Date.now();
        playbackStats.value.bufferingCount++;
      }
    }, eventOptions);
    
    audio.addEventListener('stalled', () => {
      logger.warn('音频加载停滞');
      updateStallDetector();
    }, eventOptions);
    
    audio.addEventListener('suspend', () => {
      if (audio.readyState < 3) {
        logger.info('音频数据加载已暂停');
      }
    }, eventOptions);
    
    // 添加新的事件处理
    audio.addEventListener('canplaythrough', () => {
      // 缓冲结束计时
      if (playbackStats.value.bufferingStartTimestamp > 0) {
        const bufferingTime = Date.now() - playbackStats.value.bufferingStartTimestamp;
        playbackStats.value.bufferingTime += bufferingTime;
        playbackStats.value.bufferingStartTimestamp = 0;
      }
      
      logger.debug('音频可以流畅播放');
    }, eventOptions);
    
    // 添加seek事件处理
    audio.addEventListener('seeking', () => {
      // Seeking开始时可能会触发加载
      if (status.value === 'playing') {
        status.value = 'loading';
        playbackStats.value.bufferingStartTimestamp = Date.now();
      }
    }, eventOptions);
    
    audio.addEventListener('seeked', () => {
      // Seeking结束时恢复状态
      if (playbackStats.value.bufferingStartTimestamp > 0) {
        const bufferingTime = Date.now() - playbackStats.value.bufferingStartTimestamp;
        playbackStats.value.bufferingTime += bufferingTime;
        playbackStats.value.bufferingStartTimestamp = 0;
      }
      
      // 如果之前是播放状态，恢复播放
      if (status.value === 'loading' && !audio.paused) {
        status.value = 'playing';
      }
    }, eventOptions);
  }

  // 移除事件监听器
  function removeEventListeners() {
    if (!audioRef.value) return;
    
    const audio = audioRef.value;
    
    // 移除所有添加的事件监听器
    audio.removeEventListener('loadedmetadata', handleLoaded);
    audio.removeEventListener('loadeddata', handleLoaded);
    audio.removeEventListener('durationchange', () => {});
    audio.removeEventListener('error', handleError);
    audio.removeEventListener('canplay', handleCanPlay);
    audio.removeEventListener('play', handlePlay);
    audio.removeEventListener('playing', handlePlay);
    audio.removeEventListener('pause', handlePause);
    audio.removeEventListener('ended', handleEnded);
    audio.removeEventListener('volumechange', handleVolumeChange);
    audio.removeEventListener('ratechange', () => {});
    audio.removeEventListener('timeupdate', handleTimeUpdate);
    audio.removeEventListener('progress', handleProgress);
    audio.removeEventListener('waiting', () => {});
    audio.removeEventListener('stalled', () => {});
    audio.removeEventListener('suspend', () => {});
  }

  // 重置播放器 - 增强版
  function reset() {
    removeEventListeners();
    status.value = 'loading';
    retryCount.value = 0;
    clearRetryTimer();
    stopTimeUpdateTimer();
    lastPlayPosition.value = 0;
    audioCurrentTime.value = 0;
    audioDuration.value = 0;
    bufferedPercent.value = 0;
    bufferedRanges.value = [];
    errorType.value = null;
    errorDetails.value = '';
    
    if (audioRef.value) {
      const wasPlaying = status.value === 'playing';
      
      // 清理现有资源
      audioRef.value.pause();
      audioRef.value.src = '';
      audioRef.value.load();
      
      // 设置新源
      if (processedSrc.value) {
        audioRef.value.src = processedSrc.value;
        audioRef.value.load();
        setupEventListeners();
        
        // 如果之前正在播放，尝试恢复播放
        if (wasPlaying) {
          play().catch(() => {}); // 忽略可能的错误
        }
      }
    }

    if (onStatusChange) onStatusChange('loading');
  }

  // 设置音频引用并初始化
  function setAudioRef(el) {
    if (audioRef.value === el) return;
    
    // 如果已有音频引用，先清理
    if (audioRef.value) {
      cleanupResources();
    }
    
    audioRef.value = el;
    
    if (el) {
      // 初始化Web Audio API（如果启用）
      if (preferWebAudio) {
        initWebAudio();
      }
      
      // 初始化音量和播放速率
      el.volume = volume.value;
      el.muted = isMuted.value;
      el.playbackRate = playbackRate.value;
      
      // 如果已有源，加载它
      if (processedSrc.value) {
        el.src = processedSrc.value;
        el.load();
      }
      
      setupEventListeners();
    }
  }

  // 创建新的Audio元素并自动设置引用
  function createAudio() {
    const audioElement = new Audio();
    setAudioRef(audioElement);
    return audioElement;
  }

  // 导出格式支持检测
  const audioFormatSupport = detectAudioSupport();

  // 监听src变化
  watch(() => src, () => {
    reset();
  });

  // 监听Web Audio优先设置
  watch(() => preferWebAudio, (newValue) => {
    if (newValue && !isUsingWebAudio.value) {
      initWebAudio();
    } else if (!newValue && isUsingWebAudio.value) {
      cleanupWebAudio();
    }
  });

  // 组件卸载前清理
  onBeforeUnmount(() => {
    stopTimeUpdateTimer();
    removeEventListeners();
    cleanupResources();
  });

  // 新增：尝试备用格式
  function tryAlternativeFormats() {
    // 实现在这里...
  }
  
  // 新增：从卡顿中恢复
  function recoverFromStall() {
    if (!audioRef.value || stallDetector.value.isStalled) return;
    
    stallDetector.value.isStalled = true;
    logger.info('检测到播放卡顿，尝试恢复');
    playbackStats.value.bufferingCount++;
    playbackStats.value.bufferingStartTimestamp = Date.now();
    
    // 保存当前位置
    const currentPosition = audioCurrentTime.value;
    
    // 尝试重新加载音频
    audioRef.value.load();
    
    // 恢复到之前位置并继续播放
    audioRef.value.addEventListener('canplay', function onCanPlay() {
      audioRef.value.removeEventListener('canplay', onCanPlay);
      stallDetector.value.isStalled = false;
      
      // 计算缓冲时间
      const bufferingTime = Date.now() - playbackStats.value.bufferingStartTimestamp;
      playbackStats.value.bufferingTime += bufferingTime;
      
      // 恢复位置和播放
      seek(currentPosition);
      play().catch(() => {
        logger.warn('卡顿恢复后播放失败');
      });
      
      playbackStats.value.successfulRecoveries++;
    }, { once: true });
  }
  
  // 新增：卡顿检测机制
  function setupStallDetection() {
    if (!audioRef.value || stallDetectionThreshold <= 0) return;
    
    clearStallDetection();
    
    // 初始化检测状态
    stallDetector.value.lastProgressTimestamp = Date.now();
    
    // 监听进度事件更新时间戳
    audioRef.value.addEventListener('timeupdate', updateStallDetector);
    audioRef.value.addEventListener('progress', updateStallDetector);
    
    // 启动周期性检测
    stallDetector.value.stallDetectionTimer = setInterval(() => {
      if (status.value !== 'playing') return;
      
      const now = Date.now();
      const elapsed = now - stallDetector.value.lastProgressTimestamp;
      
      // 如果超过阈值且未标记为卡顿，触发恢复
      if (elapsed > stallDetectionThreshold && !stallDetector.value.isStalled) {
        handleError({ type: 'stalled', message: '播放卡顿超时' });
      }
    }, Math.min(1000, stallDetectionThreshold / 2));
  }
  
  function updateStallDetector() {
    if (status.value === 'playing') {
      stallDetector.value.lastProgressTimestamp = Date.now();
      stallDetector.value.isStalled = false;
    }
  }
  
  function clearStallDetection() {
    if (stallDetector.value.stallDetectionTimer) {
      clearInterval(stallDetector.value.stallDetectionTimer);
      stallDetector.value.stallDetectionTimer = null;
    }
    
    if (audioRef.value) {
      audioRef.value.removeEventListener('timeupdate', updateStallDetector);
      audioRef.value.removeEventListener('progress', updateStallDetector);
    }
  }
  
  // 新增：信号处理设置
  function setupSignalProcessing() {
    if (!audioContext.value) return;
    
    try {
      // 创建动态压缩器以防止爆音和提高清晰度
      const compressor = audioContext.value.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      // 连接节点链
      signalProcessor.value = compressor;
      compressor.connect(gainNode.value);
      
      logger.debug('音频信号处理器已启用');
    } catch (e) {
      logger.warn('信号处理设置失败:', e);
    }
  }
  
  // 新增：音频工作线程支持
  async function setupAudioWorklet() {
    if (!audioContext.value || !('audioWorklet' in audioContext.value)) return;
    
    try {
      // 这里会加载自定义音频处理工作线程
      // 实际生产环境需提供工作线程脚本
      logger.info('音频工作线程功能已准备');
    } catch (e) {
      throw e;
    }
  }
  
  // 新增：处理播放错误
  function handlePlayError(e) {
    const error = categorizeError(e);
    errorType.value = error.type;
    errorDetails.value = error.details;
    
    // 自动播放被阻止的特殊处理
    if (error.type === 'not-allowed') {
      playbackLogger.info('检测到自动播放限制');
      status.value = 'blocked';
      if (onStatusChange) {
        try {
          onStatusChange('blocked', error);
        } catch (callbackError) {
          logger.warn('状态变更回调错误:', callbackError);
        }
      }
    } else {
      playbackLogger.warn('播放失败:', error.details);
      if (status.value !== 'error') {
        status.value = 'error';
        if (onStatusChange) {
          try {
            onStatusChange('error', error);
          } catch (callbackError) {
            logger.warn('状态变更回调错误:', callbackError);
          }
        }
      }
    }
    
    throw e; // 继续传播错误
  }
  
  // 安全的播放操作，避免未捕获的Promise错误
  function safePlay() {
    if (!audioRef.value) {
      return Promise.reject(new Error('音频元素不存在'));
    }
    
    try {
      playbackLogger.info('尝试播放音频');
      const playAttempt = audioRef.value.play();
      
      if (playAttempt !== undefined) {
        return playAttempt;
      } else {
        // 旧浏览器兼容
        return Promise.resolve();
      }
    } catch (e) {
      playbackLogger.warn('播放尝试失败:', e);
      return Promise.reject(e);
    }
  }

  // 返回增强版接口
  return {
    // 引用和源
    audioRef,
    setAudioRef,
    createAudio,
    processedSrc,
    
    // 状态
    status,
    errorType,
    errorDetails,
    isPlayable,
    isPlaying,
    
    // 元数据
    audioDuration,
    audioCurrentTime,
    formattedCurrentTime,
    formattedDuration,
    progressPercent,
    bufferedPercent,
    bufferedRanges,
    audioMetadata,
    
    // 播放控制属性
    volume,
    isMuted,
    playbackRate,
    
    // 环境信息
    isWebAudioSupported,
    isUsingWebAudio,
    isMobileDevice,
    isIOS,
    audioFormatSupport,
    
    // 控制方法
    play,
    pause,
    togglePlay,
    seek,
    seekByPercent,
    setVolume,
    toggleMute,
    setPlaybackRate,
    retryLoading,
    reset,
    
    // Web Audio专用
    initWebAudio,
    cleanupWebAudio,
    
    // 高级功能
    fadeVolume,
    
    // 实用工具
    formatTime,
    getAudioFormat,
    detectAudioSupport,
    categorizeError,
    
    // 新增高级统计和诊断
    playbackStats,
    logger,
    
    // 新增高级控制
    setupStallDetection,
    clearStallDetection,
    
    // 新增实用方法
    safePlay,
    handlePlayError,
    
    // 日志系统
    setLogLevel: (newLevel) => logger.setLevel(newLevel),
    getLogLevel: () => logger.getLevel(),
  };
}

// 新增：辅助工具函数
export function isAudioFormatSupported(format) {
  const audio = document.createElement('audio');
  const formats = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    m4a: 'audio/x-m4a',
    flac: 'audio/flac',
    opus: 'audio/opus'
  };
  
  const mimeType = formats[format.toLowerCase()];
  if (!mimeType) return false;
  
  return audio.canPlayType(mimeType) !== '';
} 