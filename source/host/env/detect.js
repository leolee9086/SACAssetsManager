/**
 * 思源笔记窗口环境检测模块
 * 使用函数式编程方式检测当前运行环境
 */

// 环境类型常量
export const EnvironmentType = {
  ELECTRON_MAIN: 'electron-main',           // 应用主窗口(有node环境)
  ELECTRON_WINDOW: 'electron-window',       // "在新窗口打开"的electron窗口(有node环境)
  DESKTOP_BROWSER: 'desktop-browser',       // 通过网络伺服打开的桌面浏览器
  MOBILE_APP: 'mobile-app',                 // 移动端app
  MOBILE_BROWSER: 'mobile-browser',         // 移动端浏览器
  READONLY_PUBLISH: 'readonly-publish',     // 思源只读发布
  FRAMEWORK_PUBLISH: 'framework-publish',   // 框架自行实现的发布页面
  UNKNOWN: 'unknown'                        // 未知环境
};

// 特征检测函数

/**
 * 检测是否有Node.js环境
 */
const hasNodeEnvironment = () => {
  return typeof process !== 'undefined' && 
         process.versions && 
         process.versions.node;
};

/**
 * 检测是否在Electron环境中
 */
const isElectron = () => {
  // 检测渲染进程
  if (typeof window !== 'undefined' && 
      typeof window.process === 'object' && 
      window.process.type === 'renderer') {
    return true;
  }
  
  // 检测主进程
  if (typeof process !== 'undefined' && 
      typeof process.versions === 'object' && 
      !!process.versions.electron) {
    return true;
  }
  
  // 检测navigator.userAgent
  if (typeof navigator === 'object' && 
      typeof navigator.userAgent === 'string' && 
      navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }
  
  return false;
};

/**
 * 检测是否是思源API可用
 */
const hasSiyuanAPI = () => {
  return typeof window !== 'undefined' && 
         typeof window.siyuan === 'object';
};

/**
 * 检测是否是移动设备
 */
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileRegex = /android|iPad|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i;
  
  // 检测userAgent
  if (mobileRegex.test(userAgent)) return true;
  
  // 检测屏幕尺寸（作为辅助判断）
  if (typeof window !== 'undefined') {
    return window.innerWidth <= 800;
  }
  
  return false;
};

/**
 * 检测是否是思源只读发布模式
 */
const isReadonlyPublish = () => {
  // 思源发布模式特有标识
  return typeof window !== 'undefined' && 
         window.document && 
         window.document.documentElement.classList.contains('fn__flex-column');
};

/**
 * 检测是否是框架自行实现的发布页面
 */
const isFrameworkPublish = () => {
  // 自行实现的发布页面应该有特定标记
  return typeof window !== 'undefined' && 
         window.EXTENSION_FRAMEWORK_PUBLISH === true;
};

/**
 * 检测是否通过网络伺服访问
 */
const isServedOverNetwork = () => {
  if (typeof window === 'undefined' || !window.location) return false;
  
  // 通过URL判断是否通过网络访问
  // 思源本地通常是 127.0.0.1 或 localhost
  const { hostname } = window.location;
  
  // 如果不是localhost或127.0.0.1，则认为是通过网络访问
  return !['localhost', '127.0.0.1'].includes(hostname);
};

/**
 * 主检测函数 - 返回当前环境类型
 */
export const detectEnvironment = () => {
  // Electron主窗口（拥有Node环境的Electron）
  if (isElectron() && hasNodeEnvironment() && hasSiyuanAPI()) {
    return EnvironmentType.ELECTRON_MAIN;
  }
  
  // Electron新窗口（无Node环境的Electron窗口）
  if (isElectron() && !hasNodeEnvironment() && hasSiyuanAPI()) {
    return EnvironmentType.ELECTRON_WINDOW;
  }
  
  // 框架自行实现的发布页面
  if (isFrameworkPublish()) {
    return isMobileDevice() 
      ? EnvironmentType.FRAMEWORK_PUBLISH 
      : EnvironmentType.FRAMEWORK_PUBLISH;
  }
  
  // 思源只读发布
  if (isReadonlyPublish()) {
    return EnvironmentType.READONLY_PUBLISH;
  }
  
  // 移动端APP
  if (isMobileDevice() && hasSiyuanAPI() && !isServedOverNetwork()) {
    return EnvironmentType.MOBILE_APP;
  }
  
  // 移动端浏览器
  if (isMobileDevice() && isServedOverNetwork()) {
    return EnvironmentType.MOBILE_BROWSER;
  }
  
  // 桌面浏览器
  if (!isMobileDevice() && isServedOverNetwork() && hasSiyuanAPI()) {
    return EnvironmentType.DESKTOP_BROWSER;
  }
  
  // 未知环境
  return EnvironmentType.UNKNOWN;
};

/**
 * 获取环境详细信息
 */
export const getEnvironmentInfo = () => {
  const envType = detectEnvironment();
  
  return {
    type: envType,
    features: {
      hasNode: hasNodeEnvironment(),
      isElectron: isElectron(),
      hasSiyuanAPI: hasSiyuanAPI(),
      isMobile: isMobileDevice(),
      isNetworkServed: isServedOverNetwork(),
      isReadonlyMode: isReadonlyPublish() || envType === EnvironmentType.READONLY_PUBLISH,
      isPublish: isFrameworkPublish() || isReadonlyPublish(),
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    url: typeof window !== 'undefined' ? window.location.href : null
  };
};

/**
 * 检查特定环境特性是否可用
 * @param {string} feature 要检查的特性名称
 * @returns {boolean} 特性是否可用
 */
export const hasFeature = (feature) => {
  const info = getEnvironmentInfo();
  
  switch (feature) {
    case 'node': return info.features.hasNode;
    case 'electron': return info.features.isElectron;
    case 'siyuanAPI': return info.features.hasSiyuanAPI;
    case 'editing': return !info.features.isReadonlyMode;
    case 'network': return info.features.isNetworkServed;
    default: return false;
  }
};
