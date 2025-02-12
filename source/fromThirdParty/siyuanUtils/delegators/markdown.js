// Delegators 定义
const markdown委托器 = {
    _validateContainer: (容器) => {
        if (!容器?.id || !容器?.kernelApi) {
            throw new Error('容器必须包含 id 和 kernelApi 属性');
        }
    },
    get: (容器) => {
        markdown委托器._validateContainer(容器);
        return 容器.kernelApi.getBlockKramdown.sync({ id: 容器.id }).kramdown;
    },
    getAsync: async (容器) => {
        markdown委托器._validateContainer(容器);
        const result = await 容器.kernelApi.getBlockKramdown({ id: 容器.id });
        return result.kramdown;
    },
    set: (容器, content) => {
        markdown委托器._validateContainer(容器);
        return 容器.kernelApi.updateBlock({
            id: 容器.id,
            data: content,
            type: 'markdown'
        });
    },
    setAsync: async (容器, content) => {
        markdown委托器._validateContainer(容器);
        return await 容器.kernelApi.updateBlock({
            id: 容器.id,
            data: content,
            type: 'markdown'
        });
    }
};
