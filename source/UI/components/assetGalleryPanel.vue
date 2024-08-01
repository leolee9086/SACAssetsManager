<template>
    <div @wheel="scaleListener"  class=" fn__flex-column" style="max-height: 100%;" ref="root">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1"></div>
            <div class=" fn__flex ">
                <input v-model="size" style="box-sizing: border-box;width: 200px;" :value="100"
                    class="b3-slider fn__block" max="1024" min="64" step="16" type="range">
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <DocBreadCrumb v-if="block_id || box" :block_id="block_id" :box="box"></DocBreadCrumb>
        <LocalBreadCrumb @globChange="(e) => globSetting = e" v-if="localPath" :localPath="localPath"></LocalBreadCrumb>
        <div class=" fn__flex " style="align-items: center;">
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__space"></div>
        <div class="fn__flex-column fn__flex-1" @dragstart.stop="(e)=>onDragStart(e,currentLayout)" style="width:100%;overflow: hidden;"
            @mousedown.left="startSelection" @click.left="endSelection" @click.right.stop="openMenu" @mousedup="endSelection"
            @mousemove="updateSelection" @drop="handlerDrop" 
            @dragover.prevent>
            <assetsGridRbush :globSetting=globSetting v-if="showPanel && globSetting" @ready="size = 300"
                @layoutChange="handlerLayoutChange" @scrollTopChange="handlerScrollTopChange" :sorter="sorter"
                @layoutCount="(e) => { layoutCount.found = e }" @layoutLoadedCount="(e) => { layoutCount.loaded = e }"
                :size="parseInt(size)"></assetsGridRbush>
            <div class="assetsStatusBar" style="min-height: 18px;">{{
                layoutCount.found + layoutCount.loaded + '个文件发现,' + layoutCount.loaded + '个文件已经加载' }}</div>
            <!--选择框的容器-->
            <div v-if="isSelecting" :style="selectionBoxStyle" class="selection-box"></div>
        </div>
    </div>
</template>
<script setup>
import { ref, inject, computed, nextTick, watch, toRef,onMounted } from 'vue'
import DocBreadCrumb from './docbreadCrumb.vue'
import LocalBreadCrumb from './localBreadCrumb.vue'
import assetsGridRbush from './assetsGridRbush.vue';
import { plugin } from 'runtime'
import _path from '../../polyfills/path.js'
const globSetting = ref({})
watch(
    () => globSetting.value, () => {
        refreshPanel()
    }
)
const path = _path.default
const appData = toRef(inject('appData'))
const { block_id, box, localPath } = appData.value.tab.data
const size = ref(100)
const root = ref('null')
const layoutCount = reactive({ found: 0, loaded: 0 })
let currentLayout = reactive({})
let currentLayoutOffsetTop = 0
let currentLayoutContainer
const showPanel = ref(true)
const refreshPanel = () => {
    showPanel.value = false
    nextTick(() => {
        showPanel.value = true
    })
}
const handlerLayoutChange = (data) => {
    currentLayout = data.layout
    currentLayoutContainer = data.element
}

const handlerScrollTopChange = (scrollTop) => {
    currentLayoutOffsetTop = scrollTop
}
/**
 * 缩放相关
 */
function scaleListener(event) {
    if (event.ctrlKey) {
        let value = parseInt(size.value)

        value -= event.deltaY / 10
        if (value < 100) {
            value = 100
        }
        if (value > 1024) {
            value = 1024
        }
        size.value = value
        event.preventDefault()
        event.stopPropagation()
    }
}
/**
 * 键盘相关逻辑
 */
 onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});
const handleKeyDown = (event) => {
    if(event.key === 'Escape'){
        clearSelection()
    }
}
/***
* 选择相关逻辑
*/
const isSelecting = ref(false);
const selectionBox = ref({ startX: 0, startY: 0, endX: 0, endY: 0 });
const selectedItems = ref([])
const startSelection = (event) => {
    isSelecting.value = true;
    selectionBox.value.startX = event.x;
    selectionBox.value.startY = event.y;
    selectionBox.value.endX = event.x;
    selectionBox.value.endY = event.y;
};

const updateSelection = (event) => {
    if (isSelecting.value) {
        selectionBox.value.endX = event.x;
        selectionBox.value.endY = event.y;
        selectedItems.value = getSelectedItems(event)
    }

};
const clearSelection = (event) => {
    currentLayout.layout.forEach(
        item => {
            item.selected = false
        }
    )
    plugin.eventBus.emit('assets-select',[])

}
const endSelection = (event) => {
    console.log(event.target)
    isSelecting.value = false;
    selectedItems.value = getSelectedItems(event);
    plugin.eventBus.emit('assets-select',selectedItems.value)
};

const getSelectedItems = (event) => {
    const galleryContainer = root.value.querySelector('.gallery_container')
    let result = []
    //处理单选
    let cardElement = event.target
    while (!cardElement.getAttribute('data-id')) {
        cardElement = cardElement.parentElement
        if (cardElement === galleryContainer) {
            break
        }
    }
    if (cardElement.getAttribute('data-id')) {
        result.push(currentLayout.layout.find(item => { return item.data && item.data.id === cardElement.getAttribute('data-id') }))
    }
    //处理多选
    const layoutRect = galleryContainer.getBoundingClientRect()

    const { startX, startY, endX, endY } = selectionBox.value;
    const minX = Math.min(startX, endX) - layoutRect.x - currentLayoutContainer.style.paddingLeft;
    const maxX = Math.max(startX, endX) - layoutRect.x - currentLayoutContainer.style.paddingLeft;
    const minY = Math.min(startY, endY) + currentLayoutOffsetTop - layoutRect.y;
    const maxY = Math.max(startY, endY) + currentLayoutOffsetTop - layoutRect.y;
    result = result.concat(currentLayout.searchByRect({
        minX,
        minY,
        maxY,
        maxX,
    }))
    result[0] && result.forEach(data => {
        if (event && event.shiftKey) {
            data.selected = undefined
        }else{
            data.selected = true
        }
    });

    return currentLayout.layout.filter(item => item.selected && item.data).map(item => item.data)
};
/**
 * 拖放相关逻辑
 */
import { imgeWithConut } from '../utils/decorations/iconGenerator.js'
import { reactive } from '../../../static/vue.esm-browser.js';
import { queryTags, saveTags } from '../../data/tags.js';
import { onDragOver,onDragStartWithLayout ,handlerDropWithTab } from '../utils/drag.js'
const onDragStart = async(event)=>{
    onDragStartWithLayout(event,currentLayout)
}


plugin.eventBus.on('update-tag',(event)=>{
    console.log('update-tag',event.detail)
    if(event.detail.label === appData.value.tab.data.tagLabel){
        refreshPanel()
    }
})
const handlerDrop = (event) => {
    handlerDropWithTab(event,appData.value.tab)
};

const selectionBoxStyle = computed(() => {
    const { startX, startY, endX, endY } = selectionBox.value;
    return {
        position: 'fixed',
        outline: '1px dashed #000',
        backgroundColor: 'rgba(0, 0, 255, 0.2)',
        left: `${Math.min(startX, endX)}px`,
        top: `${Math.min(startY, endY)}px`,
        width: `${Math.abs(startX - endX)}px`,
        height: `${Math.abs(startY - endY)}px`,
        pointerEvents: 'none'

    };
});
const sorter = ref({
    fn: (a, b) => {
        return -(a.data.mtimems - b.data.mtimems)
    }
})
const openMenu = (event) => {
    let assets = currentLayout.layout.filter(item => item.selected).map(item => item.data).filter(item => item)
    assets[0] && plugin.eventBus.emit(plugin.events.资源界面项目右键, { event, assets }, { stack: true })
}
</script>