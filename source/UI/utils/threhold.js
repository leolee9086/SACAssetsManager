export const 表格视图阈值 = 100
export const 根据阈值计算最大宽度 = (size) => {
    if (size < 表格视图阈值) {
        return `100%`
    } else {
        return `${size}px`
    }
}
// 定义常量来表示布局方向
export const LAYOUT_COLUMN = 'column';
export const LAYOUT_ROW = 'row';
export const 根据尺寸获取显示模式=(size)=>{
    return size >= 表格视图阈值 ? LAYOUT_COLUMN : LAYOUT_ROW;
}