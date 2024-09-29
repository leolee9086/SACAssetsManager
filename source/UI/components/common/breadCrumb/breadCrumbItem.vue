<template>
    <span class="protyle-breadcrumb__item">
        <template v-if="icon">
        <img v-if="!isSvg(icon)" :src="icon" style="  height: 14px;
    width: 14px;
    flex-shrink: 0;
    color: var(--b3-theme-on-surface);" />
        <svg v-if="isSvg(icon)" class="popover__block">
            <use :xlink:href="icon"></use>
        </svg>
        </template>
        <span>{{ label }}</span>
 
    </span>
</template>
<script setup>
import {toRefs,defineProps} from 'vue'
import { isSvg } from '../../../../utils/siyuanData/icon.js';
const props = defineProps({
    label: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },

})
const {label,icon} = toRefs(props)
</script>