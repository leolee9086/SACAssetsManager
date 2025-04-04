const fs = require('fs')
const path = require('path')

/**
 * 创建一个安全的回调函数包装器
 * @param {Function} 回调 - 原始回调函数
 * @returns {Function} 安全的回调函数
 */
function 安全回调包装器(回调) {
    return (...参数) => {
      try {
        回调(...参数);
      } catch (错误) {
        console.error('执行回调时发生错误:', 错误,回调);
      }
    };
  }
  
  /**
   * 递归遍历目录,删除指定文件名的文件
   * @param {string} 目录 - 要遍历的目录路径
   * @param {string} 文件名 - 要删除的文件名
   * @param {Object} [回调函数集] - 包含不同情况的回调函数
   * @param {function(Error): void} [回调函数集.错误回调] - 处理遍历过程中的错误
   * @param {function(string): void} [回调函数集.发现回调] - 当找到匹配文件名的文件时调用
   * @param {function(string): void} [回调函数集.删除成功回调] - 当成功删除文件时调用
   * @param {function(string, Error): void} [回调函数集.删除失败回调] - 当删除文件失败时调用
   */
  export function 递归直接删除指定文件名(目录, 文件名, 回调函数集 = {}) {
    const 安全回调函数集 = {
      错误回调: 安全回调包装器(回调函数集.错误回调 || console.error),
      发现回调: 安全回调包装器(回调函数集.发现回调 || console.log),
      删除成功回调: 安全回调包装器(回调函数集.删除成功回调 || console.log),
      删除失败回调: 安全回调包装器(回调函数集.删除失败回调 || console.error)
    };
  
    fs.readdir(目录, (读取错误, 文件列表) => {
      if (读取错误) {
        安全回调函数集.错误回调(new Error(`无法读取目录 ${目录}: ${读取错误.message}`));
        return;
      }
  
      文件列表.forEach((文件) => {
        const 完整路径 = path.join(目录, 文件);
  
        fs.stat(完整路径, (状态错误, 状态) => {
          if (状态错误) {
            安全回调函数集.错误回调(new Error(`无法获取文件状态 ${完整路径}: ${状态错误.message}`));
            return;
          }
  
          if (状态.isDirectory()) {
            递归直接删除指定文件名(完整路径, 文件名, 回调函数集);
          } else if (文件 === 文件名) {
            安全回调函数集.发现回调(完整路径);
            fs.unlink(完整路径, (删除错误) => {
              if (删除错误) {
                安全回调函数集.删除失败回调(完整路径, new Error(`删除文件失败 ${完整路径}: ${删除错误.message}`));
              } else {
                安全回调函数集.删除成功回调(完整路径);
              }
            });
          }
        });
      });
    });
  }