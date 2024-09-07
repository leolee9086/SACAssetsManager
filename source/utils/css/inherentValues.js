export const display = {
    inlineBlock: 'inline-block',
    // 块级元素
    block: 'block',
    // 内联元素
    inline: 'inline',
    // 弹性布局
    flex: 'flex',
    inlineFlex: 'inline-flex',
    // 网格布局
    grid: 'grid',
    inlineGrid: 'inline-grid',
    // 表格相关
    table: 'table',
    tableCell: 'table-cell',
    tableRow: 'table-row',
    tableColumn: 'table-column',
    // 列表项
    listItem: 'list-item',
    // 隐藏元素
    none: 'none',
    // 内容相关
    contents: 'contents',
    // 行内块级元素（已有,保留）
    inlineBlock: 'inline-block',
    // 流式布局
    flow: 'flow',
    flowRoot: 'flow-root',
    // 其他
    inherit: 'inherit',
    initial: 'initial',
    revert: 'revert',
    unset: 'unset'
};
export const overflow = {
    // 隐藏溢出内容
    hidden: 'hidden',
    // 显示溢出内容
    visible: 'visible',
    // 添加滚动条
    scroll: 'scroll',
    // 自动添加滚动条
    auto: 'auto',
    // 裁剪溢出内容
    clip: 'clip',
    // 全局值
    inherit: 'inherit',
    initial: 'initial',
    unset: 'unset',
    // 单独控制水平和垂直方向
};
export const textOverflow = {
    // 基本值
    clip: 'clip',
    ellipsis: 'ellipsis',
    // 字符串值（需要在实际使用时替换具体字符）
    string: (str) => `"${str}"`,
    // 常用组合
    clipClip: 'clip clip',
    clipEllipsis: 'clip ellipsis',
    ellipsisClip: 'ellipsis clip',
    ellipsisEllipsis: 'ellipsis ellipsis',
    // 自定义字符串组合
    clipString: (str) => `clip "${str}"`,
    ellipsisString: (str) => `ellipsis "${str}"`,
    stringClip: (str) => `"${str}" clip`,
    stringEllipsis: (str) => `"${str}" ellipsis`,
    // 全局值
    inherit: 'inherit',
    initial: 'initial',
    unset: 'unset'
};
export const position = {
    // 静态定位（默认值）
    static: 'static',
    
    // 相对定位
    relative: 'relative',
    
    // 绝对定位
    absolute: 'absolute',
    
    // 固定定位
    fixed: 'fixed',
    
    // 粘性定位
    sticky: 'sticky',
    
    // 全局值
    inherit: 'inherit',
    initial: 'initial',
    unset: 'unset',
    
    // 新增的实验性值（可能需要浏览器前缀）
    // 注意：这些值的支持度可能较低，使用时需谨慎
    absoluteSticky: '-webkit-sticky',  // 仅 WebKit/Blink
    
    // 辅助函数：生成带浏览器前缀的 sticky
    stickyWithPrefix: () => {
      return {
        position: [
          '-webkit-sticky',
          '-moz-sticky',
          '-ms-sticky',
          '-o-sticky',
          'sticky'
        ]
      };
    }
  };
  export const whiteSpace = {
    // 默认值,空白会被浏览器忽略
    normal: 'normal',
    
    // 空白会被保留,文本内的换行无效
    nowrap: 'nowrap',
    
    // 空白会被保留,文本只在有换行符的地方换行
    pre: 'pre',
    
    // 同 pre,但是会自动换行
    preLine: 'pre-line',
    
    // 同 pre,但是会保留文本的换行
    preWrap: 'pre-wrap',
    
    // 保留连续的空白符,但文本自动换行
    breakSpaces: 'break-spaces',
    
    // 全局值
    inherit: 'inherit',
    initial: 'initial',
    unset: 'unset',
    
    // 实验性值
    // 警告: 这些值可能不被所有浏览器支持
    webkitNowrap: '-webkit-nowrap',
    
    // 辅助函数: 生成带浏览器前缀的值
    withPrefix: (value) => {
      return [
        `-webkit-${value}`,
        `-moz-${value}`,
        `-ms-${value}`,
        `-o-${value}`,
        value
      ].join(';');
    }
  };