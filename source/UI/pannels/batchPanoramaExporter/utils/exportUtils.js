/**
 * 批量全景导出组件 - 导出处理工具函数
 */
import * as THREE from '../../../../../static/three/three.mjs';
import { PanoramaVideoGenerator } from '../../pannoViewer/panoramaToVideo.js';
import { prepareWatermarkOptions } from './watermarkUtils.js';
import { showWarningMessage, loadImageTexture } from './fileUtils.js';

/**
 * 处理导出任务
 * @param {Object} task - 任务对象
 * @param {Function} updateTask - 更新任务状态的回调函数
 * @returns {Promise<boolean>} 是否成功
 */
export async function processExportTask(task, updateTask) {
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
    
    // 设置进度回调
    generator.setProgressCallback(({ progress, currentFrame, totalFrames, stage }) => {
      // 将渲染进度映射到总进度的10%-90%范围
      const mappedProgress = 0.1 + progress * 0.8;
      
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
    
    // 开始录制
    const videoBlob = await generator.startRecording({
      duration: profile.duration,
      fps: profile.fps,
      startLon: 0,
      endLon: 360 * profile.rotations,
      startLat: 0,
      endLat: 0,
      width,
      height,
      smoothness: profile.smoothness,
      rotations: profile.rotations
    });
    
    updateTask({
      ...task,
      stage: '保存视频',
      progress: 0.9
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
      tasks.push({
        fileName: file.name,
        path: file.path,
        file: file.file,
        profileIndex,
        profileIndexText: settingProfiles.length > 1 ? `配置${profileIndex + 1}` : '',
        profile: settingProfiles[profileIndex],
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