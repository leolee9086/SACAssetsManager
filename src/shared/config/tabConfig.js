/**
 * 标签页配置
 * 定义系统中使用的标签页配置，包括组件路径和容器ID
 */

/**
 * 构建动态标签页配置
 * 通过扫描面板目录自动构建标签页配置
 * @returns {Object} 动态构建的标签页配置对象
 */
export function 构建动态标签页配置() {
  const 动态标签页配置 = {};
  
  try {
    // 注意：此函数在客户端环境执行时需要实际实现获取文件夹列表的逻辑
    // 这里提供一个抽象接口，具体实现应根据环境决定
    const 基础路径 = `/data/plugins/SACAssetsManager/source/UI/pannels`;
    const 文件列表 = typeof window !== 'undefined' && window.同步获取文件夹列表 
      ? window.同步获取文件夹列表(基础路径) 
      : [];

    文件列表.forEach(文件信息 => {
      if (文件信息.isDir) {
        const 文件夹名 = 文件信息.name;
        const tabName = `${文件夹名}Tab`;

        动态标签页配置[tabName] = {
          // 使用前端访问路径
          component: `/plugins/SACAssetsManager/source/UI/pannels/${文件夹名}/index.vue`,
          containerId: `${文件夹名}`
        };
      }
    });

  } catch (错误) {
    console.error('构建动态标签页配置时出错:', 错误);
  }

  return 动态标签页配置;
}

/**
 * 标签页基础配置
 * 包含系统默认定义的标签页配置
 * @type {Object}
 */
export const 标签页基础配置 = Object.freeze({
  /** 资源面板标签页 */
  AssetsTab: {
    component: '/plugins/SACAssetsManager/source/UI/components/assetGalleryPanel.vue',
    containerId: 'assetsColumn'
  },
  /** 编辑器标签页 */
  EditorTab: {
    component: '/plugins/SACAssetsManager/source/UI/components/editors/image.vue',
    containerId: 'assetsColumn'
  }
});

/**
 * 标签页配置
 * 合并基础配置和动态配置
 * @type {Object}
 */
export const 标签页配置 = Object.freeze({
  ...标签页基础配置,
  ...(typeof window !== 'undefined' ? 构建动态标签页配置() : {})
});

/**
 * 获取标签页配置
 * 运行时安全地获取标签页配置
 * @returns {Object} 当前环境下的标签页配置
 */
export function 获取标签页配置() {
  if (typeof window === 'undefined') {
    return 标签页基础配置;
  }
  
  return {
    ...标签页基础配置,
    ...构建动态标签页配置()
  };
}

// 为保持向后兼容，导出旧的常量名
export const TAB_CONFIGS = 标签页配置; 