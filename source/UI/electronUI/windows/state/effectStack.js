import { ref } from "../../../../../static/vue.esm-browser.js"
/**
 * 效果管理
 */
export const effectStack = ref([])
export const 效果堆栈管理器 = {
    清空: () => {
        effectStack.value = []
    },
    重载: async (回调函数) => {
        let oldEffectStack = effectStack.value
        效果堆栈管理器.清空()
        await 回调函数()
        effectStack.value = oldEffectStack
    },
    构建处理函数: () => {
        return async (sharpInstance) => {
            let processed = sharpInstance;
            for await (const effect of effectStack.value) {
                if (effect.enabled) {
                    const params = effect.params.map(item => item.value);
                    if (effect.needClone) {
                        const buffer = await processed.toBuffer();
                        processed = fromBuffer(buffer);
                    }
                    try {
                        processed = await effect.处理函数(processed, ...params);
                    } catch (e) {
                        console.error('果处理失败:', e);
                    }
                }
            }
            return processed;
        };
    }
}