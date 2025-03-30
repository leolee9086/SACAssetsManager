/**
 * 思源笔记对话框基础工具
 * 提供对话框相关的基础功能，避免循环依赖
 * @module siyuanDialog
 */

import { 检查思源环境 } from './siyuanEnv.js';
import { clientApi } from '../../../../source/asyncModules.js';

/**
 * 创建确认对话框并返回Promise
 * @param {string} title 对话框标题
 * @param {string} text 对话框内容
 * @param {Object} options 附加选项
 * @returns {Promise<boolean>} 用户确认返回true，取消返回false
 */
export const confirmAsPromise = (title, text, options = {}) => {
  return new Promise((resolve) => {
    if (!检查思源环境()) {
      console.warn('当前不在思源环境中，对话框功能可能无法正常工作');
      resolve(false);
      return;
    }
    
    const dialog = new clientApi.Dialog({
      title,
      content: `<div class="b3-dialog__content">${text}</div>
                <div class="b3-dialog__action">
                  <button class="b3-button b3-button--cancel">${options.cancelText || '取消'}</button>
                  <div class="fn__space"></div>
                  <button class="b3-button b3-button--text">${options.confirmText || '确定'}</button>
                </div>`,
      width: options.width || '520px',
    });
    
    const btnsElement = dialog.element.querySelectorAll('.b3-button');
    btnsElement[0].addEventListener('click', () => {
      dialog.destroy();
      resolve(false);
    });
    btnsElement[1].addEventListener('click', () => {
      dialog.destroy();
      resolve(true);
    });
  });
};

/**
 * 创建输入对话框并返回Promise
 * @param {Object} options 选项配置
 * @param {string} options.title 对话框标题
 * @param {string} options.text 对话框说明文字
 * @param {string} options.value 输入框默认值
 * @param {Function} options.validator 输入验证函数，返回true表示验证通过
 * @returns {Promise<string|null>} 用户输入的值，取消则返回null
 */
export const 创建输入对话框 = (options = {}) => {
  return new Promise((resolve) => {
    if (!检查思源环境()) {
      console.warn('当前不在思源环境中，对话框功能可能无法正常工作');
      resolve(null);
      return;
    }
    
    const title = options.title || '请输入';
    const text = options.text || '';
    const value = options.value || '';
    const validator = options.validator || (() => true);
    
    const dialog = new clientApi.Dialog({
      title,
      content: `<div class="b3-dialog__content">
                  <div>${text}</div>
                  <input class="b3-text-field fn__block" value="${value}">
                </div>
                <div class="b3-dialog__action">
                  <button class="b3-button b3-button--cancel">取消</button>
                  <div class="fn__space"></div>
                  <button class="b3-button b3-button--text">确定</button>
                </div>`,
      width: options.width || '520px',
    });
    
    const inputElement = dialog.element.querySelector('input');
    const btnsElement = dialog.element.querySelectorAll('.b3-button');
    
    inputElement.focus();
    inputElement.select();
    
    const doConfirm = () => {
      const inputValue = inputElement.value;
      if (validator(inputValue)) {
        dialog.destroy();
        resolve(inputValue);
      } else {
        inputElement.classList.add('b3-text-field--error');
        setTimeout(() => {
          inputElement.classList.remove('b3-text-field--error');
        }, 1000);
      }
    };
    
    inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        doConfirm();
      } else if (event.key === 'Escape') {
        dialog.destroy();
        resolve(null);
      }
    });
    
    btnsElement[0].addEventListener('click', () => {
      dialog.destroy();
      resolve(null);
    });
    
    btnsElement[1].addEventListener('click', doConfirm);
  });
}; 