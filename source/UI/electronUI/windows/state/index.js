import { computed, ref } from '../../../../../static/vue.esm-browser.js'
import { 柯里化, 反向柯里化 } from '../../../../utils/functions/currying.js';

export const previewState = ref({
    lastFullRenderTime: 0,
    lastAdjustmentTime: 0,
    isAdjusting: false,
    previewTimeout: null,
    thumbnailCache: null,
    pendingFullRender: false,
    currentController: new AbortController(),  // 确保初始化时就有 controller
    renderVersion: 0
});


export const 重置所有状态 = () => {
    previewState.value.lastFullRenderTime = 0
    previewState.value.lastAdjustmentTime = 0
    previewState.value.isAdjusting = false
    previewState.value.previewTimeout = null
    previewState.value.thumbnailCache = null
    previewState.value.pendingFullRender = false
    previewState.value.currentController = new AbortController()
    previewState.value.renderVersion = 0
}

export { 历史队列, 文件历史管理器 } from './globalHistory.js'


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



export const cropBox = ref(
    {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        maintainAspectRatio: false
    }
)
export const 裁剪框控制器 = {
    移动裁剪框: (x, y, width, height) => {
        cropBox.value.x = x
        cropBox.value.y = y
        cropBox.value.width = Math.max(50,width)
        cropBox.value.height = Math.max(50,height)
    },
    应用裁剪框: (裁剪框) => {
        cropBox.value.x = 裁剪框.x
        cropBox.value.y = 裁剪框.y
        cropBox.value.width = Math.max(50,裁剪框.width)
        cropBox.value.height = Math.max(50,裁剪框.height)
    },
    设置比例保持: (flag) => {
        cropBox.value.maintainAspectRatio = flag ? true : false
    },
    归零: () => {
        cropBox.value = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            maintainAspectRatio: false
        }
    }
}