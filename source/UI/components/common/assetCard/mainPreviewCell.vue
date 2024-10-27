<template>
    <div>
        <component :is="currentComponent" :cardData="cardData" :displayMode="displayMode" :size="size" :attributeName="currentAttributeName" />
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import protyleCell from './protyleCell.vue';
import imageCell from './imageCell.vue';

const props = defineProps(['cardData', 'displayMode', 'size']);

const currentComponent = computed(() => {
    return currentAttributeName.value==='noteID' ? protyleCell : imageCell;
});

const currentAttributeName = computed(() => {
    //尺寸超过300时,显示编辑器,对于笔记来说就是protyle
    console.log(props.cardData.data.type)
    return props.size > 300&&props.cardData.data.type==='note' ? 'noteID' : 'thumbnailURL';
});
</script>