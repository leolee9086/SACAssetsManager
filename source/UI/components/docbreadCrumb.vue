<template>
    <div class="protyle-breadcrumb">
        <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">
            <span class="protyle-breadcrumb__item protyle-breadcrumb__item--active" @click="打开笔记本资源视图"
                :data-box="blockData.meta && blockData.meta.box">
                <svg class="popover__block" data-id="20210805000546-behj8io">
                    <use xlink:href="#iconFolder"></use>
                </svg>
                {{ blockData.fullHPath[0] }}:
            </span>

            <template v-for="(hpathItem, i) in blockData.fullHPath">
                <span v-if="blockData.fullHPath[i + 1]"
                    class="protyle-breadcrumb__item protyle-breadcrumb__item--active"
                    data-node-id="20210805000546-behj8io">
                    <svg class="popover__block" data-id="20210805000546-behj8io">
                        <use xlink:href="#iconFile"></use>
                    </svg>
                    {{ blockData.fullHPath[i + 1] }}
                </span>
            </template>
            <svg class="protyle-breadcrumb__arrow">
                <use xlink:href="#iconRight"></use>
            </svg>
        </div>
        <span class="fn__space fn__flex-1 protyle-breadcrumb__space">
        </span>

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
const 打开笔记本资源视图 = () => {
    (box || (blockData.value.meta && blockData.value.meta.box)) && plugin.eventBus.emit(
        'click-galleryboxicon', {
        data: {
            box: box || blockData.value.meta.box,
        }
    }
    )
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
        console.log(box)
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
                console.log(blockData.value)
            }
        )
    }
})
</script>