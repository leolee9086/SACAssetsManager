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