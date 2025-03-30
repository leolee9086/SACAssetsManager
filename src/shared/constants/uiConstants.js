/**
 * UI相关常量定义
 * 定义系统中使用的UI相关常量，便于统一管理和维护
 */

/**
 * 面板类型常量
 * @type {Object}
 */
export const 面板类型 = Object.freeze({
  /** 资源面板 */
  资源面板: 'AssetsTab',
  /** 编辑器面板 */
  编辑器面板: 'EditorTab',
  /** 信息面板 */
  信息面板: 'AssetsPanel',
  /** 收藏面板 */
  收藏面板: 'CollectionPanel',
  /** 面板列表 */
  面板列表: 'PannelListPanel'
});

/**
 * 面板位置常量
 * @type {Object}
 */
export const 面板位置 = Object.freeze({
  /** 左侧顶部 */
  左侧顶部: 'LeftTop',
  /** 左侧底部 */
  左侧底部: 'LeftBottom',
  /** 右侧顶部 */
  右侧顶部: 'RightTop',
  /** 右侧底部 */
  右侧底部: 'RightBottom',
  /** 底部 */
  底部: 'Bottom'
});

/**
 * 对话框类型常量
 * @type {Object}
 */
export const 对话框类型 = Object.freeze({
  /** 信息对话框 */
  信息: 'info',
  /** 警告对话框 */
  警告: 'warning',
  /** 错误对话框 */
  错误: 'error',
  /** 成功对话框 */
  成功: 'success',
  /** 确认对话框 */
  确认: 'confirm',
  /** 输入对话框 */
  输入: 'input',
  /** 自定义对话框 */
  自定义: 'custom'
});

/**
 * 按钮类型常量
 * @type {Object}
 */
export const 按钮类型 = Object.freeze({
  /** 主要按钮 */
  主要: 'primary',
  /** 次要按钮 */
  次要: 'secondary',
  /** 成功按钮 */
  成功: 'success',
  /** 警告按钮 */
  警告: 'warning',
  /** 危险按钮 */
  危险: 'danger',
  /** 信息按钮 */
  信息: 'info',
  /** 文本按钮 */
  文本: 'text',
  /** 链接按钮 */
  链接: 'link'
});

/**
 * 主题类型常量
 * @type {Object}
 */
export const 主题类型 = Object.freeze({
  /** 暗色主题 */
  暗色: 'dark',
  /** 亮色主题 */
  亮色: 'light'
});

/**
 * 视图模式常量
 * @type {Object}
 */
export const 视图模式 = Object.freeze({
  /** 网格视图 */
  网格: 'grid',
  /** 列表视图 */
  列表: 'list',
  /** 卡片视图 */
  卡片: 'card',
  /** 详情视图 */
  详情: 'detail',
  /** 缩略图视图 */
  缩略图: 'thumbnail'
});

/**
 * 排序方式常量
 * @type {Object}
 */
export const 排序方式 = Object.freeze({
  /** 按名称升序 */
  名称升序: 'name_asc',
  /** 按名称降序 */
  名称降序: 'name_desc',
  /** 按大小升序 */
  大小升序: 'size_asc',
  /** 按大小降序 */
  大小降序: 'size_desc',
  /** 按修改时间升序 */
  修改时间升序: 'mtime_asc',
  /** 按修改时间降序 */
  修改时间降序: 'mtime_desc',
  /** 按创建时间升序 */
  创建时间升序: 'ctime_asc',
  /** 按创建时间降序 */
  创建时间降序: 'ctime_desc',
  /** 按类型升序 */
  类型升序: 'type_asc',
  /** 按类型降序 */
  类型降序: 'type_desc'
});

/**
 * 导出所有UI常量
 */
export const UI常量 = Object.freeze({
  面板类型,
  面板位置,
  对话框类型,
  按钮类型,
  主题类型,
  视图模式,
  排序方式
}); 