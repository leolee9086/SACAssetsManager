export const 表格视图阈值 = 100
export const 根据阈值计算最大宽度 = (size) => {
    if (size < 表格视图阈值) {
        return `100%`
    } else {
        return `${size}px`
    }
}