/**
 * @file 思源笔记对话框API封装
 * @module toolBox/useAge/forSiyuan/useSiyuanDialog
 * @requires 思源环境
 */

import { 检查思源环境 } from '../useSiyuan.js';
import { confirmAsPromise, 创建输入对话框 as 基础创建输入对话框 } from '../../base/useEnv/siyuanDialog.js';
import { clientApi } from '../../../../source/asyncModules.js';

// 检查环境
if (!检查思源环境()) {
  console.warn('当前不在思源环境中，部分功能可能不可用');
}

// 重新导出基础函数
export { confirmAsPromise };

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
  if (!clientApi || !clientApi.Dialog) {
    console.warn('思源API不可用，无法创建对话框');
    return null;
  }
  
  const dialog = new clientApi.Dialog({
    title: 标题,
    content: 内容,
    width: 宽度,
    height: 高度,
  });
  
  const btnsElement = document.createElement('div');
  btnsElement.className = 'b3-dialog__action';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'b3-button b3-button--cancel';
  cancelBtn.textContent = clientApi.languages?.cancel || '取消';
  cancelBtn.addEventListener('click', () => {
    if (取消回调) 取消回调();
    dialog.destroy();
  });
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'b3-button';
  confirmBtn.textContent = clientApi.languages?.confirm || '确认';
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

// 使用基础模块的函数
export const 创建输入对话框 = (options) => 基础创建输入对话框(options);

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
    title,
    text: hint,
    value: defaultValue,
    width
  });
}; 