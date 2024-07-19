<template>
    <div :class="{'fn__flex':1, 'fn__flex-column':1,'scroll-column':1,show_scroll:showScroll}" ref="columnContainer"
        :style="`max-height: 100%;overflow:scroll;width:${parseInt(size)}px;`" @scroll="更新可见区域">
        <div class=""
            :style="`transform:translate(0,${0 - columnContainer ? columnContainer.scrollTop : 0}px);min-height:${Math.max(总高度,containerHeight)}px`">
            <template v-for="(cardData, i) in 可见素材" :key="'container_'+cardData.asset.id+i">
                <div v-if="cardData.asset"
                    :style="`position:absolute;width:100%;height:${cardData.height}px;transform:translate(0,${cardData.position.y}px)`">
                    <div style="position:absolute;height:10ox;top:15px">{{ cardData.index }}</div>
                    <!--                    <iframe :data-path="`${cardData.asset.path}`" loding="eager"
                        style="width:100%;height:100%;border:none" seamless="true"
                        :onload="(e) => 初始化素材页面(e, data[cardData.index])">
                    </iframe>
                        -->
                    
                        <img :style="`width:100%;height:100%;border:none; 
                    border-radius: ${size / 12}px;`" :onload="(e) => 更新图片尺寸(e, cardData)"
                        :src="`http://127.0.0.1/thumbnail/?path=${encodeURIComponent(cardData.asset.path)}`">
                        
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { ref, watch, toRef, defineEmits, reactive } from 'vue'
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"
const props = defineProps(['data', 'scrollTop', 'dataFetcher','containerHeight','showScroll'])
const showScroll =toRef(props, 'showScroll')
const data = toRef(props, 'data')
const scrollTop = toRef(props, 'scrollTop')
const containerHeight = toRef(props,'containerHeight')
const { dataFetcher } = props
const size = ref(100)
const columnContainer = ref(null)
const 待渲染素材 = ref([])
const emit = defineEmits()
const 总高度 = ref(0)
const 平均高度 = ref(size.value)
const 可见素材 = ref([])

初始化布局高度()
watch(
    data, (newVal, oldval) => {
        if (oldval !== newVal) { 初始化布局高度() }
    }, {}
)
function 更新图片尺寸(e, cardData) {
    const previewer = e.target
    const dimensions = {
        width: previewer.naturalWidth,
        height: previewer.naturalHeight
    };
    let 缩放因子 = dimensions.width / parseInt(size.value)
    更新素材高度(cardData, dimensions.height / 缩放因子)

}
function 初始化布局高度() {
    for (let i = 0; i < data.value.length; i++) {
        let cardData = data.value[i]
        初始化卡片位置(cardData, i)
        待渲染素材.value.push(cardData)
        if (i <= 10) {
            可见素材.value.push(cardData)
        }
    }
    let _totalHeight = data.value.length * size.value
    总高度.value = _totalHeight
}
function 请求更多素材() {
    let 新素材数据 = dataFetcher(0)
    let 卡片数据 = 创建卡片(新素材数据)
    初始化卡片位置(卡片数据, data.value.length)
    data.value.push(卡片数据)
    总高度.value += 卡片数据.height
    emit('assetsNeedMore', data); // Emit an event when assets are loaded
}
function 创建卡片(asset) {
    return {
        position: { x: 0, y: 0 },
        height: asset.height,
        asset
    }
}
function 初始化卡片位置(cardData, i) {
    cardData.index = i
    cardData.ready = false
    let pre = data.value[i - 1]
    pre && (cardData.position.y = (pre.height + pre.position.y))
}
watch(
    总高度, () => {
        emit('heightChange', 总高度.value)
    }
)
watch(
    scrollTop, (newVal, oldval) => {
        if (newVal !== oldval) {
            columnContainer.value.scrollTop = newVal
        }
    }
)


const startIndex = ref(0)
const endIndex = ref(100)
function 更新素材高度(cardData, height) {
    const oldHeight = cardData.height
    if (Math.abs(height - oldHeight) >= oldHeight * 0.1 && !cardData.ready) {
        cardData.ready = true;
        cardData.height = parseInt(height);
        const heightChange = cardData.height - oldHeight
        总高度.value += heightChange;
        for (let i = cardData.index + 1; i < data.value.length; i++) {
             data.value[i].position.y += heightChange;
        }
        更新可见区域();
    }
}

function 二分查找可见素材(assets, scrollTop, clientHeight) {
    let low = 0;
    let high = assets.length - 1;
    let start = -1;
    let end = -1;
    // Find the start index
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const asset = assets[mid];
        const assetBottom = asset.position.y + asset.height;
        if (asset.position.y > scrollTop + clientHeight) {
            high = mid - 1;
        } else if (assetBottom < scrollTop) {
            low = mid + 1;
        } else {
            start = mid;
            high = mid - 1;
        }
    }
    // Reset low and high for end index search
    low = 0;
    high = assets.length - 1;
    // Find the end index
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const asset = assets[mid];
        const assetBottom = asset.position.y + asset.height;
        if (asset.position.y > scrollTop + clientHeight) {
            high = mid - 1;
        } else if (assetBottom < scrollTop) {
            low = mid + 1;
        } else {
            end = mid;
            low = mid + 1;
        }
    }
    return { start, end };
}

function 更新可见区域() {
    const scrollTop = columnContainer.value.scrollTop;
    const clientHeight = columnContainer.value.clientHeight;
    emit('scrollSyncNeed', scrollTop)
    const { start, end } = 二分查找可见素材(props.data, scrollTop, clientHeight);
    if (start !== -1 && end !== -1) {
        startIndex.value = start
        endIndex.value = end + 10
        // 使用 splice 方法删除 visibleMaterials 数组中的所有元素
        可见素材.value = data.value.slice(start, end + 1);
        if (end >= props.data.length - 10) {
            // 触发加载事件，直到最后一个元素
            for (let i = 0; i < end - props.data.length + 10; i++) {
                请求更多素材();
            }
        }
        

    }
    let i=0
    while(总高度.value<=scrollTop+clientHeight&&i<=10){
            i++
            请求更多素材();
    }
}



function 初始化素材页面(e, cardData) {
    cardData.iframe = e.target;
    e.target.contentWindow.document.write(创建思源附件预览页面内容(cardData.asset, true));
    cardData.iframe.contentWindow.addEventListener(
        'message', (event) => {
            let 图片尺寸 = event.data
            let 缩放因子 = 图片尺寸.width / parseInt(size.value)
            更新素材高度(cardData, 图片尺寸.height / 缩放因子)
        }
    )
    cardData.iframe.asset = cardData.asset;
}
</script>
<style scope>
.scroll-column:not(.show_scroll)::-webkit-scrollbar {
    display: none;
}
</style>