/**
 * @fileoverview 思源笔记上传工具函数
 * @module toolBox/useAge/forSiyuan/forAsset/useSiyuanUpload
 * @description 提供文件上传到思源笔记资源库的功能
 */

import { confirmAsPromise } from "../../../../../source/fromThirdParty/siyuanClient/index.js";
import { uploadAsset } from "../../../../../source/fromThirdParty/siyuanKernel/asset.js";

/**
 * 显示上传确认对话框
 * @private
 * @param {File} file - 要上传的文件对象
 * @returns {Promise<boolean>} 用户是否确认上传
 */
const 显示上传确认对话框 = async (file) => {
  return await confirmAsPromise(
    "上传图片到思源资源库",
    `该操作将把图片永久保存到思源笔记的资源库中：

文件名称：${file.name}
文件大小：${(file.size / 1024).toFixed(2)} KB
文件类型：${file.type}

上传后可在其他文档中重复使用该图片。是否继续？`
  );
};

/**
 * 将非File对象转换为File对象
 * @private
 * @param {File|string|Blob} file - 文件对象或URL
 * @returns {Promise<File>} 转换后的File对象
 */
const 转换为文件对象 = async (file) => {
  if (file instanceof File) {
    return file;
  }
  const blob = await fetch(file).then(r => r.blob());
  return new File(
    [blob],
    `image${Date.now()}.png`,
    { type: 'image/png' }
  );
};

/**
 * 执行上传操作并处理结果
 * @private
 * @param {File} file - 要上传的文件对象
 * @returns {Promise<string>} 上传成功后的文件路径
 * @throws {Error} 上传失败时抛出错误
 */
const 执行上传 = async (file) => {
  const result = await uploadAsset(file);
  if (result.code !== 0) {
    throw new Error(result.msg);
  }
  return Object.values(result.data.succMap)[0];
};

/**
 * 上传文件到思源笔记资源库
 * @param {File|string|Blob} file - 要上传的文件对象或URL
 * @param {Object} [options] - 上传选项
 * @param {boolean} [options.skipConfirm=false] - 是否跳过确认对话框
 * @returns {Promise<string>} 上传成功后的文件路径
 * @throws {Error} 上传失败或用户取消时抛出错误
 */
export const 上传到思源资源库 = async (file, options = {}) => {
  try {
    const uploadFile = await 转换为文件对象(file);
    
    // 如果没有指定跳过确认，则显示确认对话框
    if (!options.skipConfirm) {
      const confirmed = await 显示上传确认对话框(uploadFile);
      if (!confirmed) {
        throw new Error('用户取消上传');
      }
    }

    return await 执行上传(uploadFile);
  } catch (error) {
    throw new Error('上传到思源资源库失败: ' + error.message);
  }
};

/**
 * 创建文件上传处理器
 * @returns {Object} 文件上传处理器对象
 */
export const 创建上传处理器 = () => {
  return {
    /**
     * 上传文件到思源笔记资源库
     * @param {File|string|Blob} file - 要上传的文件对象或URL
     * @param {Object} [options] - 上传选项
     * @returns {Promise<string>} 上传成功后的文件路径
     */
    上传文件: (file, options) => 上传到思源资源库(file, options),
    
    /**
     * 上传多个文件到思源笔记资源库
     * @param {Array<File|string|Blob>} files - 要上传的文件对象或URL数组
     * @param {Object} [options] - 上传选项
     * @returns {Promise<Array<string>>} 上传成功后的文件路径数组
     */
    批量上传: async (files, options = {}) => {
      const results = [];
      const errors = [];
      
      for (const file of files) {
        try {
          const path = await 上传到思源资源库(file, options);
          results.push(path);
        } catch (error) {
          errors.push({ file, error: error.message });
        }
      }
      
      if (errors.length > 0) {
        console.warn('部分文件上传失败:', errors);
      }
      
      return results;
    }
  };
};

// 兼容原有API导出
export const uploadToSiyuanAssets = 上传到思源资源库;
export const showUploadConfirmDialog = 显示上传确认对话框;
export const convertToFile = 转换为文件对象;
export const performUpload = 执行上传;

export default {
  上传到思源资源库,
  创建上传处理器,
  // 兼容原有API
  uploadToSiyuanAssets
}; 