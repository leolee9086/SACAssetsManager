/**
 * 资源分类枚举
 * 定义系统中使用的资源分类，用于资源管理和组织
 */

/**
 * 资源分类类型枚举
 * @type {Object}
 */
export const 资源分类类型 = Object.freeze({
  /** 系统分类 - 由系统定义，不可修改 */
  系统: 'system',
  /** 用户分类 - 由用户创建和管理 */
  用户: 'user',
  /** 智能分类 - 由系统根据规则自动归类 */
  智能: 'smart',
  /** 临时分类 - 临时使用，不保存 */
  临时: 'temporary'
});

/**
 * 系统预定义资源分类
 * @type {Array}
 */
export const 系统资源分类 = Object.freeze([
  {
    id: 'all',
    名称: '全部资源',
    图标: 'iconFiles',
    类型: 资源分类类型.系统,
    排序: 1,
    过滤器: () => true,
    描述: '显示所有资源文件'
  },
  {
    id: 'image',
    名称: '图片',
    图标: 'iconImage',
    类型: 资源分类类型.系统,
    排序: 2,
    过滤器: (资源) => 资源.类型 === 'image',
    描述: '图片文件'
  },
  {
    id: 'audio',
    名称: '音频',
    图标: 'iconRecord',
    类型: 资源分类类型.系统,
    排序: 3,
    过滤器: (资源) => 资源.类型 === 'audio',
    描述: '音频文件'
  },
  {
    id: 'video',
    名称: '视频',
    图标: 'iconVideo',
    类型: 资源分类类型.系统,
    排序: 4,
    过滤器: (资源) => 资源.类型 === 'video',
    描述: '视频文件'
  },
  {
    id: 'document',
    名称: '文档',
    图标: 'iconFile',
    类型: 资源分类类型.系统,
    排序: 5,
    过滤器: (资源) => 资源.类型 === 'document',
    描述: '文档文件'
  },
  {
    id: 'recent',
    名称: '最近使用',
    图标: 'iconRefresh',
    类型: 资源分类类型.智能,
    排序: 6,
    过滤器: (资源) => 资源.最后访问时间 && (new Date() - new Date(资源.最后访问时间)) < 7 * 24 * 60 * 60 * 1000,
    描述: '最近7天内使用过的资源'
  },
  {
    id: 'favorite',
    名称: '收藏',
    图标: 'iconBookmark',
    类型: 资源分类类型.系统,
    排序: 7,
    过滤器: (资源) => 资源.是否收藏 === true,
    描述: '已收藏的资源'
  },
  {
    id: 'trash',
    名称: '回收站',
    图标: 'iconTrashcan',
    类型: 资源分类类型.系统,
    排序: 100,
    过滤器: (资源) => 资源.是否已删除 === true,
    描述: '已删除的资源'
  }
]);

/**
 * 默认智能分类规则
 * @type {Array}
 */
export const 默认智能分类规则 = Object.freeze([
  {
    id: 'unused',
    名称: '未使用资源',
    图标: 'iconUnlink',
    类型: 资源分类类型.智能,
    排序: 10,
    规则: {
      引用数: 0,
      排除类型: ['trash']
    },
    描述: '未被任何文档引用的资源'
  },
  {
    id: 'large',
    名称: '大文件',
    图标: 'iconMax',
    类型: 资源分类类型.智能,
    排序: 11,
    规则: {
      最小大小: 5 * 1024 * 1024, // 5MB
      排除类型: ['trash']
    },
    描述: '大于5MB的资源文件'
  },
  {
    id: 'duplicate',
    名称: '重复文件',
    图标: 'iconCopy',
    类型: 资源分类类型.智能,
    排序: 12,
    规则: {
      重复检测: true,
      排除类型: ['trash']
    },
    描述: '内容重复的资源文件'
  }
]);

/**
 * 根据ID获取资源分类
 * @param {string} 分类ID - 资源分类ID
 * @returns {Object|null} 资源分类对象，未找到时返回null
 */
export function 获取资源分类(分类ID) {
  if (!分类ID) return null;
  
  // 在系统分类中查找
  const 系统分类 = 系统资源分类.find(分类 => 分类.id === 分类ID);
  if (系统分类) return 系统分类;
  
  // 在智能分类中查找
  const 智能分类 = 默认智能分类规则.find(分类 => 分类.id === 分类ID);
  if (智能分类) return 智能分类;
  
  // 未找到分类
  return null;
}

/**
 * 应用分类过滤器
 * @param {Array} 资源列表 - 需要过滤的资源列表
 * @param {string} 分类ID - 资源分类ID
 * @returns {Array} 过滤后的资源列表
 */
export function 应用分类过滤器(资源列表, 分类ID) {
  if (!资源列表 || !资源列表.length) return [];
  if (!分类ID) return 资源列表;
  
  const 分类 = 获取资源分类(分类ID);
  if (!分类 || !分类.过滤器) return 资源列表;
  
  return 资源列表.filter(分类.过滤器);
} 