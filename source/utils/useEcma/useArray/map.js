export const 异步映射 = async (数组, 映射函数) => {
    const 结果数组 = await Promise.all(
        数组.map(async (项) => {
            await new Promise(resolve => setTimeout(resolve, 0));
            return await 映射函数(项);
        })
    );
    return 结果数组;
} 