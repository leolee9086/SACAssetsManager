import { computed, effect, ref } from '../../../../../../static/vue.esm-browser.js'
import { fromBuffer } from '../../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';
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
export {effectStack,效果堆栈管理器} from './effectStack.js'
export  {cropBox,裁剪框控制器} from './cropBoxController.js'



