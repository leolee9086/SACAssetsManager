<template>
    <div class=" fn__flex-column" style="max-height: 100%;">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1"></div>
            <div class=" fn__flex ">
                <input v-model="size" @change="()=>{setupScrollListener();setupScrollListener()}" style="box-sizing: border-box;width: 200px;"
                    value="100" class="b3-slider fn__block" max="1024" min="64" step="1" type="range">
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <DocBreadCrumb v-if="block_id || box" :block_id="block_id" :box="box"></DocBreadCrumb>
        <div class=" fn__flex " style="align-items: center;">
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__space "></div>
        <div class="fn__flex-column fn__flex-1" style="width:100%">
            <div class="fn__flex-column fn__flex-1" style="width:100%">
                <div class="fn__flex-1" @mousedown="startSelection" @mousemove="updateSelection" @mouseup="endSelection"
                    @scroll.stop.prevent ref="gridsContainer" style="overflow-x: hidden;">
                    <div class="fn__flex-column " style="width:100% ;min-height:0px">
                        <div @scroll.stop.prevent="setupScrollListener"
                            :style="`top:16px;left:0;width: 100%; display: grid; 
                            grid-template-columns: repeat(auto-fill, minmax(${size}px, 1fr));
                            grid-template-rows: repeat(auto-fill, minmax(${parseInt(size) + 36}px, 1fr)); 
                            grid-gap: 10px;transform: translate(0,${paddingTop}px);height:${TotalRows * (parseInt(size) + 36 + 10)}px;`">
                            <template v-for="(asset, i) in assetsMetas.slice(visiAbleIndex, currentEndIndex)"
                                :key="`iframe-${asset.id}`">
                                <div @mousedown.right.stop="" @mousemove="updateSelection"
                                    @click.stop.prevent.capture="(event) => selectedItems.push(asset)"
                                    @click.right.stop.prevent.capture="(event) => 打开附件右键菜单(event, selectedItems[0] ? selectedItems : [asset])"
                                    class="ariaLabel" :aria-label="asset.path" :id="`div-${asset.index}`"
                                    :data-index="asset.index" :style="{
                    /*width: `${parseInt(size)}px`,*/
                    height: `${parseInt(size) + 36}px`,
                    backgroundColor: 'var(--b3-theme-background-light)',
                    borderRadius: `${parseInt(size) / 12}px`,
                    border: selectedItems.indexOf(asset) >= 0 ? '1px solid red' : ''
                }">
                                    <div
                                        :style="`position:absolute;width:${parseInt(size)}px;height: ${parseInt(size)}px;border-radius:${parseInt(size) / 12}px`">
                                        <div
                                            :style='`position:absolute;top:${parseInt(size) / 24}px;left:${parseInt(size) / 24}px;background:rgba(0,0,0,0.5);color:white;padding:2px;font-size:10px;height:1em`'>
                                            {{ asset.path.split('.').pop() }}
                                        </div>
                                    </div>


                                    <div v-if="currentStartIndex <= asset.index && asset.index <= currentEndIndex"
                                        :style="`min-width: 100%;width:100% ;height: ${parseInt(size) + 36}px;border-radius:${size / 12}px`">
                                        <iframe :id="`frame-${asset.path}`" width="100%" :height="parseInt(size)"
                                            :style="`border-radius:${size / 12}px;border: none`" seamless="true"
                                            loading="eager" :data-asset='`${asset.path}`' :data-path="`${asset.path}`"
                                            :onload="(e) => {
                    // e.target.contentDocument.write(asset.frameContent)
                }" :src="创建思源附件预览页面内容()">
                                        </iframe>
                                        <div style="line-height:18px;font-size:10px">
                                            {{ asset.cleanPath }}
                                        </div>
                                        <div>
                                        </div>
                                    </div>

                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
            <!--选择框的容器-->
            <div v-if="isSelecting" :style="selectionBoxStyle" class="selection-box"></div>
        </div>
    </div>
</template>
<script setup>
import DocBreadCrumb from './docbreadCrumb.vue'
import { 获取tab附件数据 } from "../../data/siyuanAssets.js"
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"
import { ref, onMounted, inject, computed, toRef, nextTick } from 'vue'
import { 打开附件右键菜单 } from '../../events/assets.js'
const assetsMetas = ref([])
const gridsContainer = ref(null)
const currentStartIndex = ref(0)
const currentEndIndex = ref(10)
const TotalRows = ref(10)
const size = ref(100)
const appData = toRef(inject('appData'))
const block_id = computed(
    () => {
        return appData && appData.value && appData.value.tab.data.block_id ? appData.value.tab.data.block_id : ''
    }
)
const box = computed(
    () => {
        return appData && appData.value && appData.value.tab.data.box ? appData.value.tab.data.box : ''
    }
)
async function fetchLinks(tab) {
    let query = "select * from spans  limit 102400"
    if (tab.data && tab.data.block_id) {
        query = `select * from spans where root_id like '%${tab.data.block_id}%' limit 102400`
    } else if (tab.data.box) {
        query = `select * from spans where box = '${tab.data.box}' limit 102400`
    }

    const json = await fetch('/api/query/sql', {
        method: "POST",
        body: JSON.stringify({
            stmt: query// 获取前300个
        })
    }).then(data => data.json())

    let data = await json.data.map(
        (item, i) => {
            return {
                ...item,
                format: item.type,
                path: `data:text/markdown;charset=utf-8,${item.markdown}`,
                cleanPath: item.id
            }
        }
    ).filter(
        item => !(item.markdown.indexOf('](assets') >= 0) && item.format === 'textmark a'
    )
    return data
}
onMounted(
    async () => {
        let assets = await 获取tab附件数据(
            undefined,
            102400
        );
        let links = await fetchLinks(appData.value.tab);
        (() => {
            assetsMetas.value = assets.map(
                (item, i) => { item.index = i; item.frameContent = 创建思源附件预览页面内容(); return item }
            )
            gridsContainer.value.addEventListener('wheel', scaleListener);
            gridsContainer.value.addEventListener('scroll', setupScrollListener);

            nextTick(
                () => {
                    let { clientWidth } = gridsContainer.value
                    const displayColumns = Math.floor(clientWidth / (parseInt(size.value) + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
                    TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) + 1//初始化容器高度
                }
            )

        })()
    }
)
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
        
        setupScrollListener()
        setupScrollListener()

    }
}

const paddingTop = ref(0)
const visiAbleIndex = ref(0)
let scrollStart = 0
let lastVisiable = 0
/**
 * 这个方式在网格下是性能比较高的
 */
let updating = false
async function setupScrollListener() {
    if (updating) {
        return
    }
    updating = true
    let { scrollTop, clientHeight, scrollHeight, clientWidth } = gridsContainer.value
    const displayColumns = Math.floor(clientWidth / (parseInt(size.value) + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
    const displayRows = Math.floor(clientHeight / (parseInt(size.value) + 36 + 10)); // 计算列数
    let startRow = Math.floor(scrollTop / ((parseInt(size.value) + 36 + 10)))
    currentStartIndex.value = Math.max(0, (startRow - 2) * displayColumns)
    visiAbleIndex.value = Math.floor(Math.floor(currentStartIndex.value / 1000) * 1000 / displayColumns) * displayColumns
    if (lastVisiable - visiAbleIndex.value >= 980 || lastVisiable - visiAbleIndex.value <= -980) {
        scrollStart = Math.floor(currentStartIndex.value / 1000) * 1000 / displayColumns * (parseInt(size.value) + 36 + 10)
        currentStartIndex.value = visiAbleIndex.value
        lastVisiable = visiAbleIndex.value
    }
    paddingTop.value = (0 - (visiAbleIndex.value / displayColumns)) * (parseInt(size.value) + 36 + 10) + scrollStart * 2
    currentEndIndex.value = Math.min(assetsMetas.value.length, currentStartIndex.value + Math.max(displayColumns * displayRows * 3, 50))
    TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) * (assetsMetas.value.length - visiAbleIndex.value) / assetsMetas.value.length
    updating = false
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
        selectedItems.value = getSelectedItems()

    }

};

const endSelection = () => {
    isSelecting.value = false;
    selectedItems.value = getSelectedItems();
};

const getSelectedItems = () => {
    const { startX, startY, endX, endY } = selectionBox.value;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    return assetsMetas.value.filter(asset => {
        const assetElement = document.getElementById(`frame-${asset.path}`);
        if (!assetElement) return false;
        const rect = assetElement.getBoundingClientRect();
        return rect.left < maxX && rect.right > minX && rect.top < maxY && rect.bottom > minY;
    });
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

</script>