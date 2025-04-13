# PannoViewer 组件

## 简介

PannoViewer是一个基于WebCodecs API的高性能视频处理组件，专注于全景视频的生成、编码和播放。该组件支持高效处理大型视频帧序列，并提供音频处理功能。

## 主要特性

- **高性能视频编码** - 支持MP4(H.264)和WebM(VP8/VP9)格式
- **音频处理** - 支持背景音乐添加、音量控制和音频时长自动匹配
- **内存优化** - 采用分批处理机制，有效处理大型视频而不耗尽内存
- **高级编码选项** - 支持自定义比特率、质量、关键帧间隔等参数
- **进度监控** - 实时跟踪编码进度

## 安装与依赖

本组件依赖于现代浏览器的WebCodecs API，请确保你的目标浏览器支持此API。

当前已知的浏览器兼容性:
- Chrome 94+ ✓
- Edge 94+ ✓
- Safari 15.4+ (部分支持) △
- Firefox (尚不支持) ✗

## 使用方法

### 基本使用示例

```javascript
// 初始化编码管理器
const encoderManager = new VideoEncoderManager({
  width: 1920,        // 视频宽度
  height: 1080,       // 视频高度
  fps: 30,            // 帧率
  format: 'mp4',      // 输出格式: 'mp4' 或 'webm'
  quality: 0.75       // 输出质量 (0.1-1.0)
});

// 设置进度回调
encoderManager.setProgressCallback((progress) => {
  console.log(`编码进度: ${Math.round(progress.progress * 100)}%`);
  console.log(`已处理帧: ${progress.processedFrames}/${progress.totalFrames}`);
});

// 处理所有视频帧
await encoderManager.processFrames(totalFrames, async (frameIndex) => {
  // 这里生成或获取每一帧的图像数据
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // ... 在canvas上绘制第frameIndex帧 ...
  
  return {
    imageData: canvas,
    thumbnailDataURL: canvas.toDataURL('image/jpeg', 0.3) // 可选的缩略图
  };
});

// 完成编码并获取结果视频Blob
const videoBlob = await encoderManager.finalize();

// 使用结果视频
const videoURL = URL.createObjectURL(videoBlob);
document.querySelector('video').src = videoURL;
```

### 添加音频

```javascript
// 加载音频文件
const { audioBuffer } = await loadAudio('background-music.mp3');

// 创建带音频的编码管理器
const encoderManager = new VideoEncoderManager({
  width: 1920,
  height: 1080,
  fps: 30,
  format: 'mp4',
  audioConfig: {
    audioBuffer: audioBuffer,  // AudioBuffer对象
    volume: 0.8                // 音量 (0.0-1.0)
  }
});

// ... 同上面的示例一样处理帧和完成编码 ...
```

### 从文件输入加载音频

```javascript
// 从文件输入元素获取音频文件
const audioFile = document.getElementById('audioInput').files[0];
if (audioFile) {
  const { audioBuffer, originalAudioBuffer } = await loadAudio(audioFile);
  
  // 使用加载的音频创建编码管理器
  const encoderManager = new VideoEncoderManager({
    // ... 其他配置参数 ...
    audioConfig: {
      audioBuffer: audioBuffer,
      volume: 0.7
    }
  });
  
  // ... 继续处理视频 ...
}
```

## API参考

### VideoEncoderManager

主要的编码管理器类，处理视频帧和音频编码。

#### 构造函数选项

```javascript
new VideoEncoderManager({
  // 必需参数
  width: Number,           // 视频宽度（像素）
  height: Number,          // 视频高度（像素）
  fps: Number,             // 视频帧率
  
  // 可选参数
  format: String,          // 输出格式, 'mp4'(默认) 或 'webm'
  quality: Number,         // 视频质量 (0.1-1.0), 默认0.75
  batchSize: Number,       // 每批处理的帧数, 默认自动计算
  
  // 高级编码参数
  encoderConfig: {         // 自定义编码器配置，覆盖默认值
    bitrate: Number,       // 比特率（bps）
    bitrateMode: String,   // 'constant'或'variable'
    keyInterval: Number,   // 关键帧间隔（帧数）
    // 其他VideoEncoder配置选项...
  },
  
  // 音频配置（可选）
  audioConfig: {
    audioBuffer: AudioBuffer, // 音频数据
    volume: Number,           // 音量 (0.0-1.0), 默认1.0
    loop: Boolean,            // 是否循环播放（可选，默认自动判断）
  }
})
```

#### 方法

**setProgressCallback(callback)**

设置进度回调函数，用于监控编码进度。

- `callback`: 接收`{progress, processedFrames, totalFrames}`参数的函数。
  - `progress`: 0-1之间的数字，表示总体进度。
  - `processedFrames`: 已处理的帧数。
  - `totalFrames`: 总帧数。

**processFrames(totalFrames, frameGenerator)**

处理指定数量的视频帧。

- `totalFrames`: 要处理的总帧数。
- `frameGenerator`: 异步函数，接收当前帧索引作为参数，返回包含该帧图像数据的对象。
  - 返回格式：`{imageData, thumbnailDataURL}`
    - `imageData`: Canvas、ImageBitmap或VideoFrame对象。
    - `thumbnailDataURL`: （可选）该帧的缩略图Data URL。

**finalize()**

完成编码过程并返回最终的视频Blob。

- 返回：Promise<Blob> - 编码后的视频文件。

**abort()**

中止当前编码过程并释放资源。

### 辅助函数

**loadAudio(source)**

加载并解码音频文件或URL。

- `source`: 音频来源，可以是URL字符串、File对象或Blob。
- 返回：Promise<{audioBuffer, originalAudioBuffer}>
  - `audioBuffer`: 处理后的AudioBuffer，可直接用于编码器。
  - `originalAudioBuffer`: 原始解码的AudioBuffer。

**prepareAudio(audioBuffer, options)**

准备音频数据以匹配视频长度。

- `audioBuffer`: 原始AudioBuffer。
- `options`: 配置选项
  - `videoDuration`: 视频时长（秒）。
  - `volume`: 音量 (0.0-1.0)。
  - `loop`: 是否循环（可选）。
- 返回：Promise<AudioBuffer> - 处理后的AudioBuffer。

## 注意事项

1. **内存使用**：处理高分辨率视频时，请注意监控内存使用情况。如有必要，减小`batchSize`值。

2. **兼容性**：由于依赖WebCodecs API，请确保在支持的浏览器环境中使用。

3. **性能优化**：
   - 如果视频生成过程复杂，考虑使用Web Workers进行并行处理。
   - 渲染复杂帧时使用`OffscreenCanvas`可提高性能。
   - 避免在frameGenerator中进行耗时操作。

4. **视频长度**：视频长度由帧数和帧率共同决定：`durationInSeconds = totalFrames / fps`。

## 高级用例

### 自定义编码配置

```javascript
const encoderManager = new VideoEncoderManager({
  width: 3840,
  height: 2160,
  fps: 60,
  format: 'mp4',
  // 自定义4K视频编码参数
  encoderConfig: {
    bitrate: 15_000_000,      // 15Mbps
    bitrateMode: 'variable',
    keyInterval: 150          // 每150帧一个关键帧
  }
});
```

### 小批量处理超高分辨率视频

```javascript
const encoderManager = new VideoEncoderManager({
  width: 7680,
  height: 4320,
  fps: 30,
  format: 'mp4',
  // 限制每批处理的帧数，减少内存占用
  batchSize: 5
});
```

## 错误处理

```javascript
try {
  const encoderManager = new VideoEncoderManager(config);
  await encoderManager.processFrames(totalFrames, frameGenerator);
  const videoBlob = await encoderManager.finalize();
  // 使用视频...
} catch (error) {
  console.error('视频编码过程出错:', error);
  // 处理错误情况，例如回退到低分辨率
}
```

## 常见问题

**Q: 编码过程中内存占用过高怎么办？**

A: 减小`batchSize`参数，增加手动垃圾回收机会，或减少视频分辨率。

**Q: 如何处理音频与视频不同步的问题？**

A: 音频会自动调整以匹配视频时长。如果仍有问题，检查音频采样率和视频fps设置是否合理。

**Q: 为什么编码过程很慢？**

A: WebCodecs性能受硬件和浏览器实现影响。检查是否启用了硬件加速，并考虑降低分辨率或使用更高效的格式。 