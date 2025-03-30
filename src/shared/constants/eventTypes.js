/**
 * 事件类型常量定义
 * 定义了系统中所有的事件类型，用于事件发布和订阅
 */

/**
 * 资源相关事件
 * @type {Object}
 */
export const 资源事件类型 = Object.freeze({
  /** 资源加载完成 */
  资源加载完成: 'asset:loaded',
  /** 资源列表更新 */
  资源列表更新: 'asset:list-updated',
  /** 资源被选中 */
  资源选中: 'asset:selected',
  /** 资源被取消选中 */
  资源取消选中: 'asset:deselected',
  /** 资源被添加 */
  资源添加: 'asset:added',
  /** 资源被移除 */
  资源移除: 'asset:removed',
  /** 资源被修改 */
  资源修改: 'asset:modified',
  /** 资源移动到回收站 */
  资源移至回收站: 'asset:trashed',
  /** 资源从回收站恢复 */
  资源从回收站恢复: 'asset:restored'
});

/**
 * UI相关事件
 * @type {Object}
 */
export const UI事件类型 = Object.freeze({
  /** 面板创建完成 */
  面板创建完成: 'ui:panel-created',
  /** 面板销毁 */
  面板销毁: 'ui:panel-destroyed',
  /** 主题变更 */
  主题变更: 'ui:theme-changed',
  /** 刷新UI */
  刷新UI: 'ui:refresh',
  /** 显示加载状态 */
  显示加载状态: 'ui:show-loading',
  /** 隐藏加载状态 */
  隐藏加载状态: 'ui:hide-loading',
  /** 显示Toast消息 */
  显示消息: 'ui:show-toast'
});

/**
 * 插件生命周期事件
 * @type {Object}
 */
export const 生命周期事件类型 = Object.freeze({
  /** 插件初始化完成 */
  插件初始化完成: 'lifecycle:plugin-initialized',
  /** 插件准备卸载 */
  插件准备卸载: 'lifecycle:plugin-unloading',
  /** 数据准备完成 */
  数据准备完成: 'lifecycle:data-ready',
  /** 配置加载完成 */
  配置加载完成: 'lifecycle:config-loaded'
});

/**
 * 导出所有事件类型
 */
export const 事件类型 = Object.freeze({
  ...资源事件类型,
  ...UI事件类型,
  ...生命周期事件类型
}); 