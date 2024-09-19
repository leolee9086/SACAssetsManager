
export function 根据宽度和尺寸计算列数和边距(width, size, 表格视图阈值) {
    let columnCount = Math.max(Math.floor(width / size) - 1, 1);
    let paddingLR = (width - (size / 6 * (columnCount - 1) + size * columnCount)) / 2;
    
    if (paddingLR < 0) {
        columnCount = columnCount - 1;
        paddingLR = (width - (size / 6 * (columnCount - 1) + size * columnCount)) / 2;
    }

    if (size < 表格视图阈值) {
        paddingLR = 10;
        columnCount = 1;
    }
    return { columnCount, paddingLR };
}