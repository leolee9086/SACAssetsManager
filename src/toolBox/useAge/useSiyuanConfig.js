import { readDir, readFile } from '../polyfills/fs.js'
const CONFIG_PREFIX = '_' // 配置文件名前缀
// 加载最新AI配置
export async function 从思源工作空间路径加载AI配置(configPath) {
  try {
    const files = await readDir(configPath)
    const configFiles = files
      .filter(file => file.name.startsWith(CONFIG_PREFIX))
      .sort((a, b) => b.name.localeCompare(a.name)) // 按文件名倒序

    if (configFiles.length === 0) {
      console.warn('未找到AI配置文件')
      return null
    }
    const latestFile = configFiles[0]
    const filePath = `${configPath}/${latestFile.name}`
    const rawData = await readFile(filePath)
    const config = JSON.parse(rawData)
    validateConfig(config)
    return {
      ...config,
      _meta: {
        configPath: filePath,
        lastModified: latestFile.mtime
      }
    }
  } catch (error) {
    console.error('AI配置加载失败:', error)
    throw new Error('AI配置加载失败: ' + error.message)
  }
}

// 配置验证
function validateConfig(config) {
  const requiredFields = [
    'apiKey', 'apiModel', 'apiBaseURL',
    'apiTimeout', 'apiMaxTokens'
  ]
  
  requiredFields.forEach(field => {
    if (!config[field]) {
      throw new Error(`缺少必要配置项: ${field}`)
    }
  })

  // 验证URL格式
  if (!isValidUrl(config.apiBaseURL)) {
    throw new Error('无效的API地址格式')
  }
}

function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 初始化AI配置
export async function initializeAIConfig() {
  const config = await loadLatestAIConfig()
  return {
    apiKey: config.apiKey,
    baseURL: config.apiBaseURL,
    timeout: config.apiTimeout * 1000, // 转换为毫秒
    model: config.apiModel,
    maxTokens: config.apiMaxTokens,
    temperature: config.apiTemperature || 1.0,
    headers: {
      'User-Agent': config.apiUserAgent,
      'Authorization': `Bearer ${config.apiKey}`
    }
  }
} 