<template>
    <div class="fn__flex fn__flex-column scroll-column" ref="columnContainer"
        :style="`max-height: 100%;overflow:scroll;width:${parseInt(size)}px;`" @scroll="更新可见区域">
        <div class=""
            :style="`transform:translate(0,${0 - columnContainer ? columnContainer.scrollTop : 0}px);min-height:${平均高度 * props.data.length}px`">
            <template v-for="(cardData, i) in data.slice(0,30)" :key="'container_'+cardData.asset.id+i">
                <div v-if="cardData.asset"
                    :style="`position:absolute;width:100%;height:${cardData.height}px;transform:translate(0,${cardData.position.y}px)`">
                    <div style="position:abosolute;height:10ox">{{ cardData.index }}</div>
                    <iframe :data-path="`${cardData.asset.path}`" loding="eager"
                        style="width:100%;height:100%;border:none" seamless="true"
                        :onload="(e) => 初始化素材页面(e, data[cardData.index])">
                    </iframe>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { ref, watch, toRef, defineEmits, reactive } from 'vue'
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"
const props = defineProps(['data', 'scrollTop'])
const { data } = props
const scrollTop = toRef(props, 'scrollTop')
const size = ref(200)
const columnContainer = ref(null)
const 待渲染素材 = ref([])
const emit = defineEmits()
const 总高度 = ref(0)
const 平均高度 = ref(size.value)
const 可见素材 = reactive( [] )
初始化布局高度()
watch(
    data, (newVal, oldval) => {
        if (oldval !== newVal) { 初始化布局高度() }
    }, {}
)
function 初始化布局高度() {
    for (let i = 0; i < props.data.length; i++) {
        let cardData = props.data[i]
        cardData.index = i
        let pre = props.data[i - 1]
        pre && (cardData.position.y = (pre.height + pre.position.y))
        待渲染素材.value.push(cardData)
        if (i <= 10) {
            可见素材.push(cardData)
        }
    }
    let _totalHeight = props.data.length * size.value
    总高度.value = _totalHeight
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


const 已卸载高度 = ref(0)
const startIndex = ref(0)
const endIndex = ref(100)
async function 更新素材高度(cardData, height) {
    const oldHeight = cardData.height
    if (Math.abs(height - oldHeight) >= oldHeight * 0.1 && !cardData.ready) {
        cardData.ready = true;
        cardData.height = parseInt(height);
        总高度.value += cardData.height - oldHeight;
        data.forEach(
            _asset => {
                if (cardData.index < _asset.index) {
                    _asset.position.y += cardData.height - oldHeight;
                }
            }
        );
        cardData.已移除 ? 已卸载高度.value += cardData.height - oldHeight : null;
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
        可见素材.splice(0, 可见素材.length);

        // 然后使用 splice 方法在 visibleMaterials 数组中插入新的元素
        可见素材.splice(0, 0, ...data.slice(start, end + 1));

        if (end === props.data.length - 1) {
            // Trigger loading event when end reaches the last element
            请求更多素材();
        }
    }
}

function 请求更多素材() {
    emit('assetsNeedMore', props.data); // Emit an event when assets are loaded
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
<style>
.scroll-column::-webkit-scrollbar {
    display: none;
}
</style>