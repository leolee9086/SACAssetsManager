<template>
    <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon">
                <use xlink:href="#iconLanguage"></use>
            </svg>资源搜索接口
        </div>
        <span class="fn__flex-1 fn__space"></span>
        <span data-type="layout" class="block__icon b3-tooltips b3-tooltips__nw" aria-label="上"
            @click="foldUp = !foldUp">
            <svg>
                <use :xlink:href="foldUp ? '#iconUp' : '#iconRight'"></use>
            </svg>
        </span>
    </div>
    <div class="fn__flex fn__flex-1" v-if="foldUp">
        <apiList></apiList>
    </div>
</template>
<script setup>
import { ref } from 'vue'
import apiList from './apiList.vue';
const foldUp = ref(false)
</script>
