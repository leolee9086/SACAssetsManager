<template>
    <div class=" fn__flex-column" style="max-height: 100%;">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1">{{ assetsMetas && assetsMetas.length }}个资源</div>
            <div class=" fn__flex ">
                <input v-model="size" @change="() => { setupScrollListener(); setupScrollListener() }"
                    style="box-sizing: border-box;width: 200px;" value="100" class="b3-slider fn__block" max="1024"
                    min="64" step="1" type="range">
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <DocBreadCrumb v-if="block_id || box" :block_id="block_id" :box="box"></DocBreadCrumb>
        <div class=" fn__flex " style="align-items: center;">
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__space"></div>
        <div class="fn__flex-column fn__flex-1" style="width:100%">
            <div class="fn__flex-column fn__flex-1" style="width:100%" ref="gridsContainer">
                <div class="fn__flex-column" :style="`position: relative;min-height:${calcHeight}px;`">
                    <template :key="`iframe-${asset.id}`"
                        v-for="(asset, i) in assetsMetas.slice(CuurentStartIndex, visiAbleIndex)">
                        <div  :style="{
                position: 'absolute',
                left: `${positions[asset.index]?.x}px`,
                top: `${positions[asset.index]?.y}px`,
                width: `${columnWidth}px`,
                height: `${asset.height || 512}px`,
                backgroundColor: 'var(--b3-theme-background-light)',
                borderRadius: `${columnWidth / 12}px`,
                border: selectedItems.indexOf(asset) >= 0 ? '1px solid red' : ''
            }">
                            <div>
                                <div>
                                    <iframe :id="`frame-${asset.path}`" :width="columnWidth"
                                        :height="asset.height || 1024"
                                        :style="`border-radius:${columnWidth / 12}px;border: none`" seamless="true"
                                        loading="eager" :data-asset='`${asset.path}`' :data-path="`${asset.path}`"
                                        :onload="(e) => {
                asset.iframe = e.target;
                e.target.asset = asset;
                e.target.contentWindow.document.write(创建思源附件预览页面内容(asset, true));
                e.target.contentWindow.postMessage('ready');
            }">
                                    </iframe>
                                    <div v-if="asset.ready" style="line-height:18px;font-size:10px">
                                        {{ asset.cleanPath }}
                                    </div>
                                </div>
                                <div v-if="asset.ready && asset.height"
                                    :style="`position:absolute;border-radius:${columnWidth / 12}px;border:none;height:${asset.height}px`">
                                    {{ asset.index+'_'+ asset.height+'_'+asset.columnIndex }}
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
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
const size = ref(256)
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
onMounted(async () => {
    // Fetch assets data
    let assets = await 获取tab附件数据(appData.value.tab, 102400);
    assetsMetas.value = assets.map((item, i) => ({
        ...item,
        index: i,
        height: parseInt(size.value),
        position: { x: 0, y: 0 },
        addToLayout: () => setupLayout(assetsMetas.value[i]),
        frameContent: 创建思源附件预览页面内容(item, true),
        updateLayout: (newHight) => { updateLayout(assetsMetas.value[i], newHight) }
    }));
    nextTick(() => {
        let 新布局=构建空布局(parseInt(size.value)+10,gridsContainer.value.clientWidth,assetsMetas.value.length,parseInt(size.value)+36)
        console.log(新布局.value)

        assetsMetas.value.forEach((asset, index) => {
            asset.next = assetsMetas.value[index + 1]
            asset.pre = assetsMetas.value[index - 1]
            const iframe = document.getElementById(`frame-${asset.path}`);
            if (iframe) {
                iframe.addEventListener('load', () => {
                    iframe.asset = asset
                    asset.iframe = iframe
                })
            }
        });
        setupScrollListener()
        gridsContainer.value.addEventListener('scroll', setupScrollListener)
    });
});

//首先需要确认一点,为了保证在滚动的时候能够以最快的速度找到应该显示的元素,实时缓存所有可见的卡片可能是必须的
//如果之后有问题的话就改为使用其他存储格式
function 构建空布局(列宽,容器宽度,元素数量,预期元素高度){
    //计算列数
    //布局序列是一个数组,按顺序存储所有卡片的位置
    let  布局序列= ref([])
    let  列数据 = ref([])
    //可见序列也是一个数组,包含从布局序列中找到的当前可见位置序列,其中可能有空格子
    let 可见序列 = ref([])
    const 列数 = Math.floor(容器宽度/列宽)
    for(let i=0;i<列数;i++){
        列数据.value[i]=[]
        列数据.左坐标=列宽*i
    }
    for(let i=0;i<元素数量;i++){
        //由于是空布局,直接进行添加就可以
        const 当前列序号 =  i%列数
        const 当前列数据 = 列数据[当前列序号]
        const 当前列内索引 = i%列数
        let l,r,t,b
        
        const 空卡片={
            所在列:当前列序号,
            列内索引:当前列内索引,
            元数据:null,
            几何信息:[l,r,t,b],
            元数据id:null,
            总索引:i
        }
        布局序列.value.push(空卡片)
        //初始化一个空的列数据
        if(!列数据.value[当前列序号]){
            列数据.value[当前列序号] = []
        }
        列数据.value.push(空卡片)
        //设想一下按列动态加载
        列数据.下坐标=b
    }
    return 布局序列
}



const gutter = 10;
const columnWidth =size
const positions = ref([]);
const visiAbleIndex = ref(50)
const columnHeights = ref([])
const CuurentStartIndex = ref(0)
let oldColumns
let start = 0
const averageHeight = ref(parseInt(size.value) * 3)
function setupScrollListener() {
    let { scrollTop, clientHeight, clientWidth } = gridsContainer.value;
    // Find the column with the minimum height
    const displayColumns = Math.floor(clientWidth / (columnWidth.value + gutter));

    let minColumnHeight = 0
    let columnIndex = 0
    for (let i = 1; i < columnHeights.value.length; ++i) {
        if (columnHeights.value[i] < minColumnHeight) {
            minColumnHeight = columnHeights.value[i];
            columnIndex = i;
        }
    }
    for (let i = Math.max((CuurentStartIndex.value-50),0); i <= visiAbleIndex.value; i++) {
        let asset = assetsMetas.value[i]
        setupLayout(asset)
        updateLayout(asset)
    }
    let current= visiAbleIndex.value
    while (minColumnHeight <= scrollTop + clientHeight&&visiAbleIndex.value<assetsMetas.value.length) {
        minColumnHeight=0
        for (let i = 1; i < columnHeights.value.length; ++i) {
            if(!minColumnHeight){
                minColumnHeight = columnHeights.value[i];

            }
            else if (columnHeights.value[i] <= minColumnHeight) {

                minColumnHeight = columnHeights.value[i];
            }
        }
        visiAbleIndex.value+=displayColumns
        for(let i = current;i<visiAbleIndex.value;i++){
        let asset = assetsMetas.value[i]
        setupLayout(asset)
        updateLayout(asset)
        }
    }
    let min=visiAbleIndex.value
    columnValues&&columnValues.forEach(
        column=>{
            for(let i = column.length;i>=0;i--){
                let asset = column[i]
                if(asset&&asset.position.y+asset.height<=scrollTop){
                    console.log(asset.position.y+asset.height,scrollTop)

                    min=Math.min(min,asset.index)
                    break
                }
            }
        }     
    )
    console.log(min)
    CuurentStartIndex.value=Math.max(min-20,0)
    /*if (minColumnHeight <= scrollTop + clientHeight) {
        visiAbleIndex.value += Math.floor(clientHeight / averageHeight.value)
        visiAbleIndex.value=Math.min(assetsMetas.value.length,visiAbleIndex.value)
        if (visiAbleIndex.value - CuurentStartIndex.value >= Math.floor(clientHeight / averageHeight.value * displayColumns) * 10) {
            CuurentStartIndex.value += Math.floor(clientHeight / averageHeight.value) + 1
        }
    } else if (gridsContainer.value.querySelector('iframe').getBoundingClientRect().bottom < scrollTop) {
        CuurentStartIndex.value -= Math.floor(clientHeight / averageHeight.value) + 1
        visiAbleIndex.value -= Math.floor(clientHeight / averageHeight.value)
        CuurentStartIndex.value=Math.max(CuurentStartIndex.value,0)
        visiAbleIndex.value=Math.max(CuurentStartIndex.value+Math.floor(clientHeight / averageHeight.value),visiAbleIndex.value)
    }*/
}

function isInview(asset) {
    return !((asset.index - visiAbleIndex.value) <= -400)
}
const calcHeight = ref(assetsMetas.value.length * 512 / 8)
function updateLayout(asset, height) {
    if(!asset){
        return
    }
    if (height) {
        columnHeights.value[asset.columnIndex] += asset.height - height
    }
    let colNext = asset.colNext

    if (colNext) {
        colNext && (colNext.position.y = asset.position.y + asset.height + gutter)
        colNext && colNext.updateLayout()
    }

}

let columnValues
let loadedDatas = []
let addCount// Track the number of additions per column

function setupLayout(asset) {
    if (!asset || asset.ready) {
        return
    }
    let minColumnHeight = columnHeights.value[0];
    let columnIndex = 0;

    let { clientWidth } = gridsContainer.value;
    const displayColumns = Math.floor(clientWidth / (columnWidth.value + gutter));
    columnValues = columnValues || []
    if (columnValues[0] === undefined) {
        for (let i = 0; i < displayColumns; i++) {
            columnValues[i] = []
        }
    }
    addCount=addCount||Array(displayColumns).fill(0); 
    if (oldColumns !== displayColumns) {
        columnHeights.value = Array(displayColumns).fill(0);
        positions.value = [];
        oldColumns = displayColumns;
        addCount = Array(displayColumns).fill(0); // Reset add count when columns change
    }
    let minColumn
    if (!positions.value[asset.index] && asset.height) {
        // Find the column with the minimum height
        for (let i = 1; i < columnHeights.value.length; ++i) {
            if (columnHeights.value[i] < minColumnHeight) {
                minColumnHeight = columnHeights.value[i];
                columnIndex = i;
            }
        }
        let maxColumnHeight = Math.max(...columnHeights.value)||asset.height;

        let maxColumnLength = columnValues.reduce((max, col) => Math.max(max, col.length), 0);
        let newHeight = (maxColumnHeight / maxColumnLength + averageHeight.value) / 2;
        const maxAddCount = Math.max(...addCount);

        if (maxAddCount > 10) {
            const leastAddedColumn = addCount.indexOf(Math.min(...addCount));
            columnIndex = leastAddedColumn;
            addCount=undefined
        }
        asset.height =Math.min(averageHeight.value,parseInt(size.value))
        const x = columnIndex * (columnWidth.value + gutter);
        columnHeights.value[columnIndex] += asset.height || 0 + gutter;
        // Mark the column index to the asset
        asset.columnIndex = columnIndex;
        asset.colPre = columnValues[columnIndex][columnValues[columnIndex].length - 1]
        columnValues[columnIndex].push(asset)
        asset.colPre && (asset.colPre.colNext = asset)
        let y = 0
        asset.colPre && (y = asset.colPre.height + asset.colPre.position.x)
        asset.position = { x, y };
        positions.value[asset.index] = asset.position
        asset.ready = true
        loadedDatas.push(asset)
        minColumn = columnValues[columnIndex]
        addCount&&addCount[columnIndex]++
    }
    const totalAssets = assetsMetas.value.length;
    averageHeight.value = (minColumnHeight / minColumn.length) || averageHeight.value;
    calcHeight.value = Math.min((averageHeight.value) * totalAssets / displayColumns, Math.max(...columnHeights.value));
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