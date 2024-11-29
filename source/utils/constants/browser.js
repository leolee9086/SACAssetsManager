import { $canvas混合模式 } from "./browser/canvas.js"
export {
    $canvas混合模式
}
export const $插入位置 = {
    $之前: 'beforebegin',     // 元素自身的前面
    $之后: 'afterend',        // 元素自身的后面
    $内部前: 'afterbegin',    // 元素内部的第一个子节点之前
    $内部后: 'beforeend'      // 元素内部的最后一个子节点之后
}
export const $选区位置 = {
    $开始: 'start',          
    $结束: 'end',
    $全部: 'all',
    $向前: 'forward',
    $向后: 'backward',
    $无方向: 'none'
}
export const $滚动行为 = {
    $平滑: 'smooth',
    $立即: 'instant',
    $自动: 'auto'
}
export const $可见性 = {
    $可见: 'visible',
    $隐藏: 'hidden',
    $折叠: 'collapse'
}
export const $拖拽效果 = {
    $复制: 'copy',
    $移动: 'move',
    $链接: 'link',
    $无: 'none'
}
export const $编辑模式 = {
    $纯文本: 'plaintext-only',
    $继承: 'inherit',
    $真: 'true',
    $假: 'false'
}
export const $输入模式 = {
    $无: 'none',
    $文本: 'text',
    $小数: 'decimal',
    $数字: 'numeric',
    $电话: 'tel',
    $搜索: 'search',
    $邮件: 'email',
    $网址: 'url'
}
export const $缓存策略 = {
    $默认: 'default',
    $无存储: 'no-store',
    $重新载入: 'reload',
    $无缓存: 'no-cache',
    $强制缓存: 'force-cache',
    $仅缓存: 'only-if-cached'
}
export const $通知方向 = {
    $自动: 'auto',
    $左上: 'ltr',
    $右上: 'rtl'
}
export const $观察类型 = {
    $子树: 'subtree',
    $属性: 'attributes',
    $子节点: 'childList',
    $字符数据: 'characterData',
    $属性旧值: 'attributeOldValue',
    $字符数据旧值: 'characterDataOldValue'
}
export const $文本对齐 = {
    $开始: 'start',
    $结束: 'end',
    $左: 'left',
    $右: 'right',
    $居中: 'center',
    $两端: 'justify',
    $匹配父元素: 'match-parent'
}
export const $字体平滑 = {
    $无: 'none',
    $抗锯齿: 'antialiased',
    $次像素: 'subpixel-antialiased',
    $自动: 'auto'
}
export const $换行模式 = {
    $正常: 'normal',
    $不换行: 'nowrap',
    $保留: 'pre',
    $保留换行: 'pre-wrap',
    $保留空格: 'pre-line',
    $截断: 'break-word'
}
export const $图片适应 = {
    $无: 'none',
    $包含: 'contain',
    $覆盖: 'cover',
    $填充: 'fill',
    $缩放降质: 'scale-down'
}
export const $滚动捕获 = {
    $自动: 'auto',
    $总是: 'always',
    $避免: 'avoid',
    $包含: 'contain'
}
export const $触摸操作 = {
    $自动: 'auto',
    $无: 'none',
    $平移: 'pan-x',
    $缩放: 'pinch-zoom',
    $操作: 'manipulation'
}
export const $书写模式 = {
    $水平左右: 'horizontal-tb',
    $垂直右左: 'vertical-rl',
    $垂直左右: 'vertical-lr'
}
export const $输入法模式 = {
    $自动: 'auto',
    $无: 'none',
    $正常: 'normal',
    $片假名: 'katakana',
    $平假名: 'hiragana',
    $全角: 'full-width',
    $激活: 'active',
    $禁用: 'disabled'
}
export const $重复行为 = {
    $重复: 'repeat',
    $不重复: 'no-repeat',
    $重复横向: 'repeat-x',
    $重复纵向: 'repeat-y',
    $空间: 'space',
    $轮播: 'round'
}
export const $滚动对齐 = {
    $开始: 'start',
    $结束: 'end',
    $居中: 'center',
    $最近: 'nearest'
}
export const $粘滞定位 = {
    $正常: 'normal',
    $粘性: 'sticky'
}
export const $焦点行为 = {
    $自动: 'auto',
    $无: 'none',
    $阻止: 'prevent'
}
export const $调整大小 = {
    $无: 'none',
    $两边: 'both',
    $水平: 'horizontal',
    $垂直: 'vertical',
    $块: 'block',
    $行内: 'inline'
}
export const $强调标记 = {
    $点: 'dot',
    $圆: 'circle',
    $双圆: 'double-circle',
    $三角: 'triangle',
    $芝麻: 'sesame',
    $无: 'none'
}
export const $列表位置 = {
    $外部: 'outside',
    $内部: 'inside'
}
export const $动画填充 = {
    $无: 'none',
    $前向: 'forwards',
    $后向: 'backwards',
    $双向: 'both'
}
export const $动画方向 = {
    $正常: 'normal',
    $反向: 'reverse',
    $交替: 'alternate',
    $交替反向: 'alternate-reverse'
}
export const $动画状态 = {
    $运行: 'running',
    $暂停: 'paused'
}
export const $背景附着 = {
    $固定: 'fixed',
    $滚动: 'scroll',
    $局部: 'local'
}
export const $背景混合 = {
    $正常: 'normal',
    $正片叠底: 'multiply',
    $滤色: 'screen',
    $叠加: 'overlay',
    $变暗: 'darken',
    $变亮: 'lighten'
}
export const $边框折叠 = {
    $分离: 'separate',
    $合并: 'collapse'
}
export const $鼠标指针 = {
    $自动: 'auto',
    $默认: 'default',
    $指针: 'pointer',
    $等待: 'wait',
    $文本: 'text',
    $移动: 'move',
    $禁止: 'not-allowed',
    $调整大小: 'resize',
    $十字线: 'crosshair'
}
export const $选择行为 = {
    $自动: 'auto',
    $文本: 'text',
    $无: 'none',
    $包含: 'contain',
    $全部: 'all'
}
export const $变形原点 = {
    $左上: 'left top',
    $左中: 'left center',
    $左下: 'left bottom',
    $右上: 'right top',
    $右中: 'right center',
    $右下: 'right bottom',
    $中心: 'center'
}
export const $滚动条 = {
    $自动: 'auto',
    $显示: 'scroll',
    $隐藏: 'hidden',
    $覆盖: 'overlay'
}
export const $对象适应 = {
    $填充: 'fill',
    $包含: 'contain',
    $覆盖: 'cover',
    $无: 'none',
    $缩放降质: 'scale-down'
}
export const $分栏填充 = {
    $平衡: 'balance',
    $自动: 'auto',
    $避免: 'avoid'
}
export const $页面显示 = {
    $自动: 'auto',
    $可选: 'optional-paged',
    $强制: 'paged',
    $避免: 'avoid-page'
}
export const $字体变体 = {
    $正常: 'normal',
    $小型大写: 'small-caps',
    $全部大写: 'all-small-caps',
    $首字大写: 'petite-caps',
    $统一大写: 'unicase'
}
export const $换页行为 = {
    $自动: 'auto',
    $避免: 'avoid',
    $总是: 'always',
    $左侧: 'left',
    $右侧: 'right',
    $页面: 'page',
    $列: 'column',
    $区域: 'region'
}