import { ref } from "../../../../../../static/vue.esm-browser.js";
import { fromFilePath } from "../../../../../../src/utils/fromDeps/sharpInterface/useSharp/toSharp.js";
import { isSplitViewEnabled as 视图模式为裂像预览 } from "./useViewState.js";
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
export const 重置所有预览状态 = () => {
    previewState.value.lastFullRenderTime = 0
    previewState.value.lastAdjustmentTime = 0
    previewState.value.isAdjusting = false
    previewState.value.previewTimeout = null
    previewState.value.thumbnailCache = null
    previewState.value.pendingFullRender = false
    previewState.value.currentController = new AbortController()
    previewState.value.renderVersion = 0
}


export const 重置预览控制器 = () => {
    // 确保 controller 存在
    if (!previewState.value.currentController) {
        previewState.value.currentController = new AbortController();
    }
    // 取消当前正在进行的所有处理
    previewState.value.currentController.abort();
    previewState.value.currentController = new AbortController();
    return previewState.value.currentController;
};
export const 刷新并获取预览控制器信号 = () => {
    // 即取消之前的处理
    if (previewState.value.currentController) {
        previewState.value.currentController.abort();
    }
    previewState.value.currentController = new AbortController();
    const { signal } = previewState.value.currentController;
    return signal

}
export const 获取上次预览更新间隔 = () => {
    const now = performance.now();
    const timeSinceLastAdjustment = now - previewState.value.lastAdjustmentTime;
    return timeSinceLastAdjustment
}


export const 锁定预览更新 = () => {
    // 记录调整时
    previewState.value.lastAdjustmentTime = performance.now();
    previewState.value.isAdjusting = true;
}
export const 解锁预览更新 = () => {
    previewState.value.isAdjusting = false;

}
export const 清除预览更新定时器 = () => {
    if (previewState.value.previewTimeout) {
        clearTimeout(previewState.value.previewTimeout);
        previewState.value.previewTimeout = null;
    }
}
export const 设置预览更新定时器 = (callBack) => {
    previewState.value.previewTimeout = setTimeout(callBack, 300);
}



/**
 * 处理前后预览图片的更新
 */
export const originalImg = ref(null)
export const processedImg = ref(null)
export const 清理处理前后图像blob = () => {
    if (processedImg.value.src?.startsWith('blob:')) {
        URL.revokeObjectURL(processedImg.value.src);
    }
    if (originalImg.value?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(originalImg.value.src);
    }
}
export const 从路径更新原始预览图像 = async (图像路径) => {
    const 原始sharp对象 = await fromFilePath(图像路径)
    const 原始图像buffer = await 原始sharp对象.png().toBuffer()
    if (originalImg.value) {
        originalImg.value.src = URL.createObjectURL(
            new Blob([原始图像buffer], { type: 'image/png' })
        );
    }
}
export const 从sharp对象更新处理后预览图像 = async (sharpObj) => {
    const processedBuffer = await sharpObj.clone().png().toBuffer();
    const processedUrl = URL.createObjectURL(
        new Blob([processedBuffer], { type: 'image/png' })
    );
    processedImg.value.src = processedUrl;
}
export const 更新处理前后预览图像 = async (处理后sharp对象, 原始图像路径) => {
    清理处理前后图像blob()
    // 检查 DOM 引用是否存在
    if (!processedImg.value) {
        console.warn('processedImg reference not found');
        return;
    }
    从sharp对象更新处理后预览图像(处理后sharp对象)

    if(视图模式为裂像预览.value){
        try {
            从路径更新原始预览图像(原始图像路径)
        } catch (error) {
            console.error('生成原始图像预览失败:', error);
        }
    }else if (originalImg.value) {
        originalImg.value.src = '';
    }
}