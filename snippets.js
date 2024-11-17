const 尝试 = (操作函数) => async (...参数组) => {
    try {
        const 结果 = await 操作函数(...参数组)
        return {
            当成功: (成功操作) => 成功操作(结果),
            当失败: () => false
        }
    } catch (错误) {
        return {
            当成功: () => false,
            当失败: (失败操作) => 失败操作(错误)
        }
    }
}