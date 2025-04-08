/**
 * setupModels.js
 * 提供AI模型集成能力，用于增强AI颜色控制面板的语言理解能力
 */

import { computeNormalAIPrompt } from '/plugins/SACAssetsManager/src/toolBox/useAge/forSiyuan/forAI/forNormalChat.js';
import { computeSyncAIPrompt } from '/plugins/SACAssetsManager/src/toolBox/useAge/forSiyuan/forAI/forSSEChat.js';

/**
 * 检查环境支持
 * @returns {Object} 环境支持情况
 */
export function checkEnvironmentSupport() {
  return {
    speechRecognition: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    localModels: Boolean(window.fetch),
    remoteModels: Boolean(window.fetch),
    siyuanAPI: Boolean(window.siyuan)
  };
}

/**
 * 设置AI处理器
 * @param {Object} options - 配置项
 * @returns {Object} AI处理功能
 */
export function setupAIProcessor(options = {}) {
  const { useLocalModel = true } = options;
  
  /**
   * 通过本地规则处理文本
   * @param {string} text - 输入文本
   * @returns {Promise<Object>} 处理结果
   */
  const processTextLocally = async (text) => {
    // 颜色正则表达式匹配
    const colorRegex = /(?:将|把|改为|变成|设为|设置为|换成)(.+?)(?:色|颜色)?$/;
    const match = text.match(colorRegex);
    
    let colorType = '未知';
    let colorName = null;
    
    if (match && match[1]) {
      colorName = match[1].trim();
      
      // 基础颜色映射
      const colorMap = {
        '红': '#ff0000',
        '红色': '#ff0000',
        '暗红': '#8b0000',
        '粉红': '#ffc0cb',
        '粉色': '#ffc0cb',
        '橙': '#ffa500',
        '橙色': '#ffa500',
        '黄': '#ffff00',
        '黄色': '#ffff00',
        '绿': '#008000',
        '绿色': '#008000',
        '青': '#00ffff',
        '青色': '#00ffff',
        '蓝': '#0000ff',
        '蓝色': '#0000ff',
        '天蓝': '#87ceeb',
        '天蓝色': '#87ceeb',
        '紫': '#800080',
        '紫色': '#800080',
        '白': '#ffffff',
        '白色': '#ffffff',
        '黑': '#000000',
        '黑色': '#000000',
        '灰': '#808080',
        '灰色': '#808080'
      };
      
      if (colorMap[colorName]) {
        return {
          type: 'color',
          value: colorMap[colorName],
          confidence: 1.0,
          description: colorName,
          source: 'local-rules'
        };
      }
    }
    
    // CSS颜色值处理(如#ff0000或rgb(255,0,0))
    if (text.startsWith('#') || text.startsWith('rgb')) {
      try {
        const tempEl = document.createElement('div');
        tempEl.style.color = text;
        document.body.appendChild(tempEl);
        const computedColor = getComputedStyle(tempEl).color;
        document.body.removeChild(tempEl);
        
        if (computedColor !== '') {
          return {
            type: 'color',
            value: text,
            confidence: 1.0,
            description: `CSS颜色: ${text}`,
            source: 'local-validation'
          };
        }
      } catch (e) {
        console.error('无效的颜色格式', e);
      }
    }
    
    // 扩展颜色映射 - 复杂颜色名
    const extendedColorMap = {
      '天空蓝': '#87CEEB',
      '深蓝': '#00008B',
      '宝蓝': '#4169E1',
      '海军蓝': '#000080',
      '靛蓝': '#4B0082',
      '孔雀蓝': '#33A1C9',
      '青绿': '#008B8B',
      '森林绿': '#228B22',
      '橄榄绿': '#6B8E23',
      '柠檬黄': '#FFFACD',
      '金色': '#FFD700',
      '橙红': '#FF4500',
      '珊瑚红': '#FF7F50',
      '浅粉': '#FFB6C1',
      '深粉': '#FF1493',
      '紫罗兰': '#EE82EE',
      '薰衣草': '#E6E6FA',
      '巧克力色': '#D2691E',
      '棕色': '#A52A2A',
      '咖啡色': '#8B4513',
      '米色': '#F5F5DC',
      '象牙色': '#FFFFF0',
      '银色': '#C0C0C0'
    };
    
    for (const [name, color] of Object.entries(extendedColorMap)) {
      if (text.includes(name)) {
        return {
          type: 'color',
          value: color,
          confidence: 0.8,
          description: name,
          source: 'local-extended'
        };
      }
    }
    
    return {
      type: 'unknown',
      value: null,
      confidence: 0,
      description: '无法本地识别的颜色',
      source: 'local-failure'
    };
  };
  
  /**
   * 使用思源笔记自带的AI接口处理颜色描述
   * @param {string} text - 颜色描述文本
   * @returns {Promise<Object>} 处理结果
   */
  const useRemoteAI = async (text) => {
    try {
      // 构建系统提示词
      const systemPrompt = `你是一个专业的颜色理解助手。请分析用户输入中描述的颜色，并输出对应的CSS颜色值。
      返回格式要求：
      1. 第一行：十六进制颜色值，如 #ff0000
      2. 第二行：颜色的中文名称
      3. 第三行：置信度(0-100)
      
      仅返回这三行内容，不要有任何其他文字。如果无法识别颜色，返回 unknown。`;
      
      // 用户提示
      const prompt = `分析这个颜色描述: "${text}"`;
      
      // 调用非流式AI接口
      const response = await computeNormalAIPrompt(prompt, systemPrompt);
      
      // 解析AI响应
      const lines = response.trim().split('\n');
      
      if (lines[0] === 'unknown') {
        return {
          type: 'unknown',
          value: null,
          confidence: 0,
          description: '无法识别的颜色',
          source: 'siyuan-ai'
        };
      }
      
      if (lines.length >= 3) {
        const colorValue = lines[0].trim();
        const colorName = lines[1].trim();
        const confidenceStr = lines[2].trim().replace(/[^\d\.]/g, '');
        const confidence = parseFloat(confidenceStr) / 100;
        
        // 验证颜色值
        if (colorValue.startsWith('#') || colorValue.startsWith('rgb')) {
          const tempEl = document.createElement('div');
          tempEl.style.color = colorValue;
          document.body.appendChild(tempEl);
          
          try {
            const computedColor = getComputedStyle(tempEl).color;
            if (computedColor !== '') {
              return {
                type: 'color',
                value: colorValue,
                confidence: isNaN(confidence) ? 0.8 : confidence,
                description: colorName || `颜色: ${colorValue}`,
                source: 'siyuan-ai'
              };
            }
          } finally {
            document.body.removeChild(tempEl);
          }
        }
      }
      
      // 尝试从文本中提取颜色代码
      const hexMatch = response.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/);
      if (hexMatch) {
        return {
          type: 'color',
          value: hexMatch[0],
          confidence: 0.7,
          description: text,
          source: 'siyuan-ai-extracted'
        };
      }
      
      return {
        type: 'unknown',
        value: null,
        confidence: 0,
        description: '无法解析AI响应',
        source: 'siyuan-ai-error'
      };
    } catch (error) {
      console.error('思源AI处理错误:', error);
      return {
        type: 'unknown',
        value: null,
        confidence: 0,
        description: `思源AI处理错误: ${error.message}`,
        source: 'siyuan-ai-error'
      };
    }
  };
  
  /**
   * 使用思源笔记的流式AI接口处理颜色描述
   * @param {string} text - 颜色描述文本
   * @returns {Promise<Object>} 处理结果
   */
  const useStreamAI = async (text) => {
    try {
      // 构建系统提示词
      const systemPrompt = `你是一个专业的颜色理解助手。请分析用户输入中描述的颜色，并输出对应的CSS颜色值。
      返回格式要求：
      1. 第一行：十六进制颜色值，如 #ff0000
      2. 第二行：颜色的中文名称
      3. 第三行：置信度(0-100)
      
      仅返回这三行内容，不要有任何其他文字。如果无法识别颜色，返回 unknown。`;
      
      // 用户提示
      const prompt = `分析这个颜色描述: "${text}"`;
      
      // 调用流式AI接口
      const response = await computeSyncAIPrompt(prompt, systemPrompt);
      
      // 解析AI响应
      const lines = response.trim().split('\n');
      
      if (lines[0] === 'unknown') {
        return {
          type: 'unknown',
          value: null,
          confidence: 0,
          description: '无法识别的颜色',
          source: 'siyuan-ai-stream'
        };
      }
      
      if (lines.length >= 3) {
        const colorValue = lines[0].trim();
        const colorName = lines[1].trim();
        const confidenceStr = lines[2].trim().replace(/[^\d\.]/g, '');
        const confidence = parseFloat(confidenceStr) / 100;
        
        // 验证颜色值
        if (colorValue.startsWith('#') || colorValue.startsWith('rgb')) {
          const tempEl = document.createElement('div');
          tempEl.style.color = colorValue;
          document.body.appendChild(tempEl);
          
          try {
            const computedColor = getComputedStyle(tempEl).color;
            if (computedColor !== '') {
              return {
                type: 'color',
                value: colorValue,
                confidence: isNaN(confidence) ? 0.8 : confidence,
                description: colorName || `颜色: ${colorValue}`,
                source: 'siyuan-ai-stream'
              };
            }
          } finally {
            document.body.removeChild(tempEl);
          }
        }
      }
      
      // 尝试从文本中提取颜色代码
      const hexMatch = response.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/);
      if (hexMatch) {
        return {
          type: 'color',
          value: hexMatch[0],
          confidence: 0.7,
          description: text,
          source: 'siyuan-ai-stream-extracted'
        };
      }
      
      return {
        type: 'unknown',
        value: null,
        confidence: 0,
        description: '无法解析AI响应',
        source: 'siyuan-ai-stream-error'
      };
    } catch (error) {
      console.error('思源流式AI处理错误:', error);
      return {
        type: 'unknown',
        value: null,
        confidence: 0,
        description: `思源流式AI处理错误: ${error.message}`,
        source: 'siyuan-ai-stream-error'
      };
    }
  };
  
  /**
   * 处理用户输入文本
   * @param {string} text - 用户输入
   * @returns {Promise<Object>} 处理结果
   */
  const processText = async (text) => {
    // 首先尝试本地处理
    const localResult = await processTextLocally(text);
    
    // 如果本地处理成功并且可信度高，直接返回结果
    if (localResult.type === 'color' && localResult.confidence > 0.9) {
      return localResult;
    }
    
    // 如果环境支持思源API，尝试使用思源AI处理
    const env = checkEnvironmentSupport();
    if (env.siyuanAPI) {
      try {
        // 优先使用流式API，性能通常更好
        const streamResult = await useStreamAI(text);
        if (streamResult.type === 'color') {
          return streamResult;
        }
        
        // 如果流式API失败，尝试非流式API
        const remoteResult = await useRemoteAI(text);
        if (remoteResult.type === 'color') {
          return remoteResult;
        }
      } catch (error) {
        console.error('思源AI处理出错，回退到本地处理', error);
      }
    }
    
    // 如果远程处理失败或环境不支持，返回本地处理结果
    return localResult;
  };
  
  return {
    processText,
    processTextLocally,
    useRemoteAI,
    useStreamAI,
    checkSupport: checkEnvironmentSupport
  };
}

/**
 * 提供常见的扩展和自定义颜色名称的方法
 * @param {Object} baseColorMap - 基础颜色映射
 * @param {Object} customColors - 自定义颜色映射
 * @returns {Object} 合并后的颜色映射
 */
export function extendColorMap(baseColorMap, customColors = {}) {
  return { ...baseColorMap, ...customColors };
} 