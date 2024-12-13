const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const DEFAULT_TIMEOUT = 5000;

/**
 * 带超时的 fetch 请求
 * @param {string} url - 请求URL
 * @param {Object} [options] - fetch配置选项
 * @param {number} [timeout=DEFAULT_TIMEOUT] - 超时时间(ms)
 */
export const fetchWithTimeout = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * 获取包信息
 * @param {string} packageName - 包名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.registry] - npm registry地址
 */
export const getPackageInfo = async (packageName, options = {}) => {
  const registry = options.registry || DEFAULT_REGISTRY;
  try {
    return await fetchWithTimeout(`${registry}/${packageName}`);
  } catch (error) {
    throw new Error(`获取包信息失败: ${error.message}`);
  }
};

/**
 * 获取包的所有版本
 * @param {string} packageName - 包名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.registry] - npm registry地址
 */
export const getPackageVersions = async (packageName, options = {}) => {
  try {
    const info = await getPackageInfo(packageName, options);
    return Object.keys(info.versions || {});
  } catch (error) {
    throw new Error(`获取包版本失败: ${error.message}`);
  }
};

/**
 * 搜索包
 * @param {string} keyword - 搜索关键词
 * @param {Object} [options] - 可选配置
 * @param {string} [options.registry] - npm registry地址
 * @param {number} [options.limit=10] - 返回结果数量限制
 */
export const searchPackages = async (keyword, options = {}) => {
  const registry = options.registry || DEFAULT_REGISTRY;
  const limit = options.limit || 10;
  
  try {
    const data = await fetchWithTimeout(
      `${registry}/-/v1/search?text=${encodeURIComponent(keyword)}&size=${limit}`
    );
    return data.objects;
  } catch (error) {
    throw new Error(`搜索包失败: ${error.message}`);
  }
};
