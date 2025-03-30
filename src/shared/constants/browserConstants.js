/**
 * 浏览器相关常量定义
 * 定义浏览器环境中使用的DOM、CSS和其他Web API相关常量
 */

/**
 * 插入位置常量
 * 用于Element.insertAdjacentHTML()等方法
 * @type {Object}
 */
export const $插入位置 = Object.freeze({
  /** 元素自身的前面 */
  $之前: 'beforebegin',
  /** 元素自身的后面 */
  $之后: 'afterend',
  /** 元素内部的第一个子节点之前 */
  $内部前: 'afterbegin',
  /** 元素内部的最后一个子节点之后 */
  $内部后: 'beforeend'
});

/**
 * 选区位置常量
 * 用于Selection和Range相关API
 * @type {Object}
 */
export const $选区位置 = Object.freeze({
  /** 开始位置 */
  $开始: 'start',
  /** 结束位置 */
  $结束: 'end',
  /** 全部选择 */
  $全部: 'all',
  /** 向前方向 */
  $向前: 'forward',
  /** 向后方向 */
  $向后: 'backward',
  /** 无方向 */
  $无方向: 'none'
});

/**
 * 滚动行为常量
 * 用于scrollIntoView()等方法
 * @type {Object}
 */
export const $滚动行为 = Object.freeze({
  /** 平滑滚动 */
  $平滑: 'smooth',
  /** 立即滚动 */
  $立即: 'instant',
  /** 自动决定 */
  $自动: 'auto'
});

/**
 * 可见性常量
 * 用于CSS visibility属性
 * @type {Object}
 */
export const $可见性 = Object.freeze({
  /** 可见 */
  $可见: 'visible',
  /** 隐藏 */
  $隐藏: 'hidden',
  /** 折叠 */
  $折叠: 'collapse'
});

/**
 * 拖拽效果常量
 * 用于拖放API
 * @type {Object}
 */
export const $拖拽效果 = Object.freeze({
  /** 复制 */
  $复制: 'copy',
  /** 移动 */
  $移动: 'move',
  /** 链接 */
  $链接: 'link',
  /** 无效果 */
  $无: 'none'
});

/**
 * 编辑模式常量
 * 用于contentEditable属性
 * @type {Object}
 */
export const $编辑模式 = Object.freeze({
  /** 仅纯文本 */
  $纯文本: 'plaintext-only',
  /** 继承父元素 */
  $继承: 'inherit',
  /** 可编辑 */
  $真: 'true',
  /** 不可编辑 */
  $假: 'false'
});

/**
 * 输入模式常量
 * 用于input元素的inputmode属性
 * @type {Object}
 */
export const $输入模式 = Object.freeze({
  /** 无特定输入模式 */
  $无: 'none',
  /** 文本输入 */
  $文本: 'text',
  /** 小数输入 */
  $小数: 'decimal',
  /** 数字输入 */
  $数字: 'numeric',
  /** 电话号码输入 */
  $电话: 'tel',
  /** 搜索输入 */
  $搜索: 'search',
  /** 电子邮件输入 */
  $邮件: 'email',
  /** 网址输入 */
  $网址: 'url'
});

/**
 * 缓存策略常量
 * 用于fetch API的cache选项
 * @type {Object}
 */
export const $缓存策略 = Object.freeze({
  /** 默认缓存模式 */
  $默认: 'default',
  /** 不使用缓存 */
  $无存储: 'no-store',
  /** 重新载入资源 */
  $重新载入: 'reload',
  /** 不使用缓存，但更新缓存 */
  $无缓存: 'no-cache',
  /** 强制使用缓存 */
  $强制缓存: 'force-cache',
  /** 仅使用缓存 */
  $仅缓存: 'only-if-cached'
});

/**
 * 通知方向常量
 * 用于Notification API
 * @type {Object}
 */
export const $通知方向 = Object.freeze({
  /** 自动决定方向 */
  $自动: 'auto',
  /** 从左到右 */
  $左上: 'ltr',
  /** 从右到左 */
  $右上: 'rtl'
});

/**
 * 观察类型常量
 * 用于MutationObserver API
 * @type {Object}
 */
export const $观察类型 = Object.freeze({
  /** 观察子树变化 */
  $子树: 'subtree',
  /** 观察属性变化 */
  $属性: 'attributes',
  /** 观察子节点变化 */
  $子节点: 'childList',
  /** 观察字符数据变化 */
  $字符数据: 'characterData',
  /** 记录属性旧值 */
  $属性旧值: 'attributeOldValue',
  /** 记录字符数据旧值 */
  $字符数据旧值: 'characterDataOldValue'
});

/**
 * 文本对齐常量
 * 用于CSS text-align属性
 * @type {Object}
 */
export const $文本对齐 = Object.freeze({
  /** 开始对齐 */
  $开始: 'start',
  /** 结束对齐 */
  $结束: 'end',
  /** 左对齐 */
  $左: 'left',
  /** 右对齐 */
  $右: 'right',
  /** 居中对齐 */
  $居中: 'center',
  /** 两端对齐 */
  $两端: 'justify',
  /** 匹配父元素 */
  $匹配父元素: 'match-parent'
});

/**
 * 字体平滑常量
 * 用于CSS font-smooth属性
 * @type {Object}
 */
export const $字体平滑 = Object.freeze({
  /** 无平滑 */
  $无: 'none',
  /** 抗锯齿 */
  $抗锯齿: 'antialiased',
  /** 次像素抗锯齿 */
  $次像素: 'subpixel-antialiased',
  /** 自动决定 */
  $自动: 'auto'
});

/**
 * 换行模式常量
 * 用于CSS white-space属性
 * @type {Object}
 */
export const $换行模式 = Object.freeze({
  /** 正常换行 */
  $正常: 'normal',
  /** 不换行 */
  $不换行: 'nowrap',
  /** 保留空格和换行 */
  $保留: 'pre',
  /** 保留空格和换行，允许自动换行 */
  $保留换行: 'pre-wrap',
  /** 保留换行，合并空格 */
  $保留空格: 'pre-line',
  /** 在单词内部换行 */
  $截断: 'break-word'
});

/**
 * 背景混合模式常量
 * 用于CSS background-blend-mode属性
 * @type {Object}
 */
export const $背景混合 = Object.freeze({
  /** 正常混合 */
  $正常: 'normal',
  /** 正片叠底 */
  $正片叠底: 'multiply',
  /** 滤色 */
  $滤色: 'screen',
  /** 叠加 */
  $叠加: 'overlay',
  /** 变暗 */
  $变暗: 'darken',
  /** 变亮 */
  $变亮: 'lighten'
});

/**
 * 所有浏览器常量
 * 整合所有浏览器相关常量
 * @type {Object}
 */
export const 浏览器常量 = Object.freeze({
  插入位置: $插入位置,
  选区位置: $选区位置,
  滚动行为: $滚动行为,
  可见性: $可见性,
  拖拽效果: $拖拽效果,
  编辑模式: $编辑模式,
  输入模式: $输入模式,
  缓存策略: $缓存策略,
  通知方向: $通知方向,
  观察类型: $观察类型,
  文本对齐: $文本对齐,
  字体平滑: $字体平滑,
  换行模式: $换行模式,
  背景混合: $背景混合
}); 