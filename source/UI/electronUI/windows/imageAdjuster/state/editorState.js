import { ref,computed } from "../../../../../../static/vue.esm-browser.js";
export const editorState =  ref({
    activeMode: null, // 'perspective' | 'resize' | 'stack' | 'edit' | 'crop' | null
    geometry: {
        hasChanges: false,
        perspective: false,
        resize: false,
        stack: false
    },
    view: {
        mode: 'split', // 'split' | 'processed' | 'original'
        splitPosition: 50
    }
})
export const isViewModeLocked=computed(() => 判定是否需要锁定视图状态(editorState))
const 判定是否需要锁定视图状态 = (editorState) => {
    ['perspective', 'resize', 'crop'].includes(editorState.value.activeMode)
}
export const 切换编辑器到空闲模式 = ()=>{
    editorState.value.activeMode = null
}
// 添加几何工具可用性的计算属性
export const canUseGeometryTools = computed(() => {
    return ['perspective', 'crop'].includes(editorState.value.activeMode)
})