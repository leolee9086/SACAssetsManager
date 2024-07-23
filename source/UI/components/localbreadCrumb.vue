<template>
    <div class="protyle-breadcrumb">
        <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">
            <span class="protyle-breadcrumb__item protyle-breadcrumb__item--active" data-node-path="">
                <svg class="popover__block" data-id="">
                    <use :xlink:href="i === 0 ? '#iconDatabase' : '#iconFolder'"></use>
                </svg>
                本地文件夹
            </span>
            <span class="fn__space"></span>
            <template v-for="(pathPttern, i) in localPathArray">
                <span class="protyle-breadcrumb__item protyle-breadcrumb__item--active" @click="() => 打开本地资源视图(i)"
                    data-node-path="20210805000546-behj8io">
                    <svg class="popover__block" data-id="20210805000546-behj8io">
                        <use :xlink:href="i === 0 ? '#iconDatabase' : '#iconFolder'"></use>
                    </svg>
                    {{ pathPttern }}
                </span>
                <span class="fn__space"></span>
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
const 打开本地资源视图 = (i) => {
    const localPath = localPathArray.value.slice(0,i+1 )
    console.log(localPath.join('/'))
    plugin.eventBus.emit(
        'click-galleryLocalFIleicon',

        localPath.join('/'),


    )
}
const localPathArray = ref([])
const { localPath } = defineProps(
    [
        'localPath',
    ]
)
onMounted(() => {
    if (localPath) {
        localPath.replace(/\\/g, '/').split('/').forEach(
            item => {
                localPathArray.value.push(item)
            }
        )
    }

})
</script>