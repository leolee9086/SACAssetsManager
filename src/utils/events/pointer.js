/**
 * 处理高速移动事件优化
 * @param {Object} 配置
 * @param {boolean} 配置.正在绘画 - 绘画状态标志
 * @param {boolean} 配置.使用预测点 - 是否启用预测优化
 * @param {Function} 配置.绘画处理 - 单点绘制函数
 * @param {PointerEvent} 移动事件 - 原始指针事件
 * @returns {Promise<void>}
 */
export async function 优化高速移动事件(
    {
        正在绘画 = false,
        使用预测点 = false,
        绘画处理 = async () => {}
    },
    移动事件
) {
    if (!正在绘画) return;

    const 批量处理事件点 = async (事件序列) => {
        for (const 事件点 of 事件序列) {
            await 绘画处理(事件点);
        }
    };

    // 支持事件合并的设备：处理高速移动时的点合并
    if (移动事件.getCoalescedEvents) {
        // 还原实际移动轨迹点
        const 实际轨迹点 = 移动事件.getCoalescedEvents();
        await 批量处理事件点(实际轨迹点);

        // 处理预测点以降低延迟
        if (使用预测点 && 移动事件.getPredictedEvents) {
            const 预测轨迹点 = 移动事件.getPredictedEvents();
            await 批量处理事件点(预测轨迹点);
        }
    } 
    // 不支持事件合并的设备：降级处理
    else {
        await 绘画处理(移动事件);
    }
}