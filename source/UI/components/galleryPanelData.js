export const 获取数据到缓存 = async (接口位置, 搜索函数, 搜索, 接口启用, 数据缓存) => {
    const url = new URL(接口位置);

    const { enabled: 启用, fileList: 文件列表 } = await 搜索函数(搜索, url.port, { count: 10240 });
    接口启用.value = 启用;

    if (启用 && 文件列表) {

        数据缓存.push(...文件列表);

    }
};
const 获取文件扩展名 = (项目) => {
    if (项目.type !== 'note') {
        return 项目.name.split('.').pop().toLowerCase();
    }
    return 'note';
};

const 检查扩展名是否匹配 = (选中扩展名, 文件扩展名) => {
    if (选中扩展名.length === 0) {
        return true;
    }
    return 选中扩展名.includes(文件扩展名);
};

export const 校验数据项扩展名 = (选中扩展名, 项目) => {
    const 文件扩展名 = 获取文件扩展名(项目);
    return 检查扩展名是否匹配(选中扩展名, 文件扩展名);
};

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