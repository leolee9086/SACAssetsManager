import Rbush from '../../../../../static/rbush.js';
import { 定长执行 } from '../../../../../src/utils/functions/Iteration.js';
export function 二分查找可见素材(位置序列, 查找起点, 窗口高度) {
    let 当前起始索引 = 0;
    let 当前截止索引 = 位置序列.length - 1;
    let 起始索引 = -1;
    let 截止索引 = -1;
    // Find the start index
    while (当前起始索引 <= 当前截止索引) {
        const 中位索引 = Math.floor((当前起始索引 + 当前截止索引) / 2);
        const 当前布局项 = 位置序列[中位索引];
        const 布局项底部 = 当前布局项.y + 当前布局项.height;
        if (当前布局项.y > 查找起点 + 窗口高度) {
            当前截止索引 = 中位索引 - 1;
        } else if (布局项底部 < 查找起点) {
            当前起始索引 = 中位索引 + 1;
        } else {
            起始索引 = 中位索引;
            当前截止索引 = 中位索引 - 1;
        }
    }
    // Reset low and high for end index search
    当前起始索引 = 0;
    当前截止索引 = 位置序列.length - 1;
    // Find the end index
    while (当前起始索引 <= 当前截止索引) {
        const 中位索引 = Math.floor((当前起始索引 + 当前截止索引) / 2);
        const 当前布局项 = 位置序列[中位索引];
        const 布局项底部 = 当前布局项.y + 当前布局项.height;
        if (当前布局项.y > 查找起点 + 窗口高度) {
            当前截止索引 = 中位索引 - 1;
        } else if (布局项底部 < 查找起点) {
            当前起始索引 = 中位索引 + 1;
        } else {
            截止索引 = 中位索引;
            当前起始索引 = 中位索引 + 1;
        }
    }
    return { start: 起始索引, end: 截止索引 };
}

export function 创建瀑布流布局(columnCount, columnWidth, gutter, datas, reactive, staticSize) {
    const layout = [];
    const columns = [];
    const pendingUpdates = new Set();
    let updateQueue = []
    let updatedFromLastSearch = false
    // 设置定时器来处理更新
    let updateTimer = null;
    let timeStep = 30
    // 初始化列
    for (let i = 0; i < columnCount; i++) {
        columns.push({ x: i * (columnWidth + gutter), y: 0, items: [] });
    }
    // 添加数据的方法
    function add(data, height, width, selected) {
        updatedFromLastSearch = true
        let item = reactive ? reactive({}) : {}
        let shortestColumn = columns[0];
        let shortestColumnIndex = 0
        for (let i = 1; i < columns.length; i++) {
            if (columns[i].y < shortestColumn.y) {
                shortestColumn = columns[i];
                shortestColumnIndex = i; // 更新索引
            }
        }
        shortestColumn.items.push(item);
        item.selected = selected
        item.columnIndex = shortestColumnIndex
        item.indexInColumn = shortestColumn.items.length - 1
        item.x = shortestColumn.x;
        item.y = shortestColumn.y;
        item.minX = item.x
        item.minY = item.y
        //初始化的时候直接按照方形,36是卡片的信息框高度,这里之后要修改为参数
        if (!!height && !!width) {
            item.height = height * (columnWidth / width)
        } else {
            item.height = columnWidth + 36
        }

        item.width = columnWidth
        item.maxX = item.x + item.width
        item.maxY = item.y + item.height
        shortestColumn.y += item.height + gutter;
        item.data = data
        layout.push(item);
        item.index = layout.length - 1
        // 插入到 Rbush
        staticSize && tree.insert(item);
    }
    // 更新数据高度的方法
    function processUpdates() {
        // 按源卡片索引升序排序
        // console.time('processUpdates')
        let columnQueues = Array(columns.length)
        updateQueue.forEach(
            update => {
                columnQueues[update.columnIndex] = columnQueues[update.columnIndex] || []
                columnQueues[update.columnIndex].push(update)
            }
        )
        columnQueues.forEach(
            (_updateQueue, columnIndex) => {

                _updateQueue.sort((a, b) => a.indexInColumn - b.indexInColumn);
                // 计算每个分段的高度变化
                let segmentHeightChanges = [];
                let currentHeightChange = 0;
                for (let i = 0; i < _updateQueue.length; i++) {
                    const heightChange = _updateQueue[i].heightChange;
                    currentHeightChange += heightChange;
                    segmentHeightChanges.push({ indexInColumn: _updateQueue[i].indexInColumn, heightChange: currentHeightChange });
                }
                // 分段更新受影响的卡片
                for (let i = 0; i < segmentHeightChanges.length; i++) {
                    const segment = segmentHeightChanges[i];
                    updateCardsFromIndex(segment.indexInColumn, segment.heightChange, i === segmentHeightChanges.length - 1 ? null : segmentHeightChanges[i + 1].indexInColumn, columns[columnIndex]);
                }
                // 清空队列
            }
        )

        staticSize && batchUpdateIndex()
        updateQueue = [];
        timeStep = 30
    }
    // 更新从指定索引开始的所有卡片的高度，直到下一个更新分片的索引
    function updateCardsFromIndex(startIndex, heightChange, nextIndex, column) {
        for (let i = startIndex + 1; i < column.items.length; i++) {
            if (nextIndex !== null && i > nextIndex) {
                break; // 停止更新，因为我们已经到达了下一个更新分片
            }
            column.items[i].y += heightChange;
            column.items[i].minY = column.items[i].y;
            column.items[i].maxY = column.items[i].y + column.items[i].height;
            pendingUpdates.add(column.items[i])
        }
    }
    const updateRequests = new Map(); // 用于存储更新请求

    function update(index, newHeight) {
        timeStep += 1;
        updatedFromLastSearch = true;
        const item = layout[index];
        const oldHeight = item.height;
        const heightDifference = parseInt(newHeight) - oldHeight;

        if (index >= 0 && index < layout.length) {
            // 存储最新的更新请求
            updateRequests.set(index, { newHeight, timestamp: Date.now() });

            // 如果定时器未设置，设置一个定时器来处理更新
            if (!updateTimer) {
                updateTimer = setTimeout(() => {
                    processPendingUpdates();
                    updateTimer = null; // 处理完毕后重置定时器
                }, 15); // 15毫秒的处理间隔
            }
        }
    }

    function processPendingUpdates() {
        updateRequests.forEach((request, index) => {
            const item = layout[index];
            const oldHeight = item.height;
            const heightDifference = parseInt(request.newHeight) - oldHeight;

            staticSize && tree.remove(item);
            item.height = request.newHeight;
            item.maxY = item.y + item.height;
            let columnIndex = item.columnIndex;
            let currentColumn = columns[columnIndex];
            currentColumn.y += heightDifference;

            // 立即更新同一列中的下一个元素
            const nextItemIndex = item.indexInColumn + 1;
            if (nextItemIndex < currentColumn.items.length) {
                const nextItem = currentColumn.items[nextItemIndex];
                nextItem.y += heightDifference;
                nextItem.minY = nextItem.y;
                nextItem.maxY = nextItem.y + nextItem.height;
            }

            // 添加到更新队列
            updateQueue.push({
                indexInColumn: item.indexInColumn + 1,
                heightChange: heightDifference,
                columnIndex: columnIndex,
                timestamp: Date.now() // 记录更新的时间戳
            });

            // 重新插入到 Rbush
            staticSize && tree.insert(item);
        });

        updateRequests.clear(); // 清空更新请求
        processUpdates();
        timeStep = 30;
    }
    // 更新数据高度的方法
    function $update(index, newHeight) {
        timeStep += 1
        updatedFromLastSearch = true
        const item = layout[index];
        const oldHeight = item.height;
        const heightDifference = parseInt(newHeight) - oldHeight;
        if (index >= 0 && index < layout.length) {
            const item = layout[index];
            staticSize && tree.remove(item)
            item.height = newHeight;
            item.maxY = item.y + item.height;
            let columnIndex = item.columnIndex;
            let currentColumn = columns[columnIndex];
            currentColumn.y += heightDifference;
            // 立即更新同一列中的下一个元素
            const nextItemIndex = item.indexInColumn + 1;
            if (nextItemIndex < currentColumn.items.length) {
                const nextItem = currentColumn.items[nextItemIndex];
                nextItem.y += heightDifference;
                nextItem.minY = nextItem.y;
                nextItem.maxY = nextItem.y + nextItem.height;
            }

            //添加到更新队列
            updateQueue.push({
                indexInColumn: item.indexInColumn+1,
                heightChange: heightDifference,
                columnIndex: columnIndex,
                timestamp: Date.now() // 记录更新的时间戳
            });
            // 重新插入到 Rbush
            staticSize && tree.insert(item)

            // 如果定时器未设置，设置一个定时器来处理更新
            if (layout.length <= 5000) {
                processUpdates();
                timeStep = 30
                return
            }
            /***
             * 这里的批处理函数可能会在有大量文件时出错
             */
            if (!updateTimer) {
                updateTimer = setTimeout(() => {
                    processUpdates();
                    updateTimer = null; // 处理完毕后重置定时器
                }, timeStep); // 假设处理间隔为100毫秒
            }
        }
    }
    function batchUpdateIndex() {
        const updates = Array.from(pendingUpdates);
        updates.forEach(
            item => tree.remove(item)
        )
        tree.load(updates)
        pendingUpdates.clear()
    }
    function sort(sorter) {
        const newLayoutObj = 创建瀑布流布局(columnCount, columnWidth, gutter, [], reactive, staticSize)
        layout.sort(sorter).forEach(
            item => {
                newLayoutObj.add(item.data, item.height, item.width, item.selected)
            }
        )
        return newLayoutObj
    }
    function rebuild(columnCount, columnWidth, gutter, datas, reactive) {
        const newLayoutObj = 创建瀑布流布局(columnCount, columnWidth, gutter, [], reactive, staticSize)
        layout.forEach(
            item => {

                newLayoutObj.add(item.data, item.height, item.width, item.selected)
            }
        )
        return newLayoutObj
    }
    if (datas) {
        datas.forEach(
            data => {
                add(data)
            }
        )
    }
    function search(可见框) {
        let { minX, minY, maxX, maxY } = 可见框;
        let 查找起点 = minY;
        let 窗口高度 = maxY - minY;
        let result = [];

        for (let i = 0; i < columns.length; i++) {
            let items = columns[i].items;
            let range = 二分查找可见素材(items, 查找起点, 窗口高度);
            let columnResult = [];
            for (let j = range.start; j <= range.end; j++) {
                columnResult.push(items[j]);
            }

            // 二次更新，避免重叠
            columnResult.sort((a, b) => a.y - b.y); // 按y坐标排序
            for (let k = 1; k < columnResult.length; k++) {
                if (columnResult[k].y < columnResult[k - 1].maxY) {
                    columnResult[k].y = columnResult[k - 1].maxY + gutter; // 调整y坐标
                    columnResult[k].minY = columnResult[k].y;
                    columnResult[k].maxY = columnResult[k].y + columnResult[k].height;
                }
            }

            result = result.concat(columnResult);
        }

        return result;
    }


    let tree = new Rbush()
    function searchByRect(可见框) {
        if (updatedFromLastSearch) {
            tree = new Rbush()
            tree.load(layout)

            updatedFromLastSearch = false
        }

        let result = tree.search(可见框)
        return result
    }
    return {
        layout: layout,
        columns: columns,
        gutter: gutter,
        add: add,
        update: (...args) => update(...args),
        rebuild: rebuild,
        //这里会有this指向问题
        search: (...args) => search(...args),
        searchByRect,
        timeStep,
        sort: (...args) => sort(...args),
        getTotalHeight: () => {
            return Math.max(...columns.map(column => column.y))
        }
    };
}
export function getColumnNextSiblingByIndex(columns, columnIndex, itemIndex) {
    const column = columns[columnIndex];
    if (!column || itemIndex < 0 || itemIndex >= column.items.length - 1) {
        return null; // 如果列不存在或索引无效，返回null
    }
    return column.items[itemIndex + 1]; // 返回下一个元素
}

export const 获取布局最短列 = (布局对象) => {
    let { columns } = 布局对象
    let shortestColumn = columns[0];
    for (let i = 1; i < columns.length; i++) {
        if (columns[i].y < shortestColumn.y) {
            shortestColumn = columns[i];
        }
    }
    return shortestColumn
}

export const 从数据源添加新数据 = (布局对象, 数据源, 校验函数) => {
    let data = 数据源.shift && 数据源.shift();
    if (校验函数(data)) {
        布局对象.add(data);
        return true;
    }
    return false;
}
export const 从数据源定量加载数据 = (阈值, 布局对象, 数据源, 校验函数, 加载回调 = () => { }) => {
    let 生成函数 = async () => {
        return 数据源.shift && 数据源.shift()
    }
    let 迭代函数 = async (data) => {
        if (校验函数(data)) {
            布局对象.add(data)
            加载回调()
        }
    }
    let 忽略空值 = false
    let 忽略迭代错误 = false
    let 忽略执行错误 = false
    定长执行(生成函数, 迭代函数, 阈值, 忽略空值, 忽略迭代错误, 忽略执行错误)

}