/**
 * 端点URL生成工具
 * 用于构建服务器API路径
 */

/**
 * 创建服务器主机地址
 * @param {Object} 配置 - 配置选项
 * @param {number} 配置.端口号 - 服务器端口号
 * @param {string} [配置.协议] - 协议类型，默认使用当前页面协议
 * @param {string} [配置.主机名] - 主机名，默认使用当前页面主机名
 * @returns {Function} 返回主机地址生成函数
 */
export const 创建服务器主机地址生成器 = ({ 端口号, 协议, 主机名 }) => {
  if (!端口号 && 端口号 !== 0) {
    throw new Error('创建服务器主机地址生成器需要提供端口号');
  }

  const 当前协议 = 协议 || (typeof window !== 'undefined' ? window.location.protocol : 'http:');
  const 当前主机名 = 主机名 || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');

  return () => `${当前协议}//${当前主机名}:${端口号}`;
};

/**
 * 创建缩略图主机地址生成器
 * @param {Function} 主机地址生成器 - 服务器主机地址生成函数
 * @param {Function} 原始图片主机地址生成器 - 原始图片服务器地址生成函数
 * @param {Array<string>} [图片扩展名列表=[]] - 图片文件扩展名列表
 * @returns {Function} 缩略图地址生成函数
 */
export const 创建缩略图主机地址生成器 = (主机地址生成器, 原始图片主机地址生成器, 图片扩展名列表 = []) => {
  if (!主机地址生成器 || !原始图片主机地址生成器) {
    throw new Error('创建缩略图主机地址生成器需要提供主机地址生成器和原始图片主机地址生成器');
  }

  return (类型, 路径, 尺寸, 数据) => {
    // 笔记类型特殊处理
    if (类型 === 'note' && 数据 && 数据.$meta) {
      return 数据.$meta.icon || ''; // 返回文档图标
    }

    // 构建URL
    const 是否本地路径 = !!类型;
    const 查询参数 = 是否本地路径 ? `localPath=${encodeURIComponent(路径)}` : `path=${encodeURIComponent(路径)}`;
    
    // 缩略图URL
    const 缩略图URL = `${原始图片主机地址生成器()}/thumbnail/?${查询参数}&size=${尺寸}`;
    
    // 原始图片URL
    const 原始图片URL = `${原始图片主机地址生成器()}/raw/?${查询参数}`;
    
    // 判断是否使用原始图片
    const 文件扩展名 = 路径.split('.').pop().toLowerCase();
    const 是大图 = 尺寸 > 200;
    const 是支持的图片格式 = 图片扩展名列表.includes(文件扩展名);
    
    return (是大图 && 是支持的图片格式) ? 原始图片URL : 缩略图URL;
  };
};

/**
 * 创建上传路径生成器
 * @param {Function} 主机地址生成器 - 服务器主机地址生成函数
 * @returns {Function} 上传路径生成函数
 */
export const 创建上传路径生成器 = (主机地址生成器) => {
  if (!主机地址生成器) {
    throw new Error('创建上传路径生成器需要提供主机地址生成器');
  }

  return (类型, 路径) => {
    const 基础URL = `${主机地址生成器()}/thumbnail/upload`;
    const 参数 = new URLSearchParams();

    if (!类型) {
      参数.append('path', 路径);
    } else {
      参数.append('localPath', 路径);
    }

    return `${基础URL}?${参数.toString()}`;
  };
};

/**
 * 创建文件系统端点生成器
 * @param {Function} 主机地址生成器 - 服务器主机地址生成函数
 * @returns {Object} 文件系统端点生成器
 */
export const 创建文件系统端点生成器 = (主机地址生成器) => {
  if (!主机地址生成器) {
    throw new Error('创建文件系统端点生成器需要提供主机地址生成器');
  }

  return {
    路径: {
      获取路径扩展名: (本地路径) => 
        `${主机地址生成器()}/fs/path/extentions/?dirPath=${encodeURIComponent(本地路径)}`,
      
      获取文件夹缩略图: (本地路径) => 
        `${主机地址生成器()}/fs/path/folderThumbnail?dirPath=${encodeURIComponent(本地路径)}`,
      
      // 添加英文别名以保持向后兼容
      getPathExtensions: (本地路径) => 
        `${主机地址生成器()}/fs/path/extentions/?dirPath=${encodeURIComponent(本地路径)}`,
      
      getFolderThumbnail: (本地路径) => 
        `${主机地址生成器()}/fs/path/folderThumbnail?dirPath=${encodeURIComponent(本地路径)}`
    },
    磁盘: {
      列出本地磁盘: () => 
        `${主机地址生成器()}/listDisk`,
      
      // 添加英文别名
      listLocalDisks: () => 
        `${主机地址生成器()}/listDisk`
    },
    path: {
      // 添加英文命名空间兼容旧代码
      getPathExtensions: (本地路径) => 
        `${主机地址生成器()}/fs/path/extentions/?dirPath=${encodeURIComponent(本地路径)}`,
      
      getFolderThumbnail: (本地路径) => 
        `${主机地址生成器()}/fs/path/folderThumbnail?dirPath=${encodeURIComponent(本地路径)}`
    },
    disk: {
      // 添加英文命名空间兼容旧代码
      listLocalDisks: () => 
        `${主机地址生成器()}/listDisk`
    }
  };
};

/**
 * 创建元数据端点生成器
 * @param {Function} 主机地址生成器 - 服务器主机地址生成函数
 * @returns {Object} 元数据端点生成器
 */
export const 创建元数据端点生成器 = (主机地址生成器) => {
  if (!主机地址生成器) {
    throw new Error('创建元数据端点生成器需要提供主机地址生成器');
  }

  return {
    exif: (本地路径) => {
      const 基础URL = `${主机地址生成器()}/metadata/exif`;
      const 参数 = new URLSearchParams();
      参数.append('localPath', 本地路径);
      return `${基础URL}?${参数.toString()}`;
    }
  };
};

/**
 * 创建缩略图端点生成器
 * @param {Function} 主机地址生成器 - 服务器主机地址生成函数
 * @param {Function} 缩略图地址生成器 - 缩略图地址生成函数
 * @param {Function} 上传路径生成器 - 上传路径生成函数
 * @returns {Object} 缩略图端点生成器
 */
export const 创建缩略图端点生成器 = (主机地址生成器, 缩略图地址生成器, 上传路径生成器) => {
  if (!主机地址生成器 || !缩略图地址生成器 || !上传路径生成器) {
    throw new Error('创建缩略图端点生成器需要提供主机地址生成器、缩略图地址生成器和上传路径生成器');
  }

  return {
    genHref: 缩略图地址生成器,
    
    获取颜色: (类型, 路径, 重新生成 = false) => {
      const 基础URL = `${主机地址生成器()}/color/`;
      const 参数 = new URLSearchParams();

      if (!类型) {
        参数.append('path', 路径);
      } else {
        参数.append('localPath', 路径);
      }

      if (重新生成) {
        参数.append('reGen', 'true');
      }

      return `${基础URL}?${参数.toString()}`;
    },
    
    获取尺寸: (类型, 路径) => {
      const 基础URL = `${主机地址生成器()}/thumbnail/dimensions`;
      const 参数 = new URLSearchParams();

      if (!类型) {
        参数.append('path', 路径);
      } else {
        参数.append('localPath', 路径);
      }

      return `${基础URL}?${参数.toString()}`;
    },
    
    上传: 上传路径生成器,
    
    // 添加英文别名
    getColor: (类型, 路径, 重新生成 = false) => {
      const 基础URL = `${主机地址生成器()}/color/`;
      const 参数 = new URLSearchParams();

      if (!类型) {
        参数.append('path', 路径);
      } else {
        参数.append('localPath', 路径);
      }

      if (重新生成) {
        参数.append('reGen', 'true');
      }

      return `${基础URL}?${参数.toString()}`;
    },
    
    getDimensions: (类型, 路径) => {
      const 基础URL = `${主机地址生成器()}/thumbnail/dimensions`;
      const 参数 = new URLSearchParams();

      if (!类型) {
        参数.append('path', 路径);
      } else {
        参数.append('localPath', 路径);
      }

      return `${基础URL}?${参数.toString()}`;
    },
    
    upload: 上传路径生成器
  };
};

/**
 * 创建元数据记录端点生成器
 * @param {Function} 主机地址生成器 - 服务器主机地址生成函数
 * @returns {Object} 元数据记录端点生成器
 */
export const 创建元数据记录端点生成器 = (主机地址生成器) => {
  if (!主机地址生成器) {
    throw new Error('创建元数据记录端点生成器需要提供主机地址生成器');
  }

  return {
    删除记录: async (路径) => {
      const 基础URL = `${主机地址生成器()}/metaRecords/delete/`;
      const 参数 = new URLSearchParams();
      参数.append('localPath', 路径);
      return await fetch(`${基础URL}?${参数.toString()}`);
    },
    
    // 添加英文别名
    deleteRecord: async (路径) => {
      const 基础URL = `${主机地址生成器()}/metaRecords/delete/`;
      const 参数 = new URLSearchParams();
      参数.append('localPath', 路径);
      return await fetch(`${基础URL}?${参数.toString()}`);
    }
  };
};

/**
 * 创建完整端点系统
 * @param {Object} 配置 - 配置选项
 * @param {number} 配置.http端口号 - HTTP服务器端口号
 * @param {number} 配置.图片端口号 - 图片服务器端口号，默认为HTTP端口号+1
 * @param {Array<string>} [配置.图片扩展名列表=[]] - 支持的图片文件扩展名列表
 * @returns {Object} 端点生成系统
 */
export const 创建端点系统 = ({ http端口号, 图片端口号, 图片扩展名列表 = [] }) => {
  // 创建主机地址生成器
  const 服务器主机地址生成器 = 创建服务器主机地址生成器({ 端口号: http端口号 });
  const 原始图片主机地址生成器 = 创建服务器主机地址生成器({ 端口号: 图片端口号 || (http端口号 + 1) });

  // 创建缩略图和上传路径生成器
  const 缩略图地址生成器 = 创建缩略图主机地址生成器(服务器主机地址生成器, 原始图片主机地址生成器, 图片扩展名列表);
  const 上传路径生成器 = 创建上传路径生成器(服务器主机地址生成器);

  // 创建各类端点生成器
  const 文件系统端点 = 创建文件系统端点生成器(服务器主机地址生成器);
  const 元数据端点 = 创建元数据端点生成器(服务器主机地址生成器);
  const 缩略图端点 = 创建缩略图端点生成器(服务器主机地址生成器, 缩略图地址生成器, 上传路径生成器);
  const 元数据记录端点 = 创建元数据记录端点生成器(服务器主机地址生成器);

  return {
    服务器主机: 服务器主机地址生成器,
    原始图片服务器主机: 原始图片主机地址生成器,
    fs: 文件系统端点,
    metadata: 元数据端点,
    thumbnail: 缩略图端点,
    metaRecords: 元数据记录端点,
    
    // 工具函数
    上传缩略图: (资源, 文件) => {
      const formData = new FormData();
      formData.append('image', 文件);
      formData.append('assetPath', 资源.path);
      const url = 上传路径生成器(资源.type, 资源.path);
      
      return fetch(url, {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .catch(error => {
        console.error('缩略图上传失败:', error);
        throw error;
      });
    }
  };
};

// 兼容性导出
export const createServerHostGenerator = 创建服务器主机地址生成器;
export const createThumbnailHostGenerator = 创建缩略图主机地址生成器;
export const createUploadPathGenerator = 创建上传路径生成器;
export const createFileSystemEndpointGenerator = 创建文件系统端点生成器;
export const createMetadataEndpointGenerator = 创建元数据端点生成器;
export const createThumbnailEndpointGenerator = 创建缩略图端点生成器;
export const createMetaRecordsEndpointGenerator = 创建元数据记录端点生成器;
export const createEndpointSystem = 创建端点系统; 