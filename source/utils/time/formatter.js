export const 转换思源时间戳为毫秒=(timestamp)=> {
    if (typeof timestamp === 'string' && timestamp.length === 14) {
        const year = parseInt(timestamp.slice(0, 4));
        const month = parseInt(timestamp.slice(4, 6)) - 1; // 月份从0开始
        const day = parseInt(timestamp.slice(6, 8));
        const hour = parseInt(timestamp.slice(8, 10));
        const minute = parseInt(timestamp.slice(10, 12));
        const second = parseInt(timestamp.slice(12, 14));

        return new Date(year, month, day, hour, minute, second).getTime();
    }
    return 0; // 如果时间戳格式不正确，返回0
}