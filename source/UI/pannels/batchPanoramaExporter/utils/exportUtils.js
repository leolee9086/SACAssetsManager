/**
 * 批量全景导出组件 - 导出处理工具函数
 */
import * as THREE from '../../../../../static/three/three.mjs';
import { PanoramaVideoGenerator } from '../../pannoViewer/panoramaToVideo.js';
import { prepareWatermarkOptions } from './watermarkUtils.js';
import { showWarningMessage, loadImageTexture } from './fileUtils.js';
import { loadAudio, processAudioForVideo } from './audioUtils.js';

/**
 * 处理导出任务
 * @param {Object} task - 任务对象
 * @param {Function} updateTask - 更新任务状态的回调函数
 * @returns {Promise<boolean>} 是否成功
 */
export async function processExportTask(task, updateTask) {
  console.log(task.profile)
  try {
    // 获取当前任务的配置
    const profile = task.profile;
    
    updateTask({
      ...task,
      status: 'processing',
      stage: '准备中',
      progress: 0
    });
    
    // 获取分辨率
    let width, height;
    switch(profile.resolution) {
      case '4k':
        width = profile.isLandscape ? 3840 : 2160;
        height = profile.isLandscape ? 2160 : 3840;
        break;
      case '2k':
        width = profile.isLandscape ? 2560 : 1440;
        height = profile.isLandscape ? 1440 : 2560;
        break;
      default: // 1080p
        width = profile.isLandscape ? 1920 : 1080;
        height = profile.isLandscape ? 1080 : 1920;
    }
    
    // 创建文件名
    const baseName = task.fileName.substring(0, task.fileName.lastIndexOf('.')) || task.fileName;
    // 配置后缀，如果有多个配置则添加配置编号
    const configSuffix = task.profileIndexText ? `_${task.profileIndexText}` : '';
    const outputFileName = `${baseName}${configSuffix}_${width}x${height}_${profile.duration}s.mp4`;
    
    // 确定输出目录和文件名
    const folderName = task.createSubDirs ? baseName : '';
    task.outputPath = folderName ? `${folderName}/${outputFileName}` : outputFileName;
    
    updateTask({
      ...task,
      stage: '加载图像',
      progress: 0.05
    });

    // 创建视频生成器
    const generator = new PanoramaVideoGenerator(width, height);
    
    updateTask({
      ...task,
      stage: '设置场景',
      progress: 0.1
    });
    
    // 处理文件，优先使用file对象，否则使用path
    if (task.file) {
      // 从File对象创建纹理
      await setupSceneFromFile(generator, task.file);
    } else if (task.path) {
      // 从路径加载纹理
      const texture = await loadImageTexture({ path: task.path });
      await generator.setupScene(texture);
    } else {
      throw new Error('无效的文件数据');
    }
    
    // 处理水印
    const watermarkOptions = prepareWatermarkOptions(profile, width);
    
    // 如果有图片水印，加载图片
    if (watermarkOptions.image && watermarkOptions.image.enabled && profile.watermark.image.file) {
      try {
        await generator.setImageWatermark({
          imageUrl: profile.watermark.image.preview,
          position: watermarkOptions.image.position,
          width: watermarkOptions.image.width,
          opacity: watermarkOptions.image.opacity
        });
      } catch (error) {
        console.error('设置图片水印失败:', error);
        // 继续处理，即使设置图片水印失败
      }
    }
    
    // 设置文字水印
    if (watermarkOptions.text && watermarkOptions.text.enabled) {
      generator.setTextWatermark(watermarkOptions.text);
      console.log('已设置文字水印:', watermarkOptions.text);
    }

    // 处理音频相关参数和处理
    let audioBuffer = null;
    let audioConfig = null;
    // 保存原始配置的深拷贝，用于在音频处理失败时恢复
    const originalProfile = JSON.parse(JSON.stringify(profile));
    
    // 音频处理标志
    let hasAudio = false;
    let adaptedToAudio = false;
    
    if (profile.audio && profile.audio.enabled && (profile.audio.file || profile.audio.filePath)) {
      try {
        updateTask({
          ...task,
          stage: '加载音频',
          progress: 0.15
        });
        
        // 记录处理前的参数
        console.log('====== 音频处理开始 ======');
        console.log('处理前的视频参数:', {
          duration: profile.duration,
          rotations: profile.rotations,
          adaptMode: profile.audio.adaptMode,
          rotationsForAudio: profile.audio.rotationsForAudio
        });
        
        // 1. 加载音频文件
        const audioFile = profile.audio.file || profile.audio.filePath;
        console.log('正在加载音频文件...', typeof audioFile === 'string' ? audioFile : audioFile.name);
        
        const { audioContext, audioBuffer: rawAudioBuffer } = await loadAudio(audioFile);
        console.log('音频加载成功，时长:', rawAudioBuffer.duration.toFixed(2), '秒');
        
        // 设置音频处理标志位
        hasAudio = true;
        
        // 2. 根据适配模式处理音频与视频时长
        console.log('应用音频适配策略:', profile.audio.adaptMode);
        const audioOptions = processAudioForVideo(rawAudioBuffer, profile);
        
        if (profile.audio.adaptMode === 'fitAudio') {
          adaptedToAudio = true;
        }
        
        // 保存音频信息用于VideoEncoderManager
        audioBuffer = rawAudioBuffer;
        audioConfig = {
          audioBuffer: rawAudioBuffer,
          volume: profile.audio.volume || 0.8
        };
        
        // 关闭音频上下文
        audioContext.close();
        
        console.log('音频处理完成，适配模式:', profile.audio.adaptMode, '，有效模式:', audioOptions.effectiveMode);
        console.log('最终视频参数:', {
          duration: profile.duration,
          rotations: profile.rotations,
          audioLength: audioOptions.audioLength?.toFixed(2),
          videoLength: audioOptions.videoLength?.toFixed(2),
          fps: profile.fps
        });
        
        // 确认参数是否正确更新 - 如果没有更新则强制更新
        if (profile.audio.adaptMode === 'fitAudio' && profile.duration !== Math.ceil(audioOptions.audioLength)) {
          console.warn('警告: 视频时长未正确更新为音频时长!');
          console.warn('强制更新视频时长...');
          profile.duration = Math.ceil(audioOptions.audioLength);
          profile.rotations = profile.audio.rotationsForAudio || profile.rotations;
        }
        
        // 如果是适配音频模式，更新任务文件名中的时长
        if (profile.audio.adaptMode === 'fitAudio' && audioOptions.adaptedToAudio) {
          const newDuration = profile.duration;
          
          // 更新文件名中的时长信息
          const durationPattern = /(\d+)s\.mp4$/;
          if (durationPattern.test(task.outputPath)) {
            const oldPath = task.outputPath;
            task.outputPath = task.outputPath.replace(durationPattern, `${newDuration}s.mp4`);
            console.log(`更新输出文件名: ${oldPath} -> ${task.outputPath}`);
          }
        }
        
        console.log('====== 音频处理完成 ======');
      } catch (error) {
        console.error('音频处理失败:', error);
        // 音频处理失败时，恢复原始配置
        Object.assign(profile, originalProfile);
        console.log('已恢复原始视频参数:', {
          duration: profile.duration,
          rotations: profile.rotations
        });
        
        // 重置音频标志
        hasAudio = false;
        adaptedToAudio = false;
        audioBuffer = null;
        audioConfig = null;
      }
    }
    
    // 设置进度回调
    generator.setProgressCallback(({ progress, currentFrame, totalFrames, stage }) => {
      // 进度范围为10%-95%
      const mappedProgress = 0.1 + progress * 0.85;
      
      updateTask({
        ...task,
        progress: mappedProgress,
        stage: stage || '渲染中',
        currentFrame,
        totalFrames
      });
    });
    
    updateTask({
      ...task,
      stage: '开始录制',
      progress: 0.2
    });
    
    // 打印最终导出参数
    console.log('====== 开始视频生成 ======');
    console.log('最终导出参数:', {
      duration: profile.duration,
      rotations: profile.rotations,
      fps: profile.fps,
      width, 
      height,
      smoothness: profile.smoothness,
      hasAudio: hasAudio,
      adaptedToAudio: adaptedToAudio
    });
    
    // 音频适配模式下的额外检查
    if (hasAudio && profile.audio.adaptMode === 'fitAudio') {
      console.log('音频适配模式最终检查:');
      console.log(`- 音频时长: ${audioBuffer.duration.toFixed(2)}秒`);
      console.log(`- 视频设置时长: ${profile.duration}秒`);
      console.log(`- 旋转圈数: ${profile.rotations}圈`);
      
      // 如果发现不匹配，再次尝试更新
      if (profile.duration !== Math.ceil(audioBuffer.duration)) {
        console.warn('警告: 视频时长在录制前仍不匹配音频时长，再次更新');
        profile.duration = Math.ceil(audioBuffer.duration);
      }
    }
    
    // 创建视频生成参数对象，将音频配置直接传入
    const videoGenerationParams = {
      duration: profile.duration,
      fps: profile.fps,
      startLon: 0,
      endLon: 360 * profile.rotations,
      startLat: 0,
      endLat: 0,
      width,
      height,
      smoothness: profile.smoothness,
      rotations: profile.rotations,
      // 直接将音频配置传入，由VideoEncoderManager处理
      audioConfig: hasAudio ? audioConfig : null
    };
    
    console.log('最终生成参数:', JSON.stringify(videoGenerationParams, null, 2));
    
    // 使用集成了音频处理的startRecording方法
    const videoBlob = await generator.startRecording(videoGenerationParams);
    
    console.log('====== 视频生成完成 ======');
    console.log('生成的视频大小:', Math.round(videoBlob.size/1024/1024), 'MB, 时长:', profile.duration, '秒');
    
    updateTask({
      ...task,
      stage: '保存视频',
      progress: 0.95
    });
    
    // 使用浏览器的下载API保存视频
    await saveVideo(videoBlob, task.outputPath);
    
    // 更新任务状态
    updateTask({
      ...task,
      status: 'completed',
      progress: 1,
      stage: '已完成'
    });
    
    return true;
  } catch (error) {
    console.error('处理任务失败:', error);
    
    // 记录更详细的错误信息
    console.error('处理任务失败时的参数状态:', {
      fileName: task.fileName,
      hasAudio: hasAudio || false,
      audioAdapted: adaptedToAudio || false,
      videoDuration: profile.duration,
      rotations: profile.rotations,
      error: error.message
    });
    
    // 更新任务状态
    updateTask({
      ...task,
      status: 'error',
      error: error.message,
      stage: '出错',
      progress: 0
    });
    return false;
  }
}

/**
 * 从File对象创建并设置场景
 * @param {PanoramaVideoGenerator} generator - 视频生成器
 * @param {File} file - 文件对象
 * @returns {Promise<void>}
 */
async function setupSceneFromFile(generator, file) {
  // 从File对象创建纹理
  const texture = await new Promise((resolve, reject) => {
    // 创建一个图像对象
    const img = new Image();
    
    // 从File对象创建URL
    const objectUrl = URL.createObjectURL(file);
    
    // 设置处理函数
    img.onload = () => {
      // 创建Three.js纹理
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      URL.revokeObjectURL(objectUrl); // 释放对象URL
      resolve(texture);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl); // 释放对象URL，即使加载失败
      reject(new Error(`无法加载图片: ${file.name}`));
    };
    
    // 开始加载图像
    img.src = objectUrl;
  });
  
  // 设置场景
  await generator.setupScene(texture);
  
  // 返回纹理对象
  return texture;
}

/**
 * 保存视频Blob为文件
 * @param {Blob} videoBlob - 视频Blob对象
 * @param {string} fileName - 文件名
 * @returns {Promise<void>}
 */
async function saveVideo(videoBlob, fileName) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(videoBlob);
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 100);
  });
}

/**
 * 检查并准备导出任务列表
 * @param {Array} selectedFiles - 选择的文件列表
 * @param {Array} settingProfiles - 设置配置列表
 * @param {string} outputDir - 输出目录
 * @param {boolean} createSubDirs - 是否为每个文件创建子目录
 * @returns {Array} 任务列表
 */
export function prepareExportTasks(selectedFiles, settingProfiles, outputDir, createSubDirs) {
  // 检查是否有文件
  if (selectedFiles.length === 0) {
    showWarningMessage('请选择至少一个文件');
    return [];
  }
  
  // 检查输出目录
  if (!outputDir) {
    showWarningMessage('请先选择输出目录');
    return [];
  }
  
  // 创建任务列表 - 为每个文件和每个配置创建任务
  const tasks = [];
  
  for (const file of selectedFiles) {
    for (let profileIndex = 0; profileIndex < settingProfiles.length; profileIndex++) {
      // 为每个任务创建配置的深拷贝，避免引用问题
      const profileCopy = JSON.parse(JSON.stringify(settingProfiles[profileIndex]));
      profileCopy.audio.file = settingProfiles[profileIndex].audio.file
      // 检查并预处理音频设置
      if (profileCopy.audio && profileCopy.audio.enabled) {
        console.log(`预处理任务 ${file.name} 的音频设置`, {
          adaptMode: profileCopy.audio.adaptMode,
          rotationsForAudio: profileCopy.audio.rotationsForAudio
        });
        
        // 确保设置了默认值
        if (!profileCopy.audio.rotationsForAudio) {
          profileCopy.audio.rotationsForAudio = 2;
        }
        if (profileCopy.audio.volume === undefined) {
          profileCopy.audio.volume = 0.8;
        }
      }
      
      tasks.push({
        fileName: file.name,
        path: file.path,
        file: file.file,
        profileIndex,
        profileIndexText: settingProfiles.length > 1 ? `配置${profileIndex + 1}` : '',
        profile: profileCopy,
        outputDir,
        createSubDirs,
        status: 'pending',
        progress: 0,
        stage: '等待中',
        error: null,
        currentFrame: 0,
        totalFrames: 0
      });
    }
  }
  
  return tasks;
} 