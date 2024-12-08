import { ref,computed } from "../../../../../../static/vue.esm-browser.js"
import { isViewModeLocked } from "./editorState.js"

export const 构建编辑器模式切换器 = (编辑器状态对象,模式名)=>{
    return ()=>{
        编辑器状态对象.value.activeMode = 模式名
    }
}
export const 构建视图模式切换器 = (视图状态对象,模式名)=>{
    return ()=>{
        视图状态对象.value.mode = 模式名
    }
}
export const viewState =  ref({
    mode: 'split', // 'split' | 'processed' | 'original'
    options: {
        split: {
            position: 50,
            isDragging: false
        }
    }
});
export const 切换裂像预览与仅结果预览=()=>{
    if(isViewModeLocked.value) return
    viewState.value.mode = viewState.value.mode === 'split' ? 'processed' : 'split'
}
export const isSplitViewEnabled = computed(() => viewState.value.mode === 'split')
export const isProcessedOnlyView = computed(() => viewState.value.mode === 'processed')
