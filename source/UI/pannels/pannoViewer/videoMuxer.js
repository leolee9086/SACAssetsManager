import {MP4ArrayBufferTarget,MP4Muxer,Muxer,ArrayBufferTarget} from '../../../../src/toolBox/base/useDeps/useMuxer/useVideoMuxer.js';
// 从 Constants 移动相关配置
export const ENCODER_CONFIG = {
  MP4_BITRATE: 8_000_000,
  WEBM_BITRATE: 10_000_000,
  QUALITY: 0.95,
  KEYFRAME_INTERVAL: {
    mp4: (fps) => fps * 2,
    webm: () => 1
  }
};

// MP4 Muxer 创建函数
function createMP4Muxer(width, height, fps, bitrate, keyFrameInterval, quality) {
  const target = new MP4ArrayBufferTarget();
  const mp4 = new MP4Muxer({
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
  });

  return mp4;
}

// WebM Muxer 创建函数
function createWebMMuxer(width, height, fps, bitrate, quality) {
  const target = new ArrayBufferTarget();
  const webm = new Muxer({
    target,
    video: {
      codec: 'vp8',
      width,
      height,
      bitrate,
      hardwareAcceleration: 'prefer-hardware',
    }
  });

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
  quality
}) {
  return format === 'mp4'
    ? createMP4Muxer(width, height, fps, bitrate, keyFrameInterval, quality)
    : createWebMMuxer(width, height, fps, bitrate, quality);
} 