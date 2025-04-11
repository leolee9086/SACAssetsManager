/**
 * 面板发现服务
 * 在应用启动和运行时自动发现和注册面板
 */

import { registerPanel, getAllPanels, PANEL_TYPES } from './panelRegistry.js';

// 存储已发现的面板ID，避免重复处理
const discoveredPanelIds = new Set();

// 面板选择器定义
const PANEL_SELECTORS = [
  // 带有data-panel-id属性的元素
  '[data-panel-id]',
  // 思源笔记标签页
  '.layout-tab-container',
  // 侧边栏面板
  '.fn__flex-column.side-panel',
  // 主要内容区域
  '.fn__flex-1.protyle',
  // 带有特定CSS类的面板
  '.custom-panel, .panel-container'
];

/**
 * 自动发现DOM中的面板元素并注册到面板注册表
 * @param {boolean} [verbose=false] 是否输出详细日志
 * @returns {Array} 新发现的面板列表
 */
export function discoverPanelsFromDOM(verbose = false) {
  if (typeof document === 'undefined') {
    console.warn('面板发现服务: DOM不可用，无法执行面板发现');
    return [];
  }
  
  try {
    const newPanels = [];
    const selector = PANEL_SELECTORS.join(', ');
    
    if (verbose) {
      console.log(`面板发现服务: 使用选择器 "${selector}" 查找面板元素`);
    }
    
    // 查找所有可能的面板元素
    const potentialPanels = document.querySelectorAll(selector);
    
    if (verbose) {
      console.log(`面板发现服务: 找到 ${potentialPanels.length} 个潜在面板元素`);
    }
    
    // 遍历并处理每个潜在的面板元素
    potentialPanels.forEach(element => {
      // 尝试获取面板ID
      let panelId = element.getAttribute('data-panel-id');
      
      // 如果没有明确的panel-id，生成基于其他属性的ID
      if (!panelId) {
        // 尝试从各种属性和特征生成一个稳定的ID
        const elementId = element.id;
        const classes = Array.from(element.classList).join('_');
        const tabId = element.getAttribute('data-tab-id');
        const docId = element.getAttribute('data-doc-id');
        
        if (elementId) {
          panelId = `panel_${elementId}`;
        } else if (tabId) {
          panelId = `tab_${tabId}`;
        } else if (docId) {
          panelId = `doc_${docId}`;
        } else if (classes) {
          // 使用类名的哈希作为ID
          panelId = `panel_${hashCode(classes)}_${Date.now().toString(36)}`;
        } else {
          // 如果没有可用的标识符，使用位置信息
          const rect = element.getBoundingClientRect();
          panelId = `panel_${Math.round(rect.x)}_${Math.round(rect.y)}_${Math.round(rect.width)}`;
        }
      }
      
      // 如果这个面板已经被发现过，跳过
      if (discoveredPanelIds.has(panelId)) {
        return;
      }
      
      // 确定面板类型
      let panelType = PANEL_TYPES.STANDARD;
      if (element.classList.contains('side-panel')) {
        panelType = PANEL_TYPES.SIDEBAR;
      } else if (element.classList.contains('layout-tab-container')) {
        panelType = PANEL_TYPES.DIALOG;
      } else if (element.classList.contains('protyle')) {
        panelType = PANEL_TYPES.CUSTOM;
      }
      
      // 提取面板名称
      const panelName = determinePanelName(element, panelId);
      
      // 注册面板
      registerPanel(panelId, {
        name: panelName,
        type: panelType,
        metadata: {
          element,
          discovered: true,
          discoveredAt: Date.now(),
          domPath: getDomPath(element)
        }
      });
      
      // 添加到已发现面板列表
      discoveredPanelIds.add(panelId);
      
      // 添加到返回结果
      newPanels.push({
        id: panelId,
        name: panelName,
        type: panelType,
        element
      });
      
      if (verbose) {
        console.log(`面板发现服务: 发现并注册面板 "${panelName}" (ID: ${panelId}, 类型: ${panelType})`);
      }
    });
    
    if (verbose) {
      console.log(`面板发现服务: 本次共发现 ${newPanels.length} 个新面板`);
    }
    
    return newPanels;
  } catch (error) {
    console.error('面板发现服务: 在发现面板过程中发生错误:', error);
    return [];
  }
}

/**
 * 手动注册面板
 * 提供一种方式在DOM发现以外注册面板
 * 
 * @param {string} panelId - 面板ID
 * @param {string} panelName - 面板名称
 * @param {Object} [options] - 额外的注册选项
 * @returns {boolean} 是否成功注册
 */
export function registerPanelManually(panelId, panelName, options = {}) {
  if (!panelId) {
    console.error('面板注册失败: 缺少panelId');
    return false;
  }
  
  // 使用现有的registerPanel函数注册
  const result = registerPanel(panelId, {
    name: panelName || panelId,
    metadata: {
      manuallyRegistered: true,
      registeredAt: Date.now(),
      ...options.metadata
    },
    ...options
  });
  
  // 添加到已发现面板列表，防止重复发现
  if (result) {
    discoveredPanelIds.add(panelId);
  }
  
  return result;
}

/**
 * 启动面板发现服务
 * @param {Object} options 配置选项
 * @param {boolean} [options.runImmediately=true] 是否立即运行一次发现
 * @param {boolean} [options.observeDOMChanges=true] 是否观察DOM变化并自动发现新面板
 * @param {number} [options.pollInterval=0] 轮询间隔(毫秒)，0表示不轮询
 * @param {boolean} [options.verbose=false] 是否输出详细日志
 * @returns {Object} 服务控制器
 */
export function startPanelDiscoveryService(options = {}) {
  const {
    runImmediately = true,
    observeDOMChanges = true,
    pollInterval = 0,
    verbose = false
  } = options;
  
  let observer = null;
  let pollTimer = null;
  
  // 手动注册一些基础面板，确保始终有面板可用于绑定
  function registerBasePanels() {
    // 注册独立的示例面板，这些面板不会从DOM发现
    registerPanelManually('demo_panel1', '示例面板 1', {
      type: PANEL_TYPES.STANDARD,
      groups: ['demo']
    });
    
    registerPanelManually('demo_panel2', '示例面板 2', {
      type: PANEL_TYPES.STANDARD,
      groups: ['demo']
    });
    
    if (verbose) {
      console.log('面板发现服务: 已注册基础示例面板');
    }
  }
  
  // 注册基础面板
  registerBasePanels();
  
  // 立即运行一次发现
  if (runImmediately) {
    discoverPanelsFromDOM(verbose);
  }
  
  // 设置DOM变化观察器
  if (observeDOMChanges && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver((mutations) => {
      // 检查是否有面板相关的变化
      const shouldRun = mutations.some(mutation => {
        // 如果添加了节点
        if (mutation.addedNodes.length > 0) {
          return true;
        }
        
        // 如果属性变化
        if (mutation.type === 'attributes') {
          const relevantAttrs = ['id', 'class', 'data-panel-id', 'data-tab-id', 'data-doc-id'];
          return relevantAttrs.includes(mutation.attributeName);
        }
        
        return false;
      });
      
      if (shouldRun) {
        discoverPanelsFromDOM(verbose);
      }
    });
    
    // 开始观察整个文档
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'class', 'data-panel-id', 'data-tab-id', 'data-doc-id']
    });
    
    if (verbose) {
      console.log('面板发现服务: DOM变化观察器已启动');
    }
  }
  
  // 设置轮询
  if (pollInterval > 0) {
    pollTimer = setInterval(() => {
      discoverPanelsFromDOM(verbose);
    }, pollInterval);
    
    if (verbose) {
      console.log(`面板发现服务: 轮询器已启动，间隔 ${pollInterval}ms`);
    }
  }
  
  // 返回服务控制器
  return {
    // 手动运行一次发现
    discover: () => discoverPanelsFromDOM(verbose),
    
    // 手动注册面板
    registerPanel: registerPanelManually,
    
    // 获取所有已发现的面板ID
    getDiscoveredPanelIds: () => Array.from(discoveredPanelIds),
    
    // 停止服务
    stop: () => {
      if (observer) {
        observer.disconnect();
        observer = null;
        if (verbose) {
          console.log('面板发现服务: DOM变化观察器已停止');
        }
      }
      
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
        if (verbose) {
          console.log('面板发现服务: 轮询器已停止');
        }
      }
      
      if (verbose) {
        console.log('面板发现服务: 已完全停止');
      }
    },
    
    // 修改选项
    updateOptions: (newOptions) => {
      // 停止现有服务
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      
      // 使用新选项重启服务
      return startPanelDiscoveryService({
        ...options,
        ...newOptions,
        runImmediately: true // 始终立即运行一次
      });
    }
  };
}

/**
 * 从元素中确定面板名称
 * @param {Element} element - DOM元素
 * @param {string} fallbackId - 用作后备的ID
 * @returns {string} 面板名称
 */
function determinePanelName(element, fallbackId) {
  // 尝试从data-panel-name属性获取
  let name = element.getAttribute('data-panel-name');
  if (name) return name;
  
  // 尝试从标题元素获取
  const titleElement = element.querySelector('h1, h2, h3, h4, h5, h6, .title, .panel-title, [data-title]');
  if (titleElement) {
    name = titleElement.textContent.trim();
    if (name) return name;
  }
  
  // 尝试从tab-title属性获取
  name = element.getAttribute('data-tab-title');
  if (name) return name;
  
  // 如果都没有，使用ID的用户友好版本
  if (fallbackId) {
    // 移除前缀和时间戳等
    return fallbackId.split('_')[0].replace(/([A-Z])/g, ' $1').trim();
  }
  
  // 最后的后备
  return '未命名面板';
}

/**
 * 获取元素的DOM路径
 * @param {Element} element - DOM元素
 * @returns {string} DOM路径
 */
function getDomPath(element) {
  if (!element) return '';
  
  const path = [];
  let currentElement = element;
  
  while (currentElement !== document.body && currentElement.parentElement) {
    let selector = currentElement.tagName.toLowerCase();
    
    // 添加ID
    if (currentElement.id) {
      selector += `#${currentElement.id}`;
    } else {
      // 添加类
      const classes = Array.from(currentElement.classList).join('.');
      if (classes) {
        selector += `.${classes}`;
      }
      
      // 添加位置
      const siblings = Array.from(currentElement.parentElement.children);
      const index = siblings.indexOf(currentElement);
      selector += `:nth-child(${index + 1})`;
    }
    
    path.unshift(selector);
    currentElement = currentElement.parentElement;
  }
  
  return path.join(' > ');
}

/**
 * 计算字符串的哈希码
 * @param {string} str - 输入字符串
 * @returns {string} 哈希码
 */
function hashCode(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash.toString(36);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(36);
}

// 导出单例实例
export const discoveryService = startPanelDiscoveryService({
  runImmediately: true,
  observeDOMChanges: true,
  pollInterval: 5000, // 每5秒轮询一次
  verbose: false
}); 