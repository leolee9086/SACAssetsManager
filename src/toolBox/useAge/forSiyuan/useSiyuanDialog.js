/**
 * @fileoverview 思源对话框相关工具
 * @module toolBox/useAge/forSiyuan/useSiyuanDialog
 * @requires 思源环境
 */

import { 检查思源环境 } from '../../useSiyuan.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

/**
 * 创建确认对话框并返回Promise
 * @param {string} 标题 - 对话框标题
 * @param {string} 主体内容 - 对话框内容
 * @returns {Promise<boolean>} 用户确认返回true，取消返回false
 */
export const confirmAsPromise = (标题, 主体内容) => {
  return new Promise((resolve) => {
    if (window.siyuan && window.siyuan.API) {
      window.siyuan.API.confirm(
        标题,
        主体内容,
        () => {
          resolve(true);
        },
        () => {
          resolve(false);
        }
      );
    } else {
      console.warn('思源API不可用，无法创建确认对话框');
      resolve(false);
    }
  });
};

/**
 * 以英文命名的版本
 * @param {string} title - 对话框标题
 * @param {string} content - 对话框内容
 * @returns {Promise<boolean>} 用户确认返回true，取消返回false
 */
export const confirmPromise = confirmAsPromise;

/**
 * 创建简单对话框
 * @param {Object} 选项
 * @param {string} 选项.标题 - 对话框标题
 * @param {string} 选项.内容 - 对话框HTML内容
 * @param {string} [选项.宽度='520px'] - 对话框宽度
 * @param {string} [选项.高度='auto'] - 对话框高度
 * @param {Function} [选项.确认回调] - 确认按钮回调函数
 * @param {Function} [选项.取消回调] - 取消按钮回调函数
 * @returns {Object} 对话框实例
 */
export const 创建简单对话框 = ({ 标题, 内容, 宽度 = '520px', 高度 = 'auto', 确认回调, 取消回调 }) => {
  if (!window.siyuan || !window.siyuan.API) {
    console.warn('思源API不可用，无法创建对话框');
    return null;
  }
  
  const dialog = new window.siyuan.API.Dialog({
    title: 标题,
    content: 内容,
    width: 宽度,
    height: 高度,
  });
  
  const btnsElement = document.createElement('div');
  btnsElement.className = 'b3-dialog__action';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'b3-button b3-button--cancel';
  cancelBtn.textContent = window.siyuan.languages.cancel || '取消';
  cancelBtn.addEventListener('click', () => {
    if (取消回调) 取消回调();
    dialog.destroy();
  });
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'b3-button';
  confirmBtn.textContent = window.siyuan.languages.confirm || '确认';
  confirmBtn.addEventListener('click', () => {
    if (确认回调) 确认回调();
    dialog.destroy();
  });
  
  btnsElement.appendChild(cancelBtn);
  btnsElement.appendChild(confirmBtn);
  dialog.element.querySelector('.b3-dialog__container').appendChild(btnsElement);
  
  return dialog;
};

/**
 * 以英文命名的版本
 * @param {Object} options
 * @param {string} options.title - 对话框标题
 * @param {string} options.content - 对话框HTML内容
 * @param {string} [options.width='520px'] - 对话框宽度
 * @param {string} [options.height='auto'] - 对话框高度
 * @param {Function} [options.confirmCallback] - 确认按钮回调函数
 * @param {Function} [options.cancelCallback] - 取消按钮回调函数
 * @returns {Object} 对话框实例
 */
export const createSimpleDialog = ({ title, content, width = '520px', height = 'auto', confirmCallback, cancelCallback }) => {
  return 创建简单对话框({
    标题: title,
    内容: content,
    宽度: width,
    高度: height,
    确认回调: confirmCallback,
    取消回调: cancelCallback
  });
};

/**
 * 创建输入对话框
 * @param {Object} 选项
 * @param {string} 选项.标题 - 对话框标题
 * @param {string} [选项.提示文本=''] - 输入框提示文本
 * @param {string} [选项.默认值=''] - 输入框默认值
 * @param {string} [选项.宽度='520px'] - 对话框宽度
 * @returns {Promise<string|null>} 用户输入的值，取消则返回null
 */
export const 创建输入对话框 = ({ 标题, 提示文本 = '', 默认值 = '', 宽度 = '520px' }) => {
  return new Promise((resolve) => {
    const 内容 = `<div class="b3-dialog__content">
      <label class="fn__flex b3-label">
        <div class="fn__flex-1">
          ${提示文本}
          <div class="b3-label__text">
            <input class="b3-text-field fn__block" value="${默认值}">
          </div>
        </div>
      </label>
    </div>`;
    
    const dialog = 创建简单对话框({
      标题,
      内容,
      宽度,
      确认回调: () => {
        const 输入值 = dialog.element.querySelector('input').value;
        resolve(输入值);
      },
      取消回调: () => {
        resolve(null);
      }
    });
    
    const 输入框 = dialog.element.querySelector('input');
    输入框.select();
    setTimeout(() => {
      输入框.focus();
    }, 100);
  });
};

/**
 * 以英文命名的版本
 * @param {Object} options
 * @param {string} options.title - 对话框标题
 * @param {string} [options.hint=''] - 输入框提示文本
 * @param {string} [options.defaultValue=''] - 输入框默认值
 * @param {string} [options.width='520px'] - 对话框宽度
 * @returns {Promise<string|null>} 用户输入的值，取消则返回null
 */
export const createPromptDialog = ({ title, hint = '', defaultValue = '', width = '520px' }) => {
  return 创建输入对话框({
    标题: title,
    提示文本: hint,
    默认值: defaultValue,
    宽度: width
  });
}; 