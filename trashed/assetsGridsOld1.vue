<template>
    <div class=" fn__flex-column" style="max-height: 100%;">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1"></div>
            <div class=" fn__flex ">
                <input v-model="size" @change="() => { setupScrollListener() }"
                    style="box-sizing: border-box;width: 200px;" value="100" class="b3-slider fn__block" max="1024"
                    min="64" step="1" type="range">
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <DocBreadCrumb v-if="block_id || box" :block_id="block_id" :box="box"></DocBreadCrumb>
        <div class=" fn__flex " style="align-items: center;">
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__space "></div>
        <div class="fn__flex-column fn__flex-1" style="width:100%">
            <div class="fn__flex-column fn__flex-1" ref="gridsContainer" style="width:100%">
                <div class="fn__flex-1" @mousedown="startSelection" @mousemove="updateSelection" @mouseup="endSelection"
                    :style="`overflow-x: hidden;min-height:${TotalRows * (parseInt(size) + 36 + 10)}px;`">
                    <div class="fn__flex-column " style="width:100% ;min-height:0px">
                        <div class="masonry" @scroll.stop.prevent="setupScrollListener" :style="`top:16px;left:0;width: 100%; display: grid; 
                            grid-template-columns: repeat(auto-fill, minmax(${size}px, 1fr));
                            grid-template-rows: repeat(auto-fill, minmax(${size}px));
                            grid-auto-flow: dense;
                            grid-gap: 10px;transform: translate(0,${paddingTop}px);
                            align-items:end
                            `">
                            <template v-for="(asset, i) in reIndexedItems" :key="`iframe-${asset.id}`">
                                <div v-if="currentStartIndex <= i && i <= currentEndIndex" @mousedown.right.stop="" @mousemove="updateSelection"
                                    @click.stop.prevent.capture="(event) => selectedItems.push(asset)"
                                    @click.right.stop.prevent.capture="(event) => 打开附件右键菜单(event, selectedItems[0] ? selectedItems : [asset])"
                                    class="ariaLabel" :aria-label="asset.path" :id="`div-${asset.index}`"
                                    :data-index="asset.index" :style="{
                    width: `${parseInt(size)}px`,
                    position: 'relative',
                    bottom: `${asset.offsetBottom}px`,
                    height: `${parseInt(size) + 36}px`,
                    //backgroundColor: 'var(--b3-theme-background-light)',
                    borderRadius: `${parseInt(size) / 12}px`,

                }">
                                    <div :style="`
                                        position:absolute;width:${parseInt(size)}px;
                                        height: ${asset.height || parseInt(size) + 36}px;
                                        border-radius:${parseInt(size) / 12}px;
                                        background-color:var(--b3-theme-background-light)`

                    ">
                                        <div
                                            :style='`position:absolute;top:${parseInt(size) / 24}px;left:${parseInt(size) / 24}px;background:rgba(0,0,0,0.5);color:white;padding:2px;font-size:10px;height:1em`'>
                                            {{ asset.index + asset.path.split('.').pop() + asset.columnPosition.col }}
                                        </div>
                                    </div>
                                    <div v-if="currentStartIndex <= asset.index && asset.index <= currentEndIndex"
                                        :style="`
                                        min-width: 100%;width:100% ;
                                        height: ${asset.height ||parseInt(size) + 36}px;
                                        border-radius:${size / 12}px;
                                        border: ${selectedItems.indexOf(asset) >= 0 ? '1px solid red' : ''},

                                        `">
                                        <iframe v-if="asset.path" :id="`frame-${asset.path}`" width="100%"
                                            :style="`border-radius:${size / 12}px;border: none`" seamless="true"
                                            loading="eager" :data-asset='`${asset.path}`' :data-path="`${asset.path}`"
                                            :onload="(e) => {
                    asset.iframe = e.target
                    e.target.asset = asset
                    e.target.contentDocument.write(asset.frameContent)
                }">
                                        </iframe>
                                        <div style="line-height:18px;font-size:10px">
                                            {{ asset.cleanPath }}
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
const currentEndIndex = ref(100)
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
                cleanPath: item.id,
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
                (item, i) => {
                    item.index = i;
                    item.frameContent = 创建思源附件预览页面内容(item, true);
                    item.height = parseInt(size.value) + 36
                    item.oldHeight = item.height

                    return item
                }
            )
            nextTick(
                () => {
                    let { clientWidth } = gridsContainer.value
                    const displayColumns = Math.floor(clientWidth / (parseInt(size.value) + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
                    TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) + 1//初始化容器高度
                    setupScrollListener()
                    gridsContainer.value.addEventListener('wheel', scaleListener);
                    gridsContainer.value.addEventListener('scroll', setupScrollListener);

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
    }
}

const paddingTop = ref(0)
/**
 * 这个方式在网格下是性能比较高的
 */
let updating = false

function isInview(asset) {
    return true
}
let columnElements
let columnHeights = []
let reIndexedItems = ref([])
let oldClientWidth
let oldDisplayColumns
// 初始化列数据结构
function initializeColumnElements(displayColumns) {

    columnElements = columnElements || Array.from({ length: displayColumns }, () => []);
    columnHeights = columnElements.map((item, i) => { return 0 })

}
function setupLayoutOffset(asset, flag = 'setup') {
    if (!asset) {
        return
    }
    let { clientWidth } = gridsContainer.value;
    const computedStyle = getComputedStyle(gridsContainer.value.querySelector('.masonry'));
    const displayColumns = parseInt(computedStyle.getPropertyValue('grid-template-columns').split(' ').length);
    asset.offsetBottom = asset.offsetBottom || 0;
    asset.height = asset.height || (parseInt(size.value) + 36);
    if (!columnElements || clientWidth !== oldClientWidth) {
        columnElements = undefined
        columnHeights = []
        initializeColumnElements(displayColumns);
    }
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    if (!asset.columnPosition) {
        let column = columnElements[shortestColumnIndex]
        column.push(asset)
        reIndexedItems.value.push(asset)
        asset.reIndexedIndex = reIndexedItems.value.length - 1
        columnHeights[shortestColumnIndex] = (columnHeights[shortestColumnIndex] || 0) + asset.height + 10
        asset.column = column
        asset.columnPosition = { col: shortestColumnIndex, index: column.length - 1 }
    } else {
        columnHeights[asset.columnPosition.col] += asset.height - (asset.oldHeight || 0)
        asset.oldHeight = asset.height
    }
    asset.colPre = asset.column[asset.columnPosition.index - 1];
    asset.offsetBottom = (asset.height || parseInt(size.value) + 36) - parseInt(size.value) + parseInt(size.value) - (asset.height || parseInt(size.value));
    if (asset.colPre) {
        asset.offsetBottom += asset.colPre.offsetBottom - asset.colPre.height + parseInt(size.value);
    }
    if (asset.columnPosition.index + 1 < asset.column.length) {
        asset.colNext = asset.column[asset.columnPosition.index + 1];
        setupLayoutOffset(asset.colNext, flag)
    } else {
        setupLayoutOffset(asset.indexNext)
    }
}
let dataChunk = ref([])
let oldScrollTop=0
function setupScrollListener() {
    let { clientWidth,scrollTop } = gridsContainer.value;
    let scrollDelta = scrollTop-oldScrollTop
    paddingTop.value-=(scrollTop-oldScrollTop)/2
    oldScrollTop=scrollTop
    const computedStyle = getComputedStyle(gridsContainer.value.querySelector('.masonry'));
    const displayColumns = parseInt(computedStyle.getPropertyValue('grid-template-columns').split(' ').length);
    if (clientWidth !== oldClientWidth || displayColumns !== oldDisplayColumns) {
        oldClientWidth = clientWidth
        oldDisplayColumns = displayColumns
        reIndexedItems.value = []
        columnElements = undefined
        columnHeights = []
        initializeColumnElements(displayColumns);
        nextTick(() => {
            dataChunk.value = assetsMetas.value.slice(0, currentEndIndex.value).map(
                (item, i) => {
                    let data = JSON.parse(JSON.stringify(item))
                    data.updateLayoutOffsetRect = (rect) => {
                        assetsMetas.value[data.index].rect = rect
                        nextTick(
                            () => {
                                setupLayoutOffset(data)
                                setupScrollListener(true)
                            }
                        )
                    }
                    if (data.rect) {
                        data.height = (data.height * (parseInt(size.value) + 36)) / rect.width || rect.width;
                    }
                    return data
                }
            )
            for (let i = 0; i < dataChunk.value.length; i++) {
                let asset = dataChunk.value[i]
                asset && (asset.indexNext = dataChunk[i + 1])
                dataChunk[i + 1] && (dataChunk[i + 1].indexPre = asset)
                setupLayoutOffset(asset)
            }
            nextTick(
                () => {
                    gridsContainer.value.scrollTop = gridsContainer.value.querySelector("iframe").getBoundingClientRect().top
                    reIndexedItems.value.forEach(async (asset) => {

                        setupLayoutOffset(asset)
                    })


                }
            )
        }
        )
    } else {
        let oldEnd = currentEndIndex.value
    
        if(scrollDelta>0){
           currentStartIndex.value+=displayColumns
            currentEndIndex.value+=displayColumns
        }
        assetsMetas.value.slice(oldEnd, currentEndIndex.value).forEach(
            item=>{
                let data = JSON.parse(JSON.stringify(item))
                    data.updateLayoutOffsetRect = (rect) => {
                        assetsMetas.value[data.index].rect = rect
                        nextTick(
                            () => {
                                setupLayoutOffset(data)
                                setupScrollListener(true)
                            }
                        )
                    }
                    if (data.rect) {
                        data.height = (data.height * (parseInt(size.value) + 36)) / rect.width || rect.width;
                    }
                    
                    setupLayoutOffset(data)
            }
        )
        reIndexedItems.value.forEach(async (asset) => {
            setupLayoutOffset(asset)
        })
    }
}

// 初始化列数据结构



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