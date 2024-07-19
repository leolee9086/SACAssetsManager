import {ref,watch,compute} from '../../../../../static/vue.esm-browser.js'
function 初始化空布局(元素数量,布局列数, 列宽度,预期高度) {
    const layout = {
        顺序索引: [],
        列索引: [],
        高度索引: [],
        列总高度: [],
        每列可用索引: Array(布局列数).fill(0).map(() => []),  // 每列的可用索引区间数组
        总可用索引: []  // 总的可用索引区间数组
    };
    const columnWidth = 列宽度 / 布局列数;
    for (let i = 0; i < 元素数量; i++) {
        const 当前列 = Math.floor(i / 布局列数);
        const indexInColumn = i % 布局列数;
        const x = indexInColumn * columnWidth;
        const y = layout.列总高度[当前列] || 0; // 使用列的当前总高度

        const element = {
            column: 当前列,
            indexInColumn,
            x,
            y,
            width: columnWidth,
            height: 预期高度,
            meta: null  // 初始化为null表示未使用
        };
        layout.顺序索引.push(element);
        layout.列索引[当前列] = layout.列索引[当前列] || [];
        layout.列索引[当前列].push(element);
        // 更新列的总高度
        layout.列总高度[当前列] = y + 预期高度;
        // 更新每列的可用索引区间
        const 当前列当前可用索引区间表 = layout.每列可用索引[当前列];
        const startIndex = indexInColumn + 1;
        const endIndex = 布局列数 - 1;
        if (当前列当前可用索引区间表.length === 0 || startIndex > 当前列当前可用索引区间表[当前列当前可用索引区间表.length - 1].end + 1) {
            // 如果没有可用区间或新的可用区间不与最后一个区间相邻，则添加新的区间
            当前列当前可用索引区间表.push({ start: startIndex, end: endIndex });
        } else {
            // 如果新的可用区间与最后一个区间相邻，则合并它们
            当前列当前可用索引区间表[当前列当前可用索引区间表.length - 1].end = endIndex;
        }
        // 更新总的可用索引区间
        const 总可用索引 = layout.总可用索引;
        const 最后区间 = 总可用索引.length > 0 ? 总可用索引[总可用索引.length - 1] : null;
        if (最后区间 && startIndex <= 最后区间.end + 1) {
            // 如果新的可用区间与最后一个区间相邻，则合并它们
            最后区间.end = endIndex;
        } else {
            // 否则添加新的区间
            总可用索引.push({ start: startIndex, end: endIndex });
        }
        layout.高度索引.push({ y, element });
    }
    // Sort the height index by y value
    layout.高度索引.sort((a, b) => a.y - b.y);
    return layout;
}

function 添加元素(layout, 新元素数量, 布局列数, 列宽度, 预期高度, 指定高度) {
    const columnWidth = 列宽度 / 布局列数;
    const availableColumns = layout.每列可用索引.map((ranges, column) => ({ column, ranges }));
    const sortedAvailableColumns = availableColumns.sort((a, b) => a.ranges[0].start - b.ranges[0].start);

    for (let i = 0; i < 新元素数量; i++) {
        const { column, ranges } = sortedAvailableColumns.find(col => col.ranges.length > 0);
        const { start } = ranges.shift(); // 取出第一个可用区间的起始索引

        const indexInColumn = start;
        const x = indexInColumn * columnWidth;
        const y = layout.列总高度[column] || 0; // 使用列的当前总高度

        const element = {
            column,
            indexInColumn,
            x,
            y,
            width: columnWidth,
            height: 预期高度,
            meta: null  // 初始化为null表示未使用
        };

        layout.顺序索引.push(element);
        layout.列索引[column] = layout.列索引[column] || [];
        layout.列索引[column].push(element);

        // 更新列的总高度
        layout.列总高度[column] = y + 预期高度;

        // 更新每列的可用索引区间
        const currentColumnAvailable = layout.每列可用索引[column];
        const endIndex = indexInColumn;

        if (currentColumnAvailable.length === 0 || endIndex > currentColumnAvailable[currentColumnAvailable.length - 1].end + 1) {
            // 如果没有可用区间或新的可用区间不与最后一个区间相邻，则添加新的区间
            currentColumnAvailable.push({ start: endIndex + 1, end: 布局列数 - 1 });
        } else {
            // 如果新的可用区间与最后一个区间相邻，则合并它们
            currentColumnAvailable[currentColumnAvailable.length - 1].end = endIndex;
        }

        // 更新总的可用索引区间
        const totalAvailable = layout.总可用索引;
        const lastRange = totalAvailable.length > 0 ? totalAvailable[totalAvailable.length - 1] : null;

        if (lastRange && endIndex <= lastRange.end + 1) {
            // 如果新的可用区间与最后一个区间相邻，则合并它们
            lastRange.end = endIndex;
        } else {
            // 否则添加新的区间
            totalAvailable.push({ start: endIndex + 1, end: 布局列数 - 1 });
        }

        layout.高度索引.push({ y, element });
    }

    // Sort the height index by y value
    layout.高度索引.sort((a, b) => a.y - b.y);

    return layout;
}
