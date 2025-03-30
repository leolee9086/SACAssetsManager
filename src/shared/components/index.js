/**
 * 共享UI组件导出
 * 
 * 统一导出所有基础Vue UI组件，方便在项目中使用。
 * 组件采用JavaScript API定义Vue组件，而非单文件组件(.vue)。
 * 
 * @module shared/components
 */

// 从各子模块导出组件
export * from './base/button.js';
export * from './controls/numberInput.js';
export * from './layout/flexContainer.js';

// 收集所有组件样式
import { buttonStyle } from './base/button.js';
import { numberInputStyle } from './controls/numberInput.js';
import { flexContainerStyle } from './layout/flexContainer.js';

/**
 * 所有组件的样式集合
 * 可以通过注入到应用中使用
 */
export const componentStyles = `
${buttonStyle}
${numberInputStyle}
${flexContainerStyle}
`;

/**
 * 创建组件样式表并注入到文档中
 * @returns {HTMLStyleElement} 样式元素
 */
export const 注入组件样式 = () => {
  if (typeof document === 'undefined') {
    console.warn('当前环境不支持DOM操作，无法注入样式');
    return null;
  }
  
  const styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  styleEl.textContent = componentStyles;
  document.head.appendChild(styleEl);
  
  return styleEl;
};

/**
 * 移除组件样式表
 * @param {HTMLStyleElement} styleElement - 由注入组件样式方法返回的样式元素
 * @returns {boolean} 是否成功移除
 */
export const 移除组件样式 = (styleElement) => {
  if (!styleElement || typeof document === 'undefined') {
    return false;
  }
  
  if (document.head.contains(styleElement)) {
    document.head.removeChild(styleElement);
    return true;
  }
  
  return false;
};

/**
 * Vue插件，用于全局注册所有组件
 * 使用方式: Vue.use(SacComponents)
 */
export const SacComponents = {
  install(Vue, options = {}) {
    // 从base目录导入
    const { SacButton, SacButtonGroup } = require('./base/button.js');
    
    // 从controls目录导入
    const { SacNumberInput, SacEditableNumberInput } = require('./controls/numberInput.js');
    
    // 从layout目录导入
    const { 
      SacFlexContainer, SacRow, SacColumn, SacSpacer, SacFlexItem 
    } = require('./layout/flexContainer.js');
    
    // 注册组件
    Vue.component(SacButton.name, SacButton);
    Vue.component(SacButtonGroup.name, SacButtonGroup);
    
    Vue.component(SacNumberInput.name, SacNumberInput);
    Vue.component(SacEditableNumberInput.name, SacEditableNumberInput);
    
    Vue.component(SacFlexContainer.name, SacFlexContainer);
    Vue.component(SacRow.name, SacRow);
    Vue.component(SacColumn.name, SacColumn);
    Vue.component(SacSpacer.name, SacSpacer);
    Vue.component(SacFlexItem.name, SacFlexItem);
    
    // 自动注入样式
    if (options.injectStyles !== false && typeof document !== 'undefined') {
      注入组件样式();
    }
  }
};

// 英文别名
export const injectComponentStyles = 注入组件样式;
export const removeComponentStyles = 移除组件样式; 