export const 获取数据到缓存 = async (接口位置, 搜索函数, 搜索, 接口启用, 数据缓存) => {
    const url = new URL(接口位置);

    const { enabled: 启用, fileList: 文件列表 } = await 搜索函数(搜索, url.port, { count: 10240 });
    接口启用.value = 启用;

    if (启用 && 文件列表) {

        数据缓存.push(...文件列表);

    }
};
