<template>
    <div class=" fn__flex-column" style="max-height: 100%;">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1"></div>

            <div class=" fn__flex ">
                <input v-model="size" @change="setupScrollListener" style="box-sizing: border-box;width: 200px;"
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

                <div class="fn__flex-1"
                @mousedown="startSelection"
                        @mousemove="updateSelection" 
                        @mouseup="endSelection"

                @scroll.stop.prevent ref="gridsContainer" 
                     style="overflow-x: hidden;">

                    <div class="fn__flex-column " style="width:100% ;min-height:0px">
                        <div @scroll.stop.prevent="setupScrollListener"

                            :style="`top:16px;left:0;width: 100%; display: grid; 
                            grid-template-columns: repeat(auto-fill, minmax(${size}px, 1fr));
                            grid-template-rows: repeat(auto-fill, minmax(${parseInt(size) + 36}px, 1fr)); 
                            grid-gap: 10px;transform: translate(0,${paddingTop}px);height:${TotalRows * (parseInt(size) + 36 + 10)}px;`">
                            <template v-for="(asset, i) in assetsMetas.slice(visiAbleIndex, currentEndIndex)"
                                :key="`iframe-${asset.id}`">
                                <div @mousedown.right.stop="" 
                                    @mousemove="updateSelection" 
                                    @click.stop.prevent.capture="(event)=>selectedItems.push(asset)"
                                    @click.right.stop.prevent.capture="(event) => 打开附件右键菜单(event, selectedItems[0]?selectedItems:[asset])" class="ariaLabel"
                                    :aria-label="asset.path" :id="`div-${asset.index}`" :data-index="asset.index"
                                    :style="{
                    /*width: `${parseInt(size)}px`,*/
                    height: `${parseInt(size) + 36}px`,
                    backgroundColor: 'var(--b3-theme-background-light)',
                    borderRadius: `${parseInt(size) / 12}px`,
                    border: selectedItems.indexOf(asset) >= 0 ? '1px solid red' : ''
                }">
                                                    <div
                                        :style="`position:absolute;width:${parseInt(size)}px;height: ${parseInt(size) }px;border-radius:${parseInt(size) / 12}px`">
                                        <div
                                            :style='`position:absolute;top:${parseInt(size) / 24}px;left:${parseInt(size) / 24}px;background:rgba(0,0,0,0.5);color:white;padding:2px;font-size:10px;height:1em`'>
                                            {{asset.path.split('.').pop() }}
                                        </div>
                                    </div>


                                    <div v-if="currentStartIndex <= asset.index && asset.index <= currentEndIndex"
                                        :style="`min-width: 100%;width:100% ;height: ${parseInt(size) + 36}px;border-radius:${size / 12}px`">
                                        <iframe :id="`frame-${asset.path}`" width="100%" :height="parseInt(size)"
                                            :style="`border-radius:${size / 12}px;border: none`"
                                            :data-asset='`${asset.path}`' :data-path="`${asset.path}`"
                                            :onload="(e)=>{
                                                e.target.contentDocument.write(asset.frameContent)
                                            }"
                                            src="about:blank"
                                            >
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
            <div v-if="isSelecting" :style="selectionBoxStyle" class="selection-box"></div>

        </div>
    </div>
</template>
<script setup>
import DocBreadCrumb from './docbreadCrumb.vue'

import { ref, onMounted, inject, computed, toRef, nextTick } from 'vue'
import fs from '../../polyfills/fs.js'
import { plugin } from 'runtime'
//import {智能防抖} from '../../utils/functionTools.js'
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
function cleanAssetPath(assetPath) {
    return assetPath && assetPath.split('/').pop().replace(/-\d{14}-[a-z0-9]{7}/, '');

    return assetPath&&assetPath.split('/').pop().replace(/\/\d{14}-[a-z0-9]{7}\./, '/');
}
const box = computed(
    () => {
        return appData && appData.value && appData.value.tab.data.box ? appData.value.tab.data.box : ''
    }
)

function 打开附件右键菜单(event, assets) {
    console.log(event, assets)
    plugin.eventBus.emit('rightclick-galleryitem', { event, assets })
}
async function fetchAssets(tab, limit, offset) {
    let query = `select * from assets limit ${limit || 100} offset ${offset || 0} `
     if (tab.data && tab.data.block_id) {
         query = `select * from assets where docpath like '%${tab.data.block_id}%' limit ${limit||100} offset ${offset||0}  `
     } else if (tab.data.box) {
         query = `select * from assets where box = '${tab.data.box}' limit ${limit||100} offset ${offset||0}  `
 
     }
    const json = await fetch('/api/query/sql', {
        method: "POST",
        body: JSON.stringify({
            stmt: query// 获取前300个
        })
    })
        .then(data => data.json())
    let mock = await json.data
    let data = mock.map(
        (item, i) => {
            return {
                index: i,
                format: item.path.split('.').pop(),
                cleanPath:cleanAssetPath(item.path),
                ...item
            }
        }
    )
    return data


}
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
                cleanPath:item.id
            }
        }
    ).filter(
        item => !(item.markdown.indexOf('](assets') >= 0) && item.format === 'textmark a'
    )
    return data
}
const chunkedAssets = ref({})
onMounted(
    async () => {

        let assets = await fetchAssets(appData.value.tab, 102400);
        let links = await fetchLinks(appData.value.tab);
        (() => {
            assetsMetas.value = assets.map(
                (item, i) => { item.index = i; return item }
            ) 
            assetsMetas.value = JSON.parse(JSON.stringify(assets.concat(links).map(
                (item, i) => { item.index = i;item.frameContent=createIframes(); return item }))
            )
            chunkedAssets.value = assetsMetas.value.slice(0, 10)
            gridsContainer.value.addEventListener('wheel', scaleListener);
            gridsContainer.value.addEventListener('scroll', setupScrollListener);
           
            nextTick(
                () => {
                    let { scrollTop, clientHeight, scrollHeight, clientWidth } = gridsContainer.value
                    console.log(scrollHeight)
                    const displayColumns = Math.floor(clientWidth / (parseInt(size.value) + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
                    TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) + 1

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
function genSrc(asset) {
    return `http://127.0.0.1/thumbnail/?path=${asset.path}`
}
let imageHtmlContent
function createIframes(asset) {
    const HtmlContent = imageHtmlContent || fs.readFileSync(`/data/plugins/SACAssetsManager/source/previewers/common.html`)
    imageHtmlContent = HtmlContent
    return imageHtmlContent
    const encodedHtmlContent = encodeURIComponent(imageHtmlContent);
    return `data:text/html;charset=utf-8,${encodedHtmlContent}`;
}
const paddingTop = ref(0)
let lastCall = 0
async function $setupScrollListener() {
    if ((Date.now() - lastCall) <= 300) {
        return;
    }
    lastCall = Date.now();
    let { scrollTop, clientHeight, scrollHeight, clientWidth } = gridsContainer.value
    const displayColumns = Math.floor(clientWidth / (parseInt(size.value) + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
    const displayRows = Math.floor(clientHeight / (parseInt(size.value) + 10)); // 计算列数
    scrollTop += Math.floor(currentStartIndex.value % displayColumns) * (parseInt(size.value) + 10)
    console.log(scrollTop, gridsContainer.value.scrollTop)
    TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) + 1
    const totalVisibleItems = displayColumns * displayRows;
    const startRow = scrollTop / (parseInt(size.value) + 10) - 1
    currentStartIndex.value = Math.max(startRow * displayColumns, 0)
    currentEndIndex.value = currentStartIndex.value + totalVisibleItems * 3
}


const visiAbleIndex = ref(0)
let scrollStart = 0
let lastVisiable = 0
async function setupScrollListener() {
    let { scrollTop, clientHeight, scrollHeight, clientWidth } = gridsContainer.value
    const displayColumns = Math.floor(clientWidth / (parseInt(size.value) + 10)); // 计算行数，假设每个iframe高度为100px，间隔为10px
    const displayRows = Math.floor(clientHeight / (parseInt(size.value) + 36 + 10)); // 计算列数
    let startRow = scrollTop / ((parseInt(size.value) + 36 + 10))
    currentStartIndex.value = Math.max(0, (startRow - 1) * displayColumns)
    visiAbleIndex.value = Math.floor(Math.floor(currentStartIndex.value / 300) * 300 / displayColumns) * displayColumns
    if (lastVisiable - visiAbleIndex.value >= 280 || lastVisiable - visiAbleIndex.value <= -280) {
        scrollStart = Math.floor(currentStartIndex.value / 300) * 300 / displayColumns * (parseInt(size.value) + 36 + 10)
        currentStartIndex.value = visiAbleIndex.value
        lastVisiable = visiAbleIndex.value
    }
    paddingTop.value = (0 - (visiAbleIndex.value / displayColumns)) * (parseInt(size.value) + 36 + 10) + scrollStart * 2
    currentEndIndex.value = Math.min(assetsMetas.value.length, currentStartIndex.value + Math.max(displayColumns * displayRows * 3, 50))
    TotalRows.value = Math.floor(assetsMetas.value.length / displayColumns) * (assetsMetas.value.length - currentEndIndex.value) / assetsMetas.value.length

}
async function __setupScrollListener(event) {
    if ((Date.now() - lastCall) <= 5 * assetsMetas.legnth) {
        lastCall = Date.now();

        return;
    }
    lastCall = Date.now();

    const { top, bottom } = gridsContainer.value.getBoundingClientRect();
    const columns = Math.floor(gridsContainer.value.clientWidth / (size.value + 10));
    currentStartIndex.value = binarySearchStartIndex(top, size, columns);
    currentEndIndex.value = binarySearchEndIndex(bottom, size, columns);
    console.log(currentStartIndex.value, currentEndIndex.value)
}

function computGirdRect(index) {
    const { top: rootTop, left: rootLeft, width, height } = gridsContainer.value.getBoundingClientRect();
    const sizeNumber = parseInt(size.value)
    const gap = 10
    const displayColumns = Math.floor(width / (sizeNumber + gap)); // 计算行数，假设每个iframe高度为100px，间隔为10px
    const displayRows = Math.floor(height / (sizeNumber + gap)); // 计算列数
    const row = Math.floor(index / displayColumns) - 1
    const column = index % displayColumns - 1

    let rect = {
        top: rootTop + row * (sizeNumber + gap),
        left: rootLeft + column * (sizeNumber + gap),
        bottom: rootTop + row * (sizeNumber + gap) + sizeNumber,
        right: rootLeft + column * (sizeNumber + gap) + sizeNumber
    }
    return rect
}
function binarySearchStartIndex(top, size, columns) {
    let low = 0;
    let high = assetsMetas.value.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const asset = assetsMetas.value[mid];
        if (!asset.element) {
            asset.element = document.getElementById(`div-${asset.index}`);
        }
        const rect = computGirdRect(mid);
        console.log(rect, asset.element && asset.element.getBoundingClientRect())
        if (rect.bottom > top - (size.value + 10) * 3) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return low;
}
function binarySearchEndIndex(bottom, size, columns) {
    let low = currentStartIndex.value;
    let high = assetsMetas.value.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const asset = assetsMetas.value[mid];
        if (!asset.element) {
            asset.element = document.getElementById(`div-${asset.index}`);
        }
        const rect = computGirdRect(mid);
        if (rect.top > bottom + (size.value + 10) * 3) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return high;
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