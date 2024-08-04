<template>
    <div class="protyle-breadcrumb">
        <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">
            <breadCrumbItem label="工作空间" @click="打开全工作空间视图" icon="/stage/icon.png" />
            <breadCrumbItem :label="`🗃${blockData.fullHPath[0]}:`" @click="打开笔记本资源视图"
                :data-box="blockData.meta && blockData.meta.box" />
            <template v-for="(hpathItem, i) in blockData.fullHPath">
                <breadCrumbItem @click="打开笔记资源视图(i)" v-if="i <= blockData.fullHPath.length - 2"
                    :label="blockData.fullHPath[i + 1]" :data-box="blockData.meta && blockData.meta.box"
                    :isLast="i === blockData.fullHPath.length - 1" icon="#iconFile" />
            </template>
            <svg class="protyle-breadcrumb__arrow">
                <use xlink:href="#iconRight"></use>
            </svg>
        </div>
        <span class="fn__space fn__flex-1 protyle-breadcrumb__space">
        </span>
        <input class="b3-switch fn__flex-center ariaLabel" aria-label="显示子路径" id="uploadErrLog" type="checkbox">
        <button class="b3-tooltips b3-tooltips__w block__icon fn__flex-center" style="opacity: 1;" data-menu="true"
            aria-label="更多">
            <svg>
                <use xlink:href="#iconMore"></use>
            </svg>
        </button>
    </div>
</template>
<script setup>
import { defineProps, ref, onMounted } from 'vue'
import { kernelApi, plugin } from 'runtime'
import { tabEvents } from '../siyuanCommon/tabs.js';
import breadCrumbItem from './siyuan/breadCrumbItem.vue';
const 打开全工作空间视图 = () => {
    plugin.eventBus.emit(
        'open-gallery-data', {
        title: "全部资源",
        data: {
            type: 'sql',
            stmt: 'select * from assets limit 102400',
            breadCrumbItems: [{
                icon: '/stage/icon.png',
                label: '工作空间',
                gallery: {
                    type: 'sql',
                    stmt: 'select * from assets limit 102400',
                }
            }],
            subPath: {
                type: 'js',
                content: '()=>{return window.siyuan.notebooks}'
            }
        }
    }
    )
}
const 打开笔记本资源视图 = () => {
    (box || (blockData.value.meta && blockData.value.meta.box)) && plugin.eventBus.emit(
        tabEvents.打开笔记本资源视图, {
        data: {
            box: box || blockData.value.meta.box,
        }
    }
    )
}
const 打开笔记资源视图 = (index) => {
    const pathArray = blockData.value.meta.path.split('.')[0].split('/').filter(item => item)
    console.log(pathArray)
    plugin.eventBus.emit(tabEvents.打开笔记资源视图, pathArray[index])
}

const blockData = ref({
    fullHPath: "",
    path: ""
})
const { block_id, box } = defineProps(
    [
        'block_id',
        'box'
    ]
)
onMounted(() => {
    if (block_id) {
        kernelApi.getFullHPathByID(
            {
                id: block_id
            }
        ).then(
            data => {
                blockData.value.fullHPath = data.split('/')
            }
        )
        kernelApi.sql(
            {
                stmt: `select * from blocks where id ="${block_id}"`
            }
        ).then(
            data => {
                blockData.value.meta = data[0]
            }
        )
    }
    else {
        kernelApi.lsNotebooks({
            flashcard: false
        }).then(
            data => {
                blockData.value.fullHPath = data.notebooks.filter(
                    item => {
                        return item.id === box
                    }
                ).map(
                    item => {
                        return item.name
                    }
                )
            }
        )
    }
})
</script>