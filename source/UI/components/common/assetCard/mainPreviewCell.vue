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
    return props.size > 300 ? protyleCell : imageCell;
});

const currentAttributeName = computed(() => {
    return props.size > 300 ? 'noteID' : 'thumbnailURL';
});
</script>