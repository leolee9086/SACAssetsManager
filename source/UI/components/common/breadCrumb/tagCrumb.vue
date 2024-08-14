<template>
    <div class="protyle-breadcrumb">
        <template v-for="(item, index) in labelArr" :key="item">
            <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">
                <span class="protyle-breadcrumb__item protyle-breadcrumb__item--active">
                    <svg class="popover__block" v-if="index === 0">
                        <use xlink:href="#iconTags"></use>
                    </svg>
                    <span>{{ item }}</span>
                </span>
            </div>
            <span v-if="index !== labelArr.length - 1">/</span>
        </template>
    </div>
</template>
<script setup>
import { ref, computed } from 'vue'
const genLabel = (labelArr,index) => {
    //需要去除最后的/
    return labelArr.slice(0,index+1).join('/').replace(/\/$/,'')
}
const props = defineProps({
    tagLabel: String
})
const labelArr = computed(() => {
    return props.tagLabel.split('/')
})
</script>