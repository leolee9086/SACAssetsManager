import Rbush from '../../../../../static/rbush.js';

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


export function 创建瀑布流布局(columnCount, columnWidth, gutter, datas, reactive) {
    const layout = [];
    const columns = [];
    const tree = new Rbush()
    const pendingUpdates = new Set();
    let updateQueue = []
    let isUpdating
    // 设置定时器来处理更新
    let updateTimer = null;
    let timeStep = 30
    // 初始化列
    for (let i = 0; i < columnCount; i++) {
        columns.push({ x: i * (columnWidth + gutter), y: 0, items: [] });
    }
    // 添加数据的方法
    function add(data, height, width) {
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
        item.columnIndex = shortestColumnIndex
        item.indexInColumn = shortestColumn.items.length - 1
        item.x = shortestColumn.x;
        item.y = shortestColumn.y;
        item.minX = item.x
        item.minY = item.y
        //初始化的时候直接按照方形,36是卡片的信息框高度,这里之后要修改为参数
        if (height && width) {
            item.height = data.height * (columnWidth / width)
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
        tree.insert(item);
    }
    // 更新数据高度的方法
    function processUpdates() {
        // 按源卡片索引升序排序
        console.time('processUpdates')
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
        console.time('batchUpdateIndex')

        //batchUpdateIndex()
        console.timeEnd('batchUpdateIndex')

        updateQueue = [];
        timeStep = 30
        console.timeEnd('processUpdates')

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
    // 更新数据高度的方法
    function update(index, newHeight) {
        timeStep += 1
        const oldHeight = layout[index].height;
        const heightDifference = parseInt(newHeight) - oldHeight;
        if (index >= 0 && index < layout.length && Math.abs(heightDifference) >= oldHeight * 0.1) {
            const item = layout[index];
            if (item.ready) {
                return
            }
            item.ready = true;
            // 从 Rbush 中移除旧的项
            // 更新项的高度和位置
            tree.remove(item)
            item.height = newHeight;
            item.maxY = item.y + item.height;
            let columnIndex = item.columnIndex;
            let currentColumn = columns[columnIndex];
            currentColumn.y += heightDifference;
            //添加到更新队列
            updateQueue.push({
                indexInColumn: item.indexInColumn,
                heightChange: heightDifference,
                columnIndex: columnIndex,
                timestamp: Date.now() // 记录更新的时间戳
            });
            // 重新插入到 Rbush
            tree.insert(item)
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
                //  updateTimer = setTimeout(async() => {
                processUpdates();
                //     updateTimer = null; // 处理完毕后重置定时器
                //  }, timeStep); // 假设处理间隔为100毫秒
            }

            /*  for (let i = item.indexInColumn + 1; i < currentColumn.items.length; i++) {
                  let _item = currentColumn.items[i];
                  _item.y += heightDifference;
                  _item.minY = _item.y;
                  _item.maxY = _item.y + _item.height;
                  pendingUpdates.add(_item)
              }
              requestIdleCallback(batchUpdateIndex)*/
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
    function rebuild(columnCount, columnWidth, gutter, datas, reactive) {
        const newLayoutObj = 创建瀑布流布局(columnCount, columnWidth, gutter, [], reactive)
        layout.forEach(
            item => {

                newLayoutObj.add(item.data, item.height, item.width)
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
        let { minX, minY, maxX, maxY } = 可见框
        let 查找起点 = minY
        let 窗口高度 = maxY - minY
        let result = []
        for (let i = 0; i < columns.length; i++) {
            let items = column[i].items
            let range = 二分查找可见素材(items, 查找起点, 窗口高度)
            let data = items.slice(range.start, range.end)
            result = result.concat(data)
        }
        return result
    }
    return {
        layout: layout,
        columns: columns,
        add: add,
        update: (...args) => update(...args),
        rebuild: rebuild,
        //这里会有this指向问题
        // search: (...args) => tree.search(...args),
        search,
        tree,
        timeStep
    };
}
