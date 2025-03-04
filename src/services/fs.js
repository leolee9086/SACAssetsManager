/**
 * 文件系统服务
 * 封装思源笔记的文件API操作，提供统一接口
 */
class FileSystemService {
  /**
   * 初始化文件系统服务
   */
  constructor() {
    this.API_URL = {
      READ_FILE: '/api/file/getFile',
      READ_DIR: '/api/file/readDir',
      WRITE_FILE: '/api/file/putFile',
      MAKE_DIR: '/api/file/createDir',
      REMOVE: '/api/file/removeFile'
    };
  }

  /**
   * 读取文件内容
   * @param {string} 路径 - 文件路径
   * @returns {Promise<string>} 文件内容
   */
  async 读取文件(路径) {
    try {
      const response = await fetch(this.API_URL.READ_FILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 路径 })
      });
      
      const result = await response.json();
      if (result.code !== 0) {
        console.warn(`读取文件API返回错误: ${路径}, 代码: ${result.code}`);
        return null;
      }
      
      return result.data;
    } catch (错误) {
      console.error(`读取文件失败: ${路径}`, 错误);
      throw new Error(`读取文件失败: ${错误.message}`);
    }
  }
  
  /**
   * 读取目录内容
   * @param {string} 路径 - 目录路径
   * @returns {Promise<string[]>} 文件和文件夹名称列表
   */
  async 读取目录(路径) {
    try {
      const response = await fetch(this.API_URL.READ_DIR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 路径 })
      });
      
      const result = await response.json();
      if (result.code !== 0) {
        console.warn(`读取目录API返回错误: ${路径}, 代码: ${result.code}`);
        return [];
      }
      
      return result.data.map(项 => 项.name);
    } catch (错误) {
      console.error(`读取目录失败: ${路径}`, 错误);
      throw new Error(`读取目录失败: ${错误.message}`);
    }
  }
  
  /**
   * 写入文件内容
   * @param {string} 路径 - 文件路径
   * @param {string} 内容 - 文件内容
   * @returns {Promise<boolean>} 是否成功
   */
  async 写入文件(路径, 内容) {
    try {
      const response = await fetch(this.API_URL.WRITE_FILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 路径, file: 内容 })
      });
      
      const result = await response.json();
      return result.code === 0;
    } catch (错误) {
      console.error(`写入文件失败: ${路径}`, 错误);
      throw new Error(`写入文件失败: ${错误.message}`);
    }
  }
  
  /**
   * 创建目录
   * @param {string} 路径 - 目录路径
   * @returns {Promise<boolean>} 是否成功
   */
  async 创建目录(路径) {
    try {
      const response = await fetch(this.API_URL.MAKE_DIR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 路径 })
      });
      
      const result = await response.json();
      return result.code === 0;
    } catch (错误) {
      console.error(`创建目录失败: ${路径}`, 错误);
      throw new Error(`创建目录失败: ${错误.message}`);
    }
  }
  
  /**
   * 删除文件或目录
   * @param {string} 路径 - 文件或目录路径
   * @returns {Promise<boolean>} 是否成功
   */
  async 删除(路径) {
    try {
      const response = await fetch(this.API_URL.REMOVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 路径 })
      });
      
      const result = await response.json();
      return result.code === 0;
    } catch (错误) {
      console.error(`删除失败: ${路径}`, 错误);
      throw new Error(`删除失败: ${错误.message}`);
    }
  }
  
  /**
   * 判断路径是否存在
   * @param {string} 路径 - 文件或目录路径
   * @returns {Promise<boolean>} 是否存在
   */
  async 存在(路径) {
    try {
      // 尝试作为文件读取
      const response = await fetch(this.API_URL.READ_FILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 路径 })
      });
      
      const result = await response.json();
      if (result.code === 0) return true;
      
      // 尝试作为目录读取
      const dirResponse = await fetch(this.API_URL.READ_DIR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 路径 })
      });
      
      const dirResult = await dirResponse.json();
      return dirResult.code === 0;
    } catch (错误) {
      return false;
    }
  }
  
  /**
   * 确保目录存在，如不存在则创建
   * @param {string} 路径 - 目录路径
   * @returns {Promise<boolean>} 是否成功
   */
  async 确保目录存在(路径) {
    try {
      const 存在 = await this.存在(路径);
      if (存在) return true;
      
      return await this.创建目录(路径);
    } catch (错误) {
      console.error(`确保目录存在失败: ${路径}`, 错误);
      throw new Error(`确保目录存在失败: ${错误.message}`);
    }
  }
}

// 导出文件系统服务
export default FileSystemService; 