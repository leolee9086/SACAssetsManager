import { confirmAsPromise } from "../siyuanClient/index.js";
import { uploadAsset } from "../siyuanKernel/asset.js";

// 显示上传确认对话框
const showUploadConfirmDialog = async (file) => {
  return await confirmAsPromise(
    "上传图片到思源资源库",
    `该操作将把图片永久保存到思源笔记的资源库中：

文件名称：${file.name}
文件大小：${(file.size / 1024).toFixed(2)} KB
文件类型：${file.type}

上传后可在其他文档中重复使用该图片。是否继续？`
  );
};

// 将非File对象转换为File对象
const convertToFile = async (file) => {
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

// 执行上传操作并处理结果
const performUpload = async (file) => {
  const result = await uploadAsset(file);
  if (result.code !== 0) {
    throw new Error(result.msg);
  }
  return Object.values(result.data.succMap)[0];
};

// 主函数
export const uploadToSiyuanAssets = async (file) => {
  try {
    const confirmed = await showUploadConfirmDialog(file);
    if (!confirmed) {
      throw new Error('用户取消上传');
    }

    const uploadFile = await convertToFile(file);
    return await performUpload(uploadFile);
  } catch (error) {
    throw new Error('上传图片到思源失败: ' + error.message);
  }
};
  