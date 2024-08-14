function arrayToStream(array) {
    // 创建一个新的可读流
    const stream = new require('stream').Readable({
        // 设置编码为utf-8
        encoding: 'utf-8',
        // 指定对象模式
        objectMode: true,
        // 指定高水位标记，控制推送数据的速率
        highWaterMark: 16
    });

    // 存储数组索引
    let index = 0;

    // 定义_read方法
    stream._read = function (n) {
        // 当数组索引小于数组长度时，继续推送数据
        while (index < array.length && stream.readableLength < n) {
            // 推送当前索引处的元素
            stream.push(array[index++]);
        }

        // 如果数组中的所有元素都已推送完毕，则结束流
        if (index >= array.length) {
            stream.push(null);
        }
    };

    return stream;
}
function generatorToStream(generator) {
    const stream = new require('stream').Readable({
        // 设置编码为utf-8
        encoding: 'utf-8',
        // 指定对象模式
        objectMode: true,
        // 指定高水位标记，控制推送数据的速率
        highWaterMark: 16
    })
    stream._read = function (n) {
        const item = generator.next()
        if (item.done) stream.push(null)
        else stream.push(item.value)
    }
    return stream
}