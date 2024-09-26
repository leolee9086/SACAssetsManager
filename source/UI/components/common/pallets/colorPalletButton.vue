<template>
    <div @click="() => 打开颜色资源视图(colorItem.color)" :style="计算素材颜色按钮样式(colorItem.color)">
    </div>
</template>
<script setup>
import { 计算素材颜色按钮样式 } from '../assetStyles.js';
import { 打开颜色资源视图 } from '../../../siyuanCommon/tabs/assetsTab.js';
defineProps(['colorItem'])
</script>
