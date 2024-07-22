<template>
    <div class=" fn__flex-column" style="max-height: 100%;">
        <div class=" fn__flex " style="min-height:36px;align-items: center;">
            <div class="fn__space fn__flex-1"></div>
            <div class=" fn__flex ">
                <input v-model="size"  style="box-sizing: border-box;width: 200px;"
                    value="100" class="b3-slider fn__block" max="1024" min="64" step="1" type="range">
            </div>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <DocBreadCrumb v-if="block_id || box" :block_id="block_id" :box="box"></DocBreadCrumb>
        <div class=" fn__flex " style="align-items: center;">
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__space"></div>

        <div class="fn__flex-column fn__flex-1" style="width:100%">
            <!--选择框的容器-->
            <assetsGridRbush :size="parseInt(size)"></assetsGridRbush>

            <div v-if="isSelecting" :style="selectionBoxStyle" class="selection-box"></div>
        </div>
    </div>
</template>
<script setup>
import {ref,inject,toRef}from'vue'
import DocBreadCrumb from './docbreadCrumb.vue'
import assetsGridRbush from './assetsGridRbush.vue';
const isSelecting = ref(false)
const appData = inject('appData')
const {block_id,box} = appData.tab.data
const size  = ref(100)
</script>