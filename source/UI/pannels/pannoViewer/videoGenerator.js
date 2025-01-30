export class VideoGenerator {
  constructor(width, height, format = 'mp4', fps = 30) {
    this.width = width;
    this.height = height;
    this.format = format;
    this.fps = fps;
    this.progressCallback = null;
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  async generateFromFrames(frameSource, totalFrames) {
    // 初始化编码器
    const bitrate = this.format === 'mp4' ? 50_000_000 : 30_000_000;
    const keyFrameInterval = this.format === 'mp4' ? this.fps : this.fps * 2;
    const quality = 1.0;
    const frameDuration = 1000000 / this.fps;

    // 初始化Muxer
    if (this.format === 'mp4') {
      this.muxer = new MP4Muxer({
        target: new MP4ArrayBufferTarget(),
        fastStart: 'in-memory',
        video: {
          codec: 'avc',
          width: this.width,
          height: this.height,
          frameRate: this.fps,
          bitrate: bitrate,
          quality: quality,
          gopSize: keyFrameInterval,
          temporalLayerCount: 1,
          bitrateMode: 'vbr',
          hardwareAcceleration: 'prefer-software'
        }
      });
    } else {
      this.muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'V_VP9',
          width: this.width,
          height: this.height,
          frameRate: this.fps,
          bitrate: bitrate,
          quality: quality
        }
      });
    }

    const codec = this.format === 'mp4' ? 'avc1.640033' : 'vp09.00.10.08';
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error('VideoEncoder error:', e)
    });

    videoEncoder.configure({
      codec: codec,
      width: this.width,
      height: this.height,
      bitrate: bitrate,
      framerate: this.fps,
      quality: quality,
      latencyMode: 'quality',
      avc: {
        format: 'annexb',
        level: '5.2',
        profile: 'high',
        chromaFormat: '420',
        bitDepth: 8,
        entropyCoding: 'cabac'
      }
    });

    let frameCounter = 0;

    for await (const frame of frameSource) {
      const timestamp = frameCounter * frameDuration;
      const videoFrame = new VideoFrame(frame, {
        timestamp: timestamp,
        duration: frameDuration,
        colorSpace: 'srgb'
      });

      videoEncoder.encode(videoFrame, {
        keyFrame: frameCounter % keyFrameInterval === 0,
        quality: quality
      });
      videoFrame.close();

      frameCounter++;

      if (this.progressCallback) {
        this.progressCallback({
          progress: frameCounter / totalFrames,
          currentFrame: frameCounter,
          totalFrames: totalFrames
        });
      }
    }

    await videoEncoder.flush();
    this.muxer.finalize();

    const buffer = this.muxer.target.buffer;
    const mimeType = this.format === 'mp4' ? 'video/mp4' : 'video/webm';
    return new Blob([buffer], { type: mimeType });
  }
} 