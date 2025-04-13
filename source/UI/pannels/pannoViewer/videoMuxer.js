import {MP4ArrayBufferTarget,MP4Muxer,Muxer,ArrayBufferTarget} from '../../../../src/toolBox/base/useDeps/useMuxer/useVideoMuxer.js';
// 从 Constants 移动相关配置
export const ENCODER_CONFIG = {
  MP4_BITRATE: 8_000_000,
  WEBM_BITRATE: 10_000_000,
  QUALITY: 0.95,
  KEYFRAME_INTERVAL: {
    mp4: (fps) => fps * 2,
    webm: () => 1
  },
  // 添加音频配置
  AUDIO: {
    MP4_CODEC: 'aac',       // AAC编码
    WEBM_CODEC: 'opus',      // Opus编码
    BITRATE: 192000,         // 192kbps
    SAMPLE_RATE: 48000       // 48kHz
  }
};

// MP4 Muxer 创建函数
function createMP4Muxer(width, height, fps, bitrate, keyFrameInterval, quality, audioConfig = null) {
  const target = new MP4ArrayBufferTarget();
  const config = {
    target,
    fastStart: 'in-memory',
    video: {
      codec: 'avc',
      width,
      height,
      bitrate,
      hardwareAcceleration: 'prefer-hardware',
      avc: { format: 'avc' },
      keyFrameInterval,
    }
  };
  
  // 添加音频配置（如果提供）
  if (audioConfig) {
    config.audio = {
      codec: 'aac',
      numberOfChannels: audioConfig.numberOfChannels || 2,
      sampleRate: audioConfig.sampleRate || ENCODER_CONFIG.AUDIO.SAMPLE_RATE,
      bitrate: audioConfig.bitrate || ENCODER_CONFIG.AUDIO.BITRATE
    };
  }
  
  const mp4 = new MP4Muxer(config);
  return mp4;
}

// WebM Muxer 创建函数
function createWebMMuxer(width, height, fps, bitrate, quality, audioConfig = null) {
  const target = new ArrayBufferTarget();
  const config = {
    target,
    video: {
      codec: 'vp8',
      width,
      height,
      bitrate,
      hardwareAcceleration: 'prefer-hardware',
    }
  };
  
  // 添加音频配置（如果提供）
  if (audioConfig) {
    config.audio = {
      codec: 'opus',
      numberOfChannels: audioConfig.numberOfChannels || 2,
      sampleRate: audioConfig.sampleRate || ENCODER_CONFIG.AUDIO.SAMPLE_RATE,
      bitrate: audioConfig.bitrate || ENCODER_CONFIG.AUDIO.BITRATE
    };
  }
  
  const webm = new Muxer(config);
  return webm;
}

// 主要的 Muxer 创建函数
export function createMuxer({
  format,
  width,
  height,
  fps,
  bitrate,
  keyFrameInterval,
  quality,
  audioConfig = null
}) {
  return format === 'mp4'
    ? createMP4Muxer(width, height, fps, bitrate, keyFrameInterval, quality, audioConfig)
    : createWebMMuxer(width, height, fps, bitrate, quality, audioConfig);
} 