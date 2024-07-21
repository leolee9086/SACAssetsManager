<template>
    <div class="fn__flex" style="max-height:100%;height: 100%;" ref="root">
        <div class="fn__flex-column fn__flex-1">
            <div class="fn__flex-column fn__flex-1">
                <div class="fn__flex-column fn__flex-1">

                    <div class="fn__flex-1 fn__flex" ref="scrollContainer" @scroll="更新可见区域" style="position: relative;">
                        <div class="fn__flex-column fn__flex-1" style="min-height: 102400px;height:102400px">
                            <template v-for="(卡片数据, i) in 可见卡片组" :key="卡片数据&&卡片数据.data?卡片数据.data.id:Date.now()+'_'+i">
                                
                                <div :style="计算卡片样式(卡片数据)" v-if="卡片数据&&卡片数据.data" :data-indexInColumn="卡片数据&&卡片数据.indexInColumn">
                                    <img :data-columnIndex="卡片数据.columnIndex" :data-indexInColumn="卡片数据.indexInColumn"
                                        :style="`width:100%;height:100%;border:none; `" :onload="(e) => 更新图片尺寸(e, 卡片数据)"
                                        loading="lazy"
                                        :src="`http://127.0.0.1/thumbnail/?path=${encodeURIComponent(卡片数据.data.path)}`">

                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import { 获取tab附件数据 } from "../../data/siyuanAssets.js"
import { ref, onMounted, inject, reactive, toRef, nextTick } from 'vue'
import { 创建瀑布流布局 } from "../utils/layoutComputer/masonry/layout.js";
/*监听尺寸变化重新布局*/
const root = ref(null)
const scrollContainer = ref(null)
const appData = toRef(inject('appData'))
let 布局对象
const { Lute } = window
const { NewNodeID } = Lute
const columnCount = ref(14)
const 计算卡片样式 = (卡片数据) => {
    return {
        transform: `translate(${卡片数据.x}px,${卡片数据.y}px)`,
        height: 卡片数据.height + 'px',
        width: 卡片数据.width + 'px',
        position: 'absolute'
    }
}
const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        console.log(entry)
    }
});
const 可见卡片组 = ref([])
function 更新图片尺寸(e, cardData) {
    const previewer = e.target
    const dimensions = {
        width: previewer.naturalWidth||100,
        height: previewer.naturalHeight||100
    };
    let 缩放因子 = dimensions.width / 100
     更新素材高度(cardData, dimensions.height / 缩放因子)
}
 function 更新素材高度(cardData, height) {
    const oldHeight = cardData.height
    if (Math.abs(height - oldHeight) >= oldHeight * 0.1 && !cardData.ready) {
        布局对象.update(cardData.index, height)
        更新可见区域()
    }
}
let oldScrollTop
let isUpdating
const 更新可见区域 = async (flag) => {
    const { scrollTop, clientWidth, clientHeight } = scrollContainer.value
    if (oldScrollTop === scrollTop && !flag) {
        return
    }

    try {
        oldScrollTop = scrollTop
        let 可见框 = {
            minX: 0,
            minY: scrollTop-clientHeight,
            maxY: scrollTop + clientHeight,
            maxX: clientWidth
        }
        let result = 布局对象.search(可见框)
        可见卡片组.value
        result.forEach(
            item => {
                if (!可见卡片组.value.find(_item => { return _item && _item.index === item.index })) {
                    可见卡片组.value.push(item)
                }
            }
        )
        可见卡片组.value.forEach(
            (_item, i) => {
                if (_item && !result.find(item => { return _item.index === item.index })) {
                    可见卡片组.value[i] = null
                }
            }
        )
        if (可见卡片组.value.length > columnCount.value*50) {
            可见卡片组.value = 可见卡片组.value.filter(item => item)
        }
        let _flag = true
        while (_flag) {
            try {
                let { columns } = 布局对象
                let shortestColumn = columns[0];
                let shortestColumnIndex = 0
                for (let i = 1; i < columns.length; i++) {
                    if (columns[i].y < shortestColumn.y) {
                        shortestColumn = columns[i];
                        shortestColumnIndex = i; // 更新索引
                    }
                }
                if (shortestColumn.y < scrollTop + clientHeight + clientHeight + clientHeight) {
                    布局对象.add(附件数据组.shift())
                } else {
                    _flag = false
                }
            } catch (e) {
                console.warn(e)
                _flag = false
            }
        }
    } catch (e) {
        console.warn(e)
    }
}

let 附件数据组

onMounted(async () => {
    resizeObserver.observe(
        root.value
    )
    附件数据组 = await 获取tab附件数据(appData.value.tab, 102400);
    附件数据组=附件数据组.concat(附件数据组).concat(附件数据组).concat(附件数据组).concat(附件数据组).concat(附件数据组)
    布局对象 = 创建瀑布流布局(columnCount.value, 100, 10)
    for(
         let i=0;i<3;i++
    ){
        let item=附件数据组.shift()
        item&&布局对象.add(item)
    }
    更新可见区域()
})

</script>