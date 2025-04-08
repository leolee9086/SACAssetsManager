/**
 * toolCommandProcessor.js
 * 提供AI工具命令处理功能，允许用户通过自然语言调用系统功能
 */

// 直接引入原始函数，避免可能的封装问题
import { computeSyncAIPrompt, fromSiyuanSSEPrompt } from '/plugins/SACAssetsManager/src/toolBox/useAge/forSiyuan/forAI/forSSEChat.js';
import { computeNormalAIPrompt } from '/plugins/SACAssetsManager/src/toolBox/useAge/forSiyuan/forAI/forNormalChat.js';

/**
 * 工具管理器，用于注册和执行工具
 */
class ToolManager {
  constructor() {
    this.tools = {};
    // 初始化默认模型配置
    this.modelConfig = {
      useGlobal: true,
      temperature: 0.7,
      maxContexts: 1
    };
    
    console.log('ToolManager初始化，默认配置:', this.modelConfig);
  }

  /**
   * 注册工具
   * @param {Object} toolsObj - 工具对象集合
   */
  register(toolsObj) {
    for (const [name, func] of Object.entries(toolsObj)) {
      this.tools[name] = func;
    }
    console.log('已注册工具:', Object.keys(this.tools));
  }

  /**
   * 检查工具是否存在
   * @param {string} toolName - 工具名称
   * @returns {boolean} - 工具是否存在
   */
  hasTool(toolName) {
    return Boolean(this.tools[toolName]);
  }

  /**
   * 执行工具
   * @param {string} toolName - 工具名称
   * @param {any} parameters - 工具参数
   * @param {Object} options - 选项参数，可包含回调等
   * @returns {Promise<any>} - 工具执行结果
   */
  async execute(toolName, parameters, options = {}) {
    if (!this.hasTool(toolName)) {
      throw new Error(`工具 "${toolName}" 不存在`);
    }
    
    console.log(`执行工具 "${toolName}"，参数:`, parameters);
    
    try {
      return await this.tools[toolName](parameters, options);
    } catch (error) {
      console.error(`执行工具 "${toolName}" 失败:`, error);
      return {
        success: false,
        message: `工具执行失败: ${error.message}`
      };
    }
  }
  
  /**
   * 设置模型配置
   * @param {Object} config - 模型配置对象
   */
  setModelConfig(config) {
    if (!config || typeof config !== 'object') {
      console.error('无效的模型配置:', config);
      return;
    }
    
    try {
      // 确保必须字段存在
      const sanitizedConfig = {
        // 默认值
        useGlobal: true,
        temperature: 0.7,
        maxContexts: 1,
        
        // 用户提供的值（如果有效）
        ...(config.useGlobal !== undefined ? { useGlobal: Boolean(config.useGlobal) } : {}),
        ...(typeof config.temperature === 'number' ? { temperature: config.temperature } : {}),
        ...(typeof config.maxContexts === 'number' ? { maxContexts: config.maxContexts } : {}),
        
        // 自定义API设置
        ...(config.useCustomApiSettings ? { useCustomApiSettings: Boolean(config.useCustomApiSettings) } : { useCustomApiSettings: false }),
        ...(config.customApiEndpoint ? { customApiEndpoint: String(config.customApiEndpoint) } : {}),
        ...(config.customApiKey ? { customApiKey: String(config.customApiKey) } : {}),
        ...(config.customModelName ? { customModelName: String(config.customModelName) } : {}),
        
        // 模型特定设置
        ...(config.providerId ? { providerId: String(config.providerId) } : {}),
        ...(config.model ? { model: String(config.model) } : {}),
        ...(config.modelId ? { modelId: String(config.modelId) } : {})
      };
      
      // 保存配置
      this.modelConfig = sanitizedConfig;
      
      console.log('模型配置已更新:', {
        useGlobal: this.modelConfig.useGlobal,
        temperature: this.modelConfig.temperature,
        useCustomApi: this.modelConfig.useCustomApiSettings,
        hasCustomEndpoint: Boolean(this.modelConfig.customApiEndpoint),
        hasApiKey: Boolean(this.modelConfig.customApiKey),
        providerId: this.modelConfig.providerId || '无',
        model: this.modelConfig.model || '无'
      });
      
      // 验证配置一致性
      if (this.modelConfig.useGlobal && !this.modelConfig.useCustomApiSettings) {
        if (this.modelConfig.providerId || this.modelConfig.model) {
          console.warn('检测到配置不一致: 全局模型模式下不应指定提供商或模型');
        }
      }
      
      if (this.modelConfig.useCustomApiSettings) {
        if (this.modelConfig.useGlobal) {
          console.warn('检测到配置不一致: 自定义API模式下不应启用全局模型');
          // 强制关闭全局模型设置
          this.modelConfig.useGlobal = false;
        }
      }
    } catch (error) {
      console.error('设置模型配置时出错:', error);
      // 保留原有配置
    }
  }
  
  /**
   * 获取当前模型配置
   * @returns {Object} 当前模型配置
   */
  getModelConfig() {
    return { ...this.modelConfig }; // 返回副本以防止意外修改
  }
}

// 创建工具管理器实例
const toolManager = new ToolManager();

// 确保正确导出toolManager
export { toolManager };

/**
 * 生成适用于自定义模型的配置选项
 * @param {Object} modelConfig - 模型配置对象
 * @returns {Object} 适用于AI API调用的配置对象
 */
const createCustomModelOptions = (modelConfig) => {
  // 初始验证并设置默认配置
  if (!modelConfig) {
    console.warn('模型配置为空，使用默认配置');
    return {
      temperature: 0.7,
      apiMaxContexts: 1
    };
  }
  
  // 记录接收到的原始配置
  console.log('创建自定义模型选项 - 原始配置:', JSON.stringify(modelConfig));
  
  // 基础配置 - 确保数值有效
  const options = {
    temperature: typeof modelConfig.temperature === 'number' ? modelConfig.temperature : 0.7,
    apiMaxContexts: typeof modelConfig.maxContexts === 'number' ? modelConfig.maxContexts : 1
  };
  
  // 处理自定义API设置 - 最高优先级
  if (modelConfig.useCustomApiSettings === true) {
    console.log('检测到自定义API配置');
    
    // 仅当值存在且非空时才添加
    if (modelConfig.customApiEndpoint && typeof modelConfig.customApiEndpoint === 'string') {
      options.apiBaseURL = modelConfig.customApiEndpoint.trim();
    }
    
    if (modelConfig.customApiKey && typeof modelConfig.customApiKey === 'string') {
      options.apiKey = modelConfig.customApiKey.trim();
    }
    
    if (modelConfig.customModelName && typeof modelConfig.customModelName === 'string') {
      options.model = modelConfig.customModelName.trim();
    }
    
    console.log('使用自定义API设置:', {
      endpoint: options.apiBaseURL ? '已设置' : '未设置',
      model: options.model || '未设置',
      hasKey: Boolean(options.apiKey)
    });
    
    // 验证配置完整性
    const missingFields = [];
    if (!options.apiBaseURL) missingFields.push('API端点');
    if (!options.apiKey) missingFields.push('API密钥');
    if (!options.model) missingFields.push('模型名称');
    
    if (missingFields.length > 0) {
      console.warn(`自定义API配置不完整，缺少: ${missingFields.join(', ')}`);
    }
    
    return options; // 直接返回，不使用全局设置
  }
  
  // 如果选择了特定供应商和模型，但不是全局模型 - 第二优先级
  if (modelConfig.useGlobal === false && modelConfig.providerId && modelConfig.model) {
    console.log('检测到指定模型配置');
    
    // 确保值有效
    if (typeof modelConfig.model === 'string' && modelConfig.model.trim()) {
      options.model = modelConfig.model.trim();
    }
    
    if (typeof modelConfig.providerId === 'string' && modelConfig.providerId.trim()) {
      options.apiProvider = modelConfig.providerId.trim();
    }
    
    // 添加模型ID（如果存在）
    if (modelConfig.modelId && typeof modelConfig.modelId === 'string') {
      options.modelId = modelConfig.modelId.trim();
    }
    
    console.log('使用选定模型:', {
      provider: options.apiProvider || '未设置',
      model: options.model || '未设置',
      modelId: options.modelId || '未设置'
    });
    
    // 验证配置完整性
    const missingFields = [];
    if (!options.apiProvider) missingFields.push('提供商ID');
    if (!options.model) missingFields.push('模型名称');
    
    if (missingFields.length > 0) {
      console.warn(`模型配置不完整，缺少: ${missingFields.join(', ')}`);
    }
    
    return options; // 使用选定的供应商和模型，不使用全局设置
  }
  
  // 最后是全局设置 - 最低优先级
  if (modelConfig.useGlobal === true) {
    console.log('使用全局模型配置，仅传递温度和上下文设置');
    // 使用全局模型时，不设置供应商和模型字段，只设置温度和上下文数
    return {
      temperature: options.temperature,
      apiMaxContexts: options.apiMaxContexts
    };
  }
  
  console.log('最终使用的配置选项:', options);
  return options;
};

/**
 * 使用AI分析工具调用意图
 * @param {string} userInput - 用户输入
 * @returns {Promise<Object>} - 分析结果
 */
const analyzeToolIntent = async (userInput) => {
  // 首先使用简单规则快速检测常见工具调用模式
  // 示例：记日记模式
  if (userInput.includes('记到日记') || userInput.includes('写到日记') || userInput.includes('添加到日记')) {
    const contentMatch = userInput.match(/[记写添加]到日记[里中][:：]?\s*(.+)$/);
    if (contentMatch && contentMatch[1]) {
      return {
        isToolCall: true,
        toolName: 'writeToJournal',
        parameters: contentMatch[1].trim()
      };
    }
  }
  
  // 示例：扩充内容模式
  if (userInput.includes('扩充') || userInput.includes('丰富') || userInput.includes('详细描述')) {
    const contentMatch = userInput.match(/[扩充丰富详细描述]+[一下下]?\s*[:：]?\s*(.+)$/);
    if (contentMatch && contentMatch[1]) {
      return {
        isToolCall: true,
        toolName: 'expandText',
        parameters: contentMatch[1].trim()
      };
    }
  }
  
  // 对于复杂情况，使用AI分析
  try {
    const systemPrompt = `你是一个工具调用意图分析器。分析用户输入是否包含特定工具调用意图。
    目前支持的工具有：
    1. writeToJournal - 将内容写入日记
    2. expandText - 扩充或丰富内容
    
    返回格式要求（JSON格式）：
    {
      "isToolCall": true/false,
      "toolName": "工具名称（如writeToJournal）",
      "parameters": "参数内容"
    }
    
    如果不是工具调用，则返回 {"isToolCall": false}`;
    
    const prompt = `分析以下用户输入是否包含工具调用意图:\n"${userInput}"`;
    
    // 使用流式AI接口
    const modelConfig = toolManager.getModelConfig();
    console.log('分析工具意图使用的模型配置:', modelConfig);
    const customOptions = createCustomModelOptions(modelConfig);
    console.log('分析工具意图创建的API选项:', customOptions);
    const response = await computeSyncAIPrompt(prompt, systemPrompt, customOptions);
    
    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('AI响应解析失败:', e);
      // 返回非工具调用
      return { isToolCall: false };
    }
  } catch (error) {
    console.error('AI分析意图失败:', error);
    // 出错时默认为非工具调用
    return { isToolCall: false };
  }
};

/**
 * 使用AI扩充内容
 * @param {string} content - 原始内容
 * @param {function} onProgress - 进度回调，用于流式响应
 * @returns {Promise<string>} - 扩充后的内容
 */
const expandContent = async (content, onProgress) => {
  const systemPrompt = `你是一个专业的内容扩充助手。请将用户提供的简短内容扩充成完整、流畅的段落，
  保留原始意思但使其更加丰富详实。使用优美的中文表达。`;
  
  const prompt = `请扩充以下内容:\n"${content}"`;
  
  try {
    // 获取自定义模型配置
    const modelConfig = toolManager.getModelConfig();
    console.log('扩充内容使用的模型配置:', modelConfig);
    
    // 显式创建自定义选项，确保正确应用覆盖设置
    const customOptions = createCustomModelOptions(modelConfig);
    console.log('扩充内容创建的API选项:', customOptions);
    
    // 如果提供了进度回调，使用流式响应
    if (onProgress && typeof onProgress === 'function') {
      let fullResponse = '';
      
      // 使用流式AI接口
      const sseGenerator = fromSiyuanSSEPrompt(prompt, systemPrompt, customOptions);
      
      for await (const chunk of sseGenerator) {
        if (chunk.choices && chunk.choices.length > 0) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          onProgress({
            type: 'progress',
            content: fullResponse,
            delta: content
          });
        }
      }
      
      return fullResponse;
    } else {
      // 不需要流式响应时，直接使用同步API
      return await computeSyncAIPrompt(prompt, systemPrompt, customOptions);
    }
  } catch (error) {
    console.error('内容扩充失败:', error);
    throw new Error('内容扩充失败: ' + error.message);
  }
};

/**
 * 将内容追加到思源笔记文档
 * @param {string} docId - 文档ID
 * @param {string} content - 要追加的内容
 */
const appendToDocument = async (docId, content) => {
  try {
    // 首先获取文档当前内容
    const response = await fetch('/api/block/getDocInfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId })
    });
    
    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`获取文档信息失败: ${data.msg}`);
    }
    
    // 追加内容
    const appendResponse = await fetch('/api/block/appendBlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentID: docId,
        dataType: "markdown",
        data: `\n\n${content}`
      })
    });
    
    const appendData = await appendResponse.json();
    if (appendData.code !== 0) {
      throw new Error(`追加内容失败: ${appendData.msg}`);
    }
    
    return true;
  } catch (error) {
    console.error('追加文档内容失败:', error);
    throw error;
  }
};

/**
 * 保存内容到思源笔记日记
 * @param {string} content - 要保存的内容
 * @returns {Promise<Object>} - 保存结果
 */
const saveToJournal = async (content) => {
  try {
    // 获取今天的日期
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // 构建思源API请求创建或获取日记
    const response = await fetch('/api/notebook/createDailyNote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook: "日记", date: dateStr })
    });
    
    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`创建日记失败: ${data.msg}`);
    }
    
    // 获取日记ID后追加内容
    const docId = data.data.id;
    await appendToDocument(docId, content);
    
    return { 
      success: true, 
      message: "内容已添加到今日日记",
      docId: docId
    };
  } catch (error) {
    console.error('保存日记失败:', error);
    return { 
      success: false, 
      message: `保存日记失败: ${error.message}`
    };
  }
};

/**
 * 处理普通查询
 * @param {string} query - 用户查询
 * @param {function} onProgress - 进度回调，用于流式响应
 * @returns {Promise<Object>} - 处理结果
 */
const processNormalQuery = async (query, onProgress) => {
  try {
    // 获取自定义模型配置
    const modelConfig = toolManager.getModelConfig();
    console.log('处理查询使用的模型配置:', modelConfig);
    
    // 显式创建自定义选项，确保正确应用覆盖设置
    const customOptions = createCustomModelOptions(modelConfig);
    console.log('处理查询创建的API选项:', customOptions);
    
    // 如果提供了进度回调，使用流式响应
    if (onProgress && typeof onProgress === 'function') {
      let fullResponse = '';
      
      // 使用流式AI接口
      const sseGenerator = fromSiyuanSSEPrompt(query, '', customOptions);
      
      for await (const chunk of sseGenerator) {
        if (chunk.choices && chunk.choices.length > 0) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          onProgress({
            type: 'query-progress',
            content: fullResponse,
            delta: content
          });
        }
      }
      
      return fullResponse;
    } else {
      const response = await computeSyncAIPrompt(query, '', customOptions);
      return response;
    }
  } catch (error) {
    console.error('处理查询失败:', error);
    throw new Error(`处理查询失败: ${error.message}`);
  }
};

/**
 * 处理工具命令
 * @param {string} userInput - 用户输入
 * @param {function} onProgress - 进度回调函数
 * @returns {Promise<Object>} - 处理结果
 */
export const processToolCommand = async (userInput, onProgress) => {
  try {
    // 在每次命令开始处理时，验证当前模型配置
    const currentConfig = toolManager.getModelConfig();
    console.log('当前处理命令使用的模型配置:', currentConfig);
    
    // 分析用户输入是否为工具调用
    const intent = await analyzeToolIntent(userInput);
    
    if (intent.isToolCall && toolManager.hasTool(intent.toolName)) {
      // 执行工具调用
      const result = await toolManager.execute(intent.toolName, intent.parameters, { onProgress });
      return {
        type: 'tool-execution',
        toolName: intent.toolName,
        result: result
      };
    } else {
      // 作为普通查询处理
      try {
        const content = await processNormalQuery(userInput, onProgress);
        return {
          type: 'query-response',
          content: content
        };
      } catch (error) {
        return {
          type: 'query-response',
          content: `抱歉，处理您的查询遇到错误: ${error.message}`,
          error: true
        };
      }
    }
  } catch (error) {
    console.error('处理工具命令失败:', error);
    throw error;
  }
};

// 注册内置工具
toolManager.register({
  // 扩充内容工具
  async expandText(content, { onProgress } = {}) {
    try {
      const expandedContent = await expandContent(content, onProgress);
      return {
        success: true,
        message: expandedContent
      };
    } catch (error) {
      return {
        success: false,
        message: `扩充内容失败: ${error.message}`
      };
    }
  },
  
  // 写入日记工具
  async writeToJournal(content, { onProgress } = {}) {
    try {
      // 先扩充内容
      const expandedContent = await expandContent(content, onProgress);
      
      // 写入日记
      const journalResult = await saveToJournal(expandedContent);
      
      return {
        success: true,
        message: `已将内容写入日记: ${journalResult.title}\n\n${expandedContent}`
      };
    } catch (error) {
      return {
        success: false,
        message: `写入日记失败: ${error.message}`
      };
    }
  }
});

export default {
  processToolCommand,
  toolManager,
  expandContent,
  saveToJournal
};