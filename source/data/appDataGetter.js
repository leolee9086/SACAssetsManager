
//抹平tab和浮窗的差异
export const 获取数据模型提供者类型 = (appData) => {
    if (appData.efuPath) {
        return 'efu文件列表';
    } else if (appData.localPath) {
        return '本地文件系统';
    } else if (appData.tagLabel) {
        return '思源标签';
    } else if (appData.color) {
        return '内部颜色索引';
    } else if (appData.everythingApiLocation) {
        return 'everything';
    } else if (appData.anytxtApiLocation) {
        return 'anytxt';
    } else {
        return '默认';
    }
};