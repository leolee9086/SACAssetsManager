<template>
    <div class="performance-panel">
        <!-- 添加直方图部分 -->
        <HistogramPanel v-model:channels="channels" :sharp-object="sharpObject" @histogram-updated="handleHistogramUpdate" />

        <!-- 性能信息 -->
        <div class="performance-stats">
            <div class="performance-item">
                处理时间: {{ stats.processingTime || 0 }} ms
            </div>
            <div class="performance-item">
                内存使用: {{ stats.memoryUsage || 0 }} MB
            </div>
            <div class="image-info">
                <div class="info-item">图像路径: {{ imagePath }}</div>
                <div class="info-item">原始尺寸: {{ imageInfo?.width || 0 }}*{{ imageInfo?.height || 0 }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import HistogramPanel from './HistogramPanel.vue';
import { ref } from 'vue';

const props = defineProps({
    stats: {
        type: Object,
        default: () => ({
            processingTime: 0,
            memoryUsage: 0
        })
    },
    sharpObject: {
        type: Object,
        default: null
    },
    imagePath: {
        type: String,
        default: ''
    },
    imageInfo: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['histogram-updated']);

const channels = ref([
    { key: 'r', label: 'R', color: '#ff0000', visible: true },
    { key: 'g', label: 'G', color: '#00ff00', visible: true },
    { key: 'b', label: 'B', color: '#0000ff', visible: true },
    { key: 'brightness', label: '亮度', color: 'white', visible: true }
]);

const handleHistogramUpdate = (result) => {
    emit('histogram-updated', result);
};
</script>

<style scoped>
.performance-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
}

.performance-stats {
    border-top: 1px solid #3a3a3a;
    padding-top: 12px;
    margin-top: 12px;
}

.performance-item {
    color: #fff;
    font-size: 12px;
    margin-bottom: 4px;
}

.image-info {
    padding: 8px;
    background: #2a2a2a;
    border-radius: 4px;
}

.info-item {
    color: #fff;
    font-size: 12px;
    margin-bottom: 4px;
}

:deep(.histogram-panel) {
    min-height: 150px;
    background: #2a2a2a;
    border-radius: 4px;
    padding: 8px;
}
</style>
