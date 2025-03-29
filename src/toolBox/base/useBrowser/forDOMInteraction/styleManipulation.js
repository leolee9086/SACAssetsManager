/**
 * DOM元素样式操作工具
 * 提供各种DOM元素样式的动态操作函数
 */

/**
 * 更新元素高度，用于展开/折叠过渡效果
 * @param {HTMLElement} 元素 - 要更新高度的DOM元素
 * @param {boolean} 是否展开 - true表示展开，false表示折叠
 * @param {Object} [选项] - 其他选项
 * @param {string} [选项.属性='maxHeight'] - 要更新的CSS属性
 * @param {string} [选项.单位='px'] - CSS单位
 * @param {string} [选项.折叠值='0px'] - 折叠状态的值
 */
export function 更新元素高度(元素, 是否展开, 选项 = {}) {
  if (!元素 || !(元素 instanceof HTMLElement)) return;
  
  const { 
    属性 = 'maxHeight', 
    单位 = 'px', 
    折叠值 = '0px'
  } = 选项;
  
  if (是否展开) {
    元素.style[属性] = `${元素.scrollHeight}${单位}`;
  } else {
    元素.style[属性] = 折叠值;
  }
}

/**
 * 平滑设置元素高度
 * @param {HTMLElement} 元素 - 要更新高度的DOM元素
 * @param {number|string} 目标高度 - 目标高度值，如果是数字则添加px单位
 * @param {Object} [选项] - 其他选项
 * @param {string} [选项.属性='height'] - 要更新的CSS属性
 * @param {number} [选项.持续时间=300] - 过渡持续时间(毫秒)
 * @param {string} [选项.时间函数='ease'] - CSS过渡时间函数
 * @returns {Promise<void>} 过渡完成时解析的Promise
 */
export function 平滑设置高度(元素, 目标高度, 选项 = {}) {
  if (!元素 || !(元素 instanceof HTMLElement)) {
    return Promise.reject(new Error('无效的DOM元素'));
  }
  
  const { 
    属性 = 'height', 
    持续时间 = 300, 
    时间函数 = 'ease'
  } = 选项;
  
  // 处理高度值
  const 高度值 = typeof 目标高度 === 'number' ? `${目标高度}px` : 目标高度;
  
  // 保存原有过渡
  const 原过渡 = 元素.style.transition;
  
  // 设置新的过渡
  元素.style.transition = `${属性} ${持续时间}ms ${时间函数}`;
  
  // 设置新的高度
  元素.style[属性] = 高度值;
  
  return new Promise(resolve => {
    // 监听过渡结束
    const 过渡结束 = () => {
      元素.removeEventListener('transitionend', 过渡结束);
      // 还原原来的过渡
      元素.style.transition = 原过渡;
      resolve();
    };
    
    元素.addEventListener('transitionend', 过渡结束, { once: true });
    
    // 超时处理，防止过渡未触发时无法解析Promise
    setTimeout(() => {
      元素.removeEventListener('transitionend', 过渡结束);
      // 还原原来的过渡
      元素.style.transition = 原过渡;
      resolve();
    }, 持续时间 + 50);
  });
}

/**
 * 切换元素可见性
 * @param {HTMLElement} 元素 - 要操作的DOM元素
 * @param {boolean|undefined} 是否可见 - true表示显示，false表示隐藏，undefined表示切换
 * @param {Object} [选项] - 其他选项
 * @param {string} [选项.显示值='block'] - 显示时的display值
 * @param {boolean} [选项.使用动画=false] - 是否使用淡入淡出动画
 * @param {number} [选项.动画时长=300] - 动画持续时间(毫秒)
 * @returns {boolean} 操作后的可见状态
 */
export function 切换元素可见性(元素, 是否可见, 选项 = {}) {
  if (!元素 || !(元素 instanceof HTMLElement)) return false;
  
  const { 
    显示值 = 'block', 
    使用动画 = false,
    动画时长 = 300
  } = 选项;
  
  // 获取当前显示状态
  const 当前已显示 = 元素.style.display !== 'none' && getComputedStyle(元素).display !== 'none';
  
  // 确定目标显示状态
  const 目标显示 = 是否可见 !== undefined ? 是否可见 : !当前已显示;
  
  if (使用动画) {
    if (目标显示) {
      // 先设置透明度为0，但显示元素
      元素.style.opacity = '0';
      元素.style.display = 显示值;
      
      // 强制重排，确保过渡生效
      元素.offsetHeight;
      
      // 设置过渡
      元素.style.transition = `opacity ${动画时长}ms ease`;
      元素.style.opacity = '1';
    } else {
      // 设置过渡
      元素.style.transition = `opacity ${动画时长}ms ease`;
      元素.style.opacity = '0';
      
      // 等待过渡完成后隐藏元素
      setTimeout(() => {
        元素.style.display = 'none';
      }, 动画时长);
    }
  } else {
    // 不使用动画，直接设置display
    元素.style.display = 目标显示 ? 显示值 : 'none';
  }
  
  return 目标显示;
}

// 为保持兼容性提供英文命名的别名
export const updateElementHeight = 更新元素高度;
export const smoothSetHeight = 平滑设置高度;
export const toggleElementVisibility = 切换元素可见性; 