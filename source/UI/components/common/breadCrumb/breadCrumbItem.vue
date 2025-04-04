<template>
    <span :class="思源protyle面包屑类">
        <template v-if="icon">
        <img v-if="!isSvg(icon)" :src="icon" :class="面包屑图标类" />
        <svg v-if="isSvg(icon)" class="popover__block">
            <use :xlink:href="icon"></use>
        </svg>
        </template>
        <span>{{ label }}</span>
 
    </span>
</template>
<script setup>
import {toRefs,defineProps} from 'vue'
import { isSvg } from '../../../../../src/utils/siyuanData/icon.js';
import { 面包屑图标类,思源protyle面包屑类 } from '../../../../../src/utils/css/classConstance.js';
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
<style scoped>
.breadcrumb-icon {
  height: 14px;
  width: 14px;
  flex-shrink: 0;
  color: var(--b3-theme-on-surface);
}
</style>