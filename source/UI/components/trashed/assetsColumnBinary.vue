<template>
        <div class="fn__flex fn__flex-column" ref="columnContainer"
            :style="`max-height: 100%;overflow:scroll;width:${parseInt(size)}px`">
            <div class=""
                :style="`transform:translate(0,${0 - columnContainer ? columnContainer.scrollTop : 0}px);min-height:${平均高度*assetsMetas.length}px`">

                <template v-for="(asset, i) in 当前可见素材" :key="'container_'+asset.id">
                    <div v-if="asset"
                        :style="`position:absolute;width:100%;height:${assetsMetas[asset.index].height}px;transform:translate(0,${assetsMetas[asset.index].position.y}px)`">
                        <div style="position:abosolute;height:10ox">{{  asset.index}}</div>

                        <iframe :data-path="`${assetsMetas[asset.index].path}`"
                            loding="lazy"
                            style="width:100%;height:100%;border:none" seamless="true"
                            :onload="(e) => 初始化素材页面(e, assetsMetas[asset.index])">
                        </iframe>
                    </div>
                </template>
            </div>
        </div>
</template>
<script setup>
import { ref, onMounted, inject, computed, toRef, nextTick } from 'vue'
import { 获取tab附件数据 } from "../../data/siyuanAssets.js"
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"

const assetsMetas = ref([])
const 当前可见素材 = ref([])
const appData = toRef(inject('appData'))
const size = ref(50)
const columnContainer = ref(null)
const 待渲染素材 = ref([])
const 已卸载素材 = ref([])
const gutter = ref(10)
onMounted(async () => {
    // Fetch assets data
    let assets = await 获取tab附件数据(appData.value.tab, 102400);
    assetsMetas.value = assets.map((item, i) => ({
        ...item,
        index: i,
        height: parseInt(size.value),
        position: { x: 0, y: 0 },
        frameContent: 创建思源附件预览页面内容(item, true),
    }));
    for (let i = 0; i < assetsMetas.value.length; i++) {
        let asset = assetsMetas.value[i]
        let pre = assetsMetas.value[i - 1]
        pre && (asset.position.y = (pre.height + pre.position.y))
        待渲染素材.value.push(assetsMetas.value[i])
    }
    nextTick(
        () => {
            初始化可见区域()
            columnContainer.value.addEventListener('scroll', () => {
                更新可见区域()
            })
        }
    )
}
)
const 总高度 = ref(0)
const 平均高度 = ref(size.value)
const 高度更新任务=[]

async function 更新素材高度(asset, height) {
    const oldHeight = asset.height
    if (Math.abs(height - oldHeight) >= oldHeight * 0.1&&!asset.ready) {
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
function 计算顶部偏移() {
    return columnContainer.value.scrollTop + 已卸载高度.value
}
const 已卸载高度 = ref(0)
const 占位高度 = ref(0)
 function 移除超低素材() {
    let flag = true
    if (当前可见素材.value.length >= 100) {
        当前可见素材.value = 当前可见素材.value.filter(
            item => item
        )
    }
    while (flag && 当前可见素材.value.find(
        item => item
    )) {
        let firstAsset = 当前可见素材.value.find(
            item => item
        )
        if (firstAsset.position.y + firstAsset.height < columnContainer.value.scrollTop-columnContainer.value.clientHeight) {
            firstAsset.已移除 = true
            已卸载高度.value += firstAsset.height
            已卸载素材.value.push(当前可见素材.value.find(item => item))
            当前可见素材.value[当前可见素材.value.indexOf(当前可见素材.value.find(item => item))] = undefined
        }
        else {
            flag = false
        }
    }
    if (当前可见素材.value.length >= 100) {
        当前可见素材.value = 当前可见素材.value.filter(
            item => item
        )
    }
}
let updating
const 已加载累计 = ref(0)
function 向下扩展可见区域(){
    let chunk =[]
    while (总高度.value <= columnContainer.value.clientHeight*2 + columnContainer.value.scrollTop) {
        let asset = 待渲染素材.value.shift()
        if (asset) {
            已加载累计.value+=1
            总高度.value += asset.height
            
            平均高度.value=总高度.value/已加载累计.value
            chunk.push(asset)
        }else{
            break
        }
    }
    当前可见素材.value=当前可见素材.value.concat(chunk)
}
function 向上扩展可见区域() {
    let chunk = [];
    while (columnContainer.value.scrollTop <= 计算顶部偏移() && 已卸载素材.value.length > 0) {
        let asset = 已卸载素材.value.pop();
        if (asset) {
            asset.已移除 = false;
            已卸载高度.value -= asset.height;
            已卸载高度.value=Math.max(已卸载高度.value,0)
            chunk.unshift(asset);
        } else {
            break;
        }
    }
    当前可见素材.value = chunk.concat(当前可见素材.value);
}
function 更新可见区域() {
    const scrollTop = columnContainer.value.scrollTop;
    const clientHeight = columnContainer.value.clientHeight;

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
        当前可见素材.value = assetsMetas.value.slice(start, end + 1);
    }
}
/*function 更新可见区域() {
    const previousScrollTop = columnContainer.value.scrollTop;
    columnContainer.value.addEventListener('scroll',()=>requestIdleCallback( () => {
        const currentScrollTop = columnContainer.value.scrollTop;
        if (currentScrollTop > previousScrollTop) {
            // Scrolling down
            向下扩展可见区域();
            移除超低素材();

        } else {
            // Scrolling up
            向上扩展可见区域();
        }
    }),{once:true});
}*/
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
function 初始化可见区域(起始偏移) {
    let _totalHeight = 0
    待渲染素材.value.forEach(asset => {
        while (_totalHeight <= columnContainer.value.clientHeight) {
            _totalHeight += asset.height
            当前可见素材.value.push(
                待渲染素材.value.shift()
            )
        }
    });
    总高度.value = _totalHeight
}
</script>