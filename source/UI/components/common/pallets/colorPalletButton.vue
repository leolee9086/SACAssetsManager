<template>
    <div @click="() => 打开颜色查找面板(colorItem.color)" :style="计算素材颜色按钮样式(colorItem.color)">
    </div>
</template>
<script setup>
import { 计算素材颜色按钮样式 } from '../assetStyles.js';
import { plugin } from 'runtime'
function 打开颜色查找面板(color) {
    plugin.eventBus.emit('click-galleryColor', color)
}
defineProps(['colorItem'])
</script>
