/**
 * @fileoverview 文件系统相关的网络请求工具函数
 * 提供与思源笔记文件系统交互的工具函数
 */

/**
 * 同步获取文件夹列表
 * @param {string} 路径 - 要获取文件列表的路径
 * @returns {Array} 文件列表，如果获取失败返回空数组
 */
export function 同步获取文件夹列表(路径) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `/api/file/readDir`, false); // 使用 POST 方法
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ path: 路径 }));

  if (xhr.status === 200) {
    const response = JSON.parse(xhr.responseText);
    if (response.code === 0) {
      return response.data;
    }
  }
  return [];
}

/**
 * 异步获取文件夹列表
 * @param {string} 路径 - 要获取文件列表的路径
 * @returns {Promise<Array>} 文件列表，如果获取失败则Promise会被拒绝
 */
export async function 异步获取文件夹列表(路径) {
  const response = await fetch(`/api/file/readDir`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: 路径 })
  });
  
  const data = await response.json();
  if (data.code === 0) {
    return data.data;
  }
  
  throw new Error(`获取文件夹列表失败: ${data.msg || '未知错误'}`);
}

/**
 * 创建文件夹
 * @param {string} 路径 - 要创建的文件夹路径
 * @returns {Promise<boolean>} 是否创建成功
 */
export async function 创建文件夹(路径) {
  const response = await fetch(`/api/file/createDir`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: 路径 })
  });
  
  const data = await response.json();
  return data.code === 0;
}

/**
 * 读取文件内容
 * @param {string} 路径 - 文件路径
 * @returns {Promise<string>} 文件内容，如果读取失败则Promise会被拒绝
 */
export async function 读取文件内容(路径) {
  const response = await fetch(`/api/file/getFile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: 路径 })
  });
  
  const data = await response.json();
  if (data.code === 0) {
    return data.data;
  }
  
  throw new Error(`读取文件内容失败: ${data.msg || '未知错误'}`);
} 