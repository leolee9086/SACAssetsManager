/**
 * 无缝贴图检测工具
 * 提供检测图像是否为无缝贴图的功能
 */

// 初始化无缝贴图检测相关错误
export class 无缝贴图检测错误 extends Error {
  constructor(message) {
    super(message);
    this.name = '无缝贴图检测错误';
  }
}

/**
 * 计算两个区域的相似度
 * @param {Uint8ClampedArray} region1 - 第一个区域的像素数据
 * @param {Uint8ClampedArray} region2 - 第二个区域的像素数据
 * @returns {number} 相似度分数 (0-1，1为完全匹配)
 */
function 计算区域相似度(region1, region2) {
  if (region1.length !== region2.length) {
    throw new 无缝贴图检测错误('区域大小不匹配');
  }

  let totalDifference = 0;
  let totalPixels = region1.length / 4;
  
  for (let i = 0; i < region1.length; i += 4) {
    // RGB通道差异
    const rDiff = Math.abs(region1[i] - region2[i]);
    const gDiff = Math.abs(region1[i + 1] - region2[i + 1]);
    const bDiff = Math.abs(region1[i + 2] - region2[i + 2]);
    
    // 使用感知颜色差异（考虑人眼对绿色更敏感）
    const pixelDiff = (rDiff * 0.3 + gDiff * 0.59 + bDiff * 0.11) / 255;
    totalDifference += pixelDiff;
  }
  
  // 返回相似度（0-1，1为完全相同）
  return 1 - (totalDifference / totalPixels);
}

/**
 * 提取图像边缘区域
 * @param {ImageData} imageData - 图像数据
 * @param {string} edge - 边缘位置 ('left', 'right', 'top', 'bottom')
 * @param {number} borderWidth - 边缘宽度(像素)
 * @returns {Uint8ClampedArray} 边缘区域像素数据
 */
function 提取边缘区域(imageData, edge, borderWidth) {
  const { data, width, height } = imageData;
  let result;
  
  if (edge === 'left' || edge === 'right') {
    result = new Uint8ClampedArray(borderWidth * height * 4);
  } else {
    result = new Uint8ClampedArray(width * borderWidth * 4);
  }
  
  let index = 0;
  
  if (edge === 'left') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < borderWidth; x++) {
        const srcIdx = (y * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          result[index++] = data[srcIdx + c];
        }
      }
    }
  } else if (edge === 'right') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < borderWidth; x++) {
        const srcIdx = (y * width + (width - borderWidth + x)) * 4;
        for (let c = 0; c < 4; c++) {
          result[index++] = data[srcIdx + c];
        }
      }
    }
  } else if (edge === 'top') {
    for (let y = 0; y < borderWidth; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          result[index++] = data[srcIdx + c];
        }
      }
    }
  } else if (edge === 'bottom') {
    for (let y = 0; y < borderWidth; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = ((height - borderWidth + y) * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          result[index++] = data[srcIdx + c];
        }
      }
    }
  }
  
  return result;
}

/**
 * 转换图像数据为灰度
 * @param {Uint8ClampedArray} imageData - 图像像素数据
 * @returns {Uint8Array} 灰度数据
 */
function 转换为灰度(imageData) {
  const grayData = new Uint8Array(imageData.length / 4);
  
  for (let i = 0, j = 0; i < imageData.length; i += 4, j++) {
    // 使用加权RGB转换为灰度
    grayData[j] = Math.round(
      imageData[i] * 0.3 + 
      imageData[i + 1] * 0.59 + 
      imageData[i + 2] * 0.11
    );
  }
  
  return grayData;
}

/**
 * 使用边缘分析检测无缝贴图
 * @param {ImageData} imageData - 图像数据
 * @param {Object} options - 配置选项
 * @param {number} options.borderWidth - 边缘宽度(像素)
 * @returns {Object} 分析结果
 */
function 边缘分析(imageData, options = {}) {
  const borderWidth = options.borderWidth || 5;
  
  // 提取边缘区域
  const leftEdge = 提取边缘区域(imageData, 'left', borderWidth);
  const rightEdge = 提取边缘区域(imageData, 'right', borderWidth);
  const topEdge = 提取边缘区域(imageData, 'top', borderWidth);
  const bottomEdge = 提取边缘区域(imageData, 'bottom', borderWidth);
  
  // 计算边缘相似度
  const horizontalSimilarity = 计算区域相似度(leftEdge, rightEdge);
  const verticalSimilarity = 计算区域相似度(topEdge, bottomEdge);
  
  // 平均分和加权分
  const averageScore = (horizontalSimilarity + verticalSimilarity) / 2;
  const minScore = Math.min(horizontalSimilarity, verticalSimilarity);
  const weightedScore = averageScore * 0.7 + minScore * 0.3;
  
  return {
    score: weightedScore,
    horizontalSimilarity,
    verticalSimilarity,
    averageSimilarity: averageScore,
    minSimilarity: minScore
  };
}

/**
 * 计算图像中的自相关性，用于检测周期性
 * @param {ImageData} imageData - 图像数据
 * @param {number} maxOffset - 最大偏移量
 * @returns {Object} 自相关分析结果
 */
function 计算自相关性(imageData, maxOffset = 100) {
  const { data, width, height } = imageData;
  const grayScale = 转换为灰度(data);
  
  // 设置最大偏移量，不超过图像尺寸的三分之一
  maxOffset = Math.min(maxOffset, Math.min(width, height) / 3);
  
  // 计算灰度图自相关
  let maxCorrelation = 0;
  let bestOffset = 0;
  let correlations = [];
  
  // 检查不同位移下的自相关性
  for (let offset = 1; offset <= maxOffset; offset++) {
    // 计算横向自相关
    let hCorrelation = 0;
    let hCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - offset; x++) {
        const p1 = grayScale[y * width + x];
        const p2 = grayScale[y * width + (x + offset)];
        
        hCorrelation += 1 - Math.abs(p1 - p2) / 255;
        hCount++;
      }
    }
    
    // 计算纵向自相关
    let vCorrelation = 0;
    let vCount = 0;
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height - offset; y++) {
        const p1 = grayScale[y * width + x];
        const p2 = grayScale[(y + offset) * width + x];
        
        vCorrelation += 1 - Math.abs(p1 - p2) / 255;
        vCount++;
      }
    }
    
    // 计算最终相关性
    hCorrelation = hCount > 0 ? hCorrelation / hCount : 0;
    vCorrelation = vCount > 0 ? vCorrelation / vCount : 0;
    const correlation = (hCorrelation + vCorrelation) / 2;
    
    correlations.push({
      offset,
      correlation,
      hCorrelation,
      vCorrelation
    });
    
    // 更新最大相关性
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestOffset = offset;
    }
  }
  
  return {
    maxCorrelation,
    bestOffset,
    correlations,
    // 基于相关性和是否找到周期的得分
    score: maxCorrelation * (bestOffset > 0 ? 1 : 0.5)
  };
}

/**
 * 执行平铺分析，检测图像平铺效果中的连续性
 * @param {HTMLElement} imageElement - 图像元素
 * @param {Object} options - 配置选项
 * @returns {Object} 平铺分析结果
 */
function 平铺分析(imageElement, options = {}) {
  const tileSize = options.tileSize || 2;
  const { width, height } = imageElement;
  
  // 创建新画布用于平铺测试
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width * tileSize;
  canvas.height = height * tileSize;
  
  // 创建平铺图像
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      ctx.drawImage(imageElement, x * width, y * height);
    }
  }
  
  // 获取平铺图像数据
  const tiledImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // 分析平铺图像中的接缝（不包括外边缘）
  const seamScores = [];
  
  // 分析水平接缝
  for (let y = 1; y < tileSize; y++) {
    const upperLine = ctx.getImageData(0, y * height - 1, width * tileSize, 1).data;
    const lowerLine = ctx.getImageData(0, y * height, width * tileSize, 1).data;
    
    let similarity = 0;
    for (let i = 0; i < upperLine.length; i += 4) {
      // 计算RGB色差
      const rDiff = Math.abs(upperLine[i] - lowerLine[i]);
      const gDiff = Math.abs(upperLine[i + 1] - lowerLine[i + 1]);
      const bDiff = Math.abs(upperLine[i + 2] - lowerLine[i + 2]);
      
      // 加权色差
      similarity += 1 - ((rDiff * 0.3 + gDiff * 0.59 + bDiff * 0.11) / 255);
    }
    
    // 归一化
    similarity /= (upperLine.length / 4);
    seamScores.push({ type: 'horizontal', position: y, similarity });
  }
  
  // 分析垂直接缝
  for (let x = 1; x < tileSize; x++) {
    // 提取垂直线的像素
    const leftPixels = [];
    const rightPixels = [];
    
    for (let y = 0; y < height * tileSize; y++) {
      const leftX = x * width - 1;
      const rightX = x * width;
      
      const leftIdx = (y * canvas.width + leftX) * 4;
      const rightIdx = (y * canvas.width + rightX) * 4;
      
      for (let c = 0; c < 4; c++) {
        leftPixels.push(tiledImageData.data[leftIdx + c]);
        rightPixels.push(tiledImageData.data[rightIdx + c]);
      }
    }
    
    // 计算相似度
    let similarity = 0;
    for (let i = 0; i < leftPixels.length; i += 4) {
      const rDiff = Math.abs(leftPixels[i] - rightPixels[i]);
      const gDiff = Math.abs(leftPixels[i + 1] - rightPixels[i + 1]);
      const bDiff = Math.abs(leftPixels[i + 2] - rightPixels[i + 2]);
      
      similarity += 1 - ((rDiff * 0.3 + gDiff * 0.59 + bDiff * 0.11) / 255);
    }
    
    // 归一化
    similarity /= (leftPixels.length / 4);
    seamScores.push({ type: 'vertical', position: x, similarity });
  }
  
  // 计算总体分数
  const avgScore = seamScores.reduce((sum, item) => sum + item.similarity, 0) / seamScores.length;
  
  return {
    score: avgScore,
    details: seamScores,
    tiledCanvas: canvas // 返回平铺画布用于可视化
  };
}

/**
 * 综合分析图像是否为无缝贴图
 * @param {HTMLImageElement|string} imageSource - 图像源（HTMLImageElement或URL）
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 分析结果
 */
export async function 分析无缝贴图(imageSource, options = {}) {
  // 默认配置
  const config = {
    borderWidth: 5,
    tileSize: 2,
    edgeWeight: 0.4,
    tileWeight: 0.4,
    correlationWeight: 0.2,
    qualityThreshold: 0.85,
    ...options
  };
  
  return new Promise(async (resolve, reject) => {
    try {
      // 加载图像
      let img;
      if (typeof imageSource === 'string') {
        img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => performAnalysis(img);
        img.onerror = () => reject(new 无缝贴图检测错误('加载图像失败'));
        img.src = imageSource;
      } else if (imageSource instanceof HTMLImageElement) {
        img = imageSource;
        performAnalysis(img);
      } else {
        reject(new 无缝贴图检测错误('无效的图像源'));
      }
      
      // 执行分析
      async function performAnalysis(imageElement) {
        try {
          // 创建Canvas获取图像数据
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = imageElement.width;
          canvas.height = imageElement.height;
          ctx.drawImage(imageElement, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // 执行边缘分析
          const edgeResults = 边缘分析(imageData, { borderWidth: config.borderWidth });
          
          // 执行平铺分析
          const tileResults = 平铺分析(imageElement, { tileSize: config.tileSize });
          
          // 执行自相关分析
          const correlationResults = 计算自相关性(imageData);
          
          // 计算综合评分
          const weightedScore = 
            (edgeResults.score * config.edgeWeight) +
            (tileResults.score * config.tileWeight) +
            (correlationResults.score * config.correlationWeight);
          
          // 计算一致性 - 各项分数越接近，置信度越高
          const scores = [
            edgeResults.score, 
            tileResults.score, 
            correlationResults.score
          ];
          
          const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
          const consistencyScore = Math.max(0, 1 - Math.sqrt(variance) * 5);
          
          // 综合结果
          const result = {
            isSeamless: weightedScore >= config.qualityThreshold,
            score: weightedScore,
            confidence: (consistencyScore * 0.4 + weightedScore * 0.6),
            details: {
              edgeAnalysis: edgeResults,
              tileAnalysis: tileResults,
              correlationAnalysis: correlationResults
            },
            // 图像基本信息
            imageInfo: {
              width: imageElement.width,
              height: imageElement.height,
              aspectRatio: imageElement.width / imageElement.height
            },
            // 原始分析数据
            rawData: {
              horizontalSeamScore: edgeResults.horizontalSimilarity,
              verticalSeamScore: edgeResults.verticalSimilarity
            }
          };
          
          resolve(result);
        } catch (error) {
          reject(new 无缝贴图检测错误(`分析过程中出错: ${error.message}`));
        }
      }
    } catch (error) {
      reject(new 无缝贴图检测错误(`分析失败: ${error.message}`));
    }
  });
}

/**
 * 检查图像是否为无缝贴图（简化接口）
 * @param {HTMLImageElement|string} imageSource - 图像源
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} 是否为无缝贴图
 */
export async function 是否为无缝贴图(imageSource, options = {}) {
  try {
    const result = await 分析无缝贴图(imageSource, options);
    return result.isSeamless;
  } catch (error) {
    console.error('检测无缝贴图失败:', error);
    return false;
  }
}

/**
 * 批量检测多个图像是否为无缝贴图
 * @param {Array<string|HTMLImageElement>} imageSources - 图像源数组
 * @param {Object} options - 配置选项
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<Array>} 分析结果数组
 */
export async function 批量分析无缝贴图(imageSources, options = {}, progressCallback = null) {
  const results = [];
  const totalImages = imageSources.length;
  
  for (let i = 0; i < totalImages; i++) {
    try {
      const result = await 分析无缝贴图(imageSources[i], options);
      results.push({
        source: imageSources[i],
        ...result
      });
      
      // 报告进度
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: totalImages,
          progress: (i + 1) / totalImages,
          result: result
        });
      }
    } catch (error) {
      results.push({
        source: imageSources[i],
        error: error.message
      });
      
      // 报告错误
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: totalImages,
          progress: (i + 1) / totalImages,
          error: error.message
        });
      }
    }
  }
  
  return results;
} 