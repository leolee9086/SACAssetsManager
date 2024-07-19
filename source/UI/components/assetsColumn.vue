<template>
    <div class="fn__flex fn__flex-column scroll-column" ref="columnContainer"
        :style="`max-height: 100%;overflow:scroll;width:${parseInt(size)}px;`" @scroll="更新可见区域">
        <div class=""
            :style="`transform:translate(0,${0 - columnContainer ? columnContainer.scrollTop : 0}px);min-height:${平均高度 * assetsMetas.length}px`">
            <template v-for="(asset, i) in assetsMetas" :key="'container_'+asset?.id+i">
                <div v-if="startIndex <= i && i <= endIndex"
                    :style="`position:absolute;width:100%;height:${asset.height}px;transform:translate(0,${asset.position.y}px)`">
                    <div style="position:abosolute;height:10ox">{{ asset.index }}</div>
                    <iframe :data-path="`${asset.path}`" loding="eager"
                        style="width:100%;height:100%;border:none" seamless="true"
                        :onload="(e) => 初始化素材页面(e, asset)">
                    </iframe>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { ref, watch, toRef, defineEmits } from 'vue'
import { 获取tab附件数据 } from "../../data/siyuanAssets.js"
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"
const props = defineProps(['value', 'scrollTop'])
const assetsMetas = toRef(props, 'value');
const scrollTop = toRef(props, 'scrollTop')
const size = ref(200)
const columnContainer = ref(null)
const 待渲染素材 = ref([])
const emit = defineEmits()
const 总高度 = ref(0)
const 平均高度 = ref(size.value)
console.log(assetsMetas)
watch(
    assetsMetas, () => {
        for (let i = 0; i < assetsMetas.value.length; i++) {
            let asset = assetsMetas.value[i]
            asset.index=i
            let pre = assetsMetas.value[i - 1]
            pre && (asset.position.y = (pre.height + pre.position.y))
            待渲染素材.value.push(assetsMetas.value[i])
        }
        let _totalHeight = assetsMetas.value.length*size.value
        总高度.value = _totalHeight
    },
)

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
async function 更新素材高度(asset, height) {
    const oldHeight = asset.height
    if (Math.abs(height - oldHeight) >= oldHeight * 0.1 && !asset.ready) {
        asset.ready = true;
        asset.height = parseInt(height);
        总高度.value += asset.height - oldHeight;
        assetsMetas.value.forEach(
            _asset => {
                if (asset.index < _asset.index) {
                    _asset.position.y += asset.height - oldHeight;
                }
            }
        );
        asset.已移除 ? 已卸载高度.value += asset.height - oldHeight : null;
        更新可见区域();
    }
}
const 已卸载高度 = ref(0)
const startIndex = ref(0)
const endIndex = ref(100)
 function 更新可见区域() {
    const scrollTop = columnContainer.value.scrollTop;
    const clientHeight = columnContainer.value.clientHeight;
    emit('scrollSyncNeed', scrollTop)
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

    const { start, end } = 二分查找可见素材(assetsMetas.value, scrollTop, clientHeight);
    if (start !== -1 && end !== -1) {
        startIndex.value = start
        endIndex.value = end
        if (end === assetsMetas.value.length - 1) {
            // Trigger loading event when end reaches the last element
            请求更多素材();
        }
    }
}
function 请求更多素材() {
    emit('assetsNeedMore', assetsMetas.value); // Emit an event when assets are loaded
}
function 初始化素材页面(e, asset) {
    
    asset.iframe = e.target;
    e.target.contentWindow.document.write(创建思源附件预览页面内容(asset, true));
    asset.iframe.contentWindow.addEventListener(
        'message', (event) => {
            let 图片尺寸 = event.data
            let 缩放因子 = 图片尺寸.width / parseInt(size.value)
            更新素材高度(asset, 图片尺寸.height / 缩放因子)
        }
    )
    asset.iframe.asset = asset;
}

</script>
<style>
.scroll-column::-webkit-scrollbar {
    display: none;
}
</style>