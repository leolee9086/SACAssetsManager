<template>
    <div @wheel="scaleListener" class=" fn__flex-column" style="max-height: 100%;" ref="root">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">

            <div class="fn__space fn__flex-1">
                <div v-if="everthingEnabled" style="color:green;float: left;overflow:visible">everthing已经连接</div>

            </div>
            <div class=" fn__flex ">

                <input v-model="everthingPort" style="box-sizing: border-box;width:100px;" :value="10000" type="number">

                <div class="fn__space fn__flex-1"></div>

                <input v-model="size" style="box-sizing: border-box;width: 200px;" :value="200"
                    class="b3-slider fn__block" max="1024" min="64" step="16" type="range">
                <div class="fn__space fn__flex-1"></div>

                <input v-if="!everthingEnabled" v-model="maxCount" style="box-sizing: border-box;width:100px;" :value="10000" type="number">
                <div class="fn__space fn__flex-1"></div>
                <div class="fn__flex">
                    <button @click="refreshPanel">刷新</button>
                </div>
                <div class="fn__space fn__flex-1"></div>
                <div class="fn__flex">
                    <input v-model="search" style="box-sizing: border-box;width:100px;">
                </div>
                <div class="fn__flex">
                    <button
                    @click.right.stop.prevent="()=>{filterColor=[];refreshPanel()}"
                    ref="palletButton"
                    @click.left="showPallet=!showPallet" :style="{padding:0,margin:0,width:24+'px',height:24+'px',backgroundColor:filterColor.length?`rgb(${filterColor.join(',')})`:''}">
                        <svg style="width:24px;height:24px;"><use xlink:href="#iconColorPannel"></use></svg>
                    </button>
                </div>
                <div class="grid__container" v-if="showPallet"
                 :style="`position:absolute;top:${palletButton.offsetTop+palletButton.offsetHeight+10}px;left:${palletButton.offsetLeft-100}px;width:200px;max-height:300px;background:rgba(0,0,0,0.5);height:300px;overflow:auto;z-index:10;`">
                    <template v-for="item in pallet">
                        <div 
                        @click.left="()=>{filterColor=item;showPallet=false;refreshPanel()}"
                        :style="{backgroundColor:`rgb(${item[0]},${item[1]},${item[2]})`,height:36+'px',width:36+'px',display:'inline-block',margin:'0 2px'}"></div>
                    </template>
                </div>
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <commonBreadCrumb @globChange="(e) => globSetting = e"></commonBreadCrumb>
        <div class=" fn__flex " style="align-items: center;">
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__space"></div>
        <div class="fn__flex-column fn__flex-1" @dragstart.stop="(e) => onDragStart(e, currentLayout)"
            style="width:100%;overflow: hidden;" @mousedown.left="startSelection" @click.left="endSelection"
            @click.right.stop="openMenu" @mousedup="endSelection" @mousemove="updateSelection" @drop="handlerDrop"
            @dragover.prevent>
            <assetsGridRbush
            :everthingEnabled="everthingEnabled"
            :everthingPort="everthingPort"
            @palletAdded="palletAdded"
            :globSetting="$realGlob" 
            v-if="showPanel && globSetting" 
            :maxCount="maxCount"
            @layoutCountTotal="(e)=>{layoutCountTotal=e}"
                @ready="size = 300" @layoutChange="handlerLayoutChange" @scrollTopChange="handlerScrollTopChange"
                :sorter="sorter" @layoutCount="(e) => { layoutCount.found = e }" :filterColor="filterColor"
                @layoutLoadedCount="(e) => { layoutCount.loaded = e }" :size="parseInt(size)"></assetsGridRbush>
            <div class="assetsStatusBar" style="min-height: 18px;">{{
                (layoutCountTotal+'个文件已遍历') + (layoutCount.found + layoutCount.loaded) + '个文件发现,' + layoutCount.loaded + '个文件已经加载' }}</div>
            <!--选择框的容器-->
            <div v-if="isSelecting" :style="selectionBoxStyle" class="selection-box"></div>
        </div>
    </div>
</template>
<script setup>
import { ref, inject, computed, nextTick, watch, toRef, onMounted } from 'vue'
import { diffColor } from '../../server/processors/color/Kmeans.js';
import assetsGridRbush from './assetsGridRbush.vue';
import { plugin } from 'runtime'
import _path from '../../polyfills/path.js'
//全局设置
const globSetting = ref({})
//最大显示数量
const maxCount = ref(10000)
const layoutCountTotal = ref(0)
const search = ref('')
const palletButton = ref(null)
const showPallet =ref(false)
const pallet = ref([])
const filterColor = ref([])
const palletAdded = (data)=>{
    pallet.value=Array.from(new Set(pallet.value.concat(
        data.map(
            item=>item.color
        ).filter(
            item=>{
                return item&&!pallet.value.find(item2=>item2[0]===item[0]&&item2[1]===item[1]&&item2[2]===item[2])}
        ))))
}
const everthingPort = ref(10000)

const $realGlob = computed(() => {
    let realGlob = {
        ...globSetting.value,
        maxCount: maxCount.value,
    }
    if (search.value) {
        realGlob.query = {
            $or: [
                //正则要使用字符串形式,所以需要转义
                { path: { '$regex': search.value } },
                { type: { '$eq': 'dir' } },

            ],
        }
    }
    if(filterColor.value[0]||filterColor.value[1]||filterColor.value[2]||JSON.stringify(filterColor.value)!=='[]'){
         
        realGlob.queryPro=realGlob.queryPro||{}
       realGlob.queryPro.color = filterColor.value
        //realGlob.color = filterColor.value
     }
    return realGlob
})
const everthingEnabled = ref(false)
watch([everthingPort,$realGlob],(e)=>{
    fetch(`http://localhost:${everthingPort.value}/?reg=${encodeURIComponent(search.value)}&json=1`).then(res=>res.json()).then(json=>{
        console.log(json)
        if(json){
            everthingEnabled.value=true
        }
    }).catch(e=>{
        everthingEnabled.value=false
    })
})
watch(
    () => $realGlob.value, () => {
        refreshPanel()
    }
)

const appData = toRef(inject('appData'))
//缩略图大小
const size = ref(200)
//最大显示数量
const root = ref('null')
const layoutCount = reactive({ found: 0, loaded: 0 })
let currentLayout = reactive({})
let currentLayoutOffsetTop = 0
let currentLayoutContainer
const showPanel = ref(true)
const refreshPanel = () => {
    showPanel.value = false
    layoutCount.found = 0
    layoutCount.loaded = 0
    layoutCountTotal.value = 0
    nextTick(() => {
        console.log(globSetting.value)
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
    if (event.key === 'Escape') {
        clearSelectionWithLayout()
    }
}
/***
* 选择相关逻辑
*/
import { clearSelectionWithLayout } from '../utils/selection.js'
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
const endSelection = (event) => {
    console.log(event.target)
    isSelecting.value = false;
    selectedItems.value = getSelectedItems(event);
    plugin.eventBus.emit('assets-select', selectedItems.value)
};
import { getSelectionStatus } from '../utils/selection.js'
const getSelectedItems = (event) => {
    return getSelectionStatus(event, root, currentLayout, currentLayoutOffsetTop, selectionBox.value, currentLayoutContainer)
};
/**
 * 拖放相关逻辑
 */
import { reactive } from '../../../static/vue.esm-browser.js';
import { onDragOver, onDragStartWithLayout, handlerDropWithTab } from '../utils/drag.js'
import CommonBreadCrumb from './common/breadCrumb/commonBreadCrumb.vue';
const onDragStart = async (event) => {
    onDragStartWithLayout(event, currentLayout)
}
plugin.eventBus.on('update-tag', (event) => {
    if (event.detail.label === appData.value.tab.data.tagLabel) {
        refreshPanel()
    }
})
const handlerDrop = (event) => {
    handlerDropWithTab(event, appData.value.tab)
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
<style scoped>
.grid__container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  /* Adjust the size as needed */
  gap: 0px 0px;
  /* Adjust the spacing between buttons */
}
</style>