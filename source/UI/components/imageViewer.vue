<!-- 图片查看器组件 -->
<script setup>
const props = defineProps({
    当前查看图片: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['关闭', '复制URL', '新窗口打开'])
</script>

<template>
    <div v-if="当前查看图片" 
         class="image-viewer" 
         @click="$emit('关闭')">
        <div class="image-viewer-content" @click.stop>
            <img :src="当前查看图片" alt="查看大图" />
            <div class="image-viewer-toolbar">
                <button @click="$emit('复制URL', 当前查看图片)">复制URL</button>
                <button @click="$emit('新窗口打开', 当前查看图片)">新窗口打开</button>
                <button @click="$emit('关闭')">关闭</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.image-viewer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.image-viewer-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    background-color: #161b22;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.image-viewer-content img {
    max-width: 100%;
    max-height: calc(90vh - 60px);
    object-fit: contain;
    border-radius: 4px;
}

.image-viewer-toolbar {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    justify-content: center;
}

.image-viewer-toolbar button {
    padding: 6px 12px;
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #c9d1d9;
    cursor: pointer;
    font-size: 14px;
}

.image-viewer-toolbar button:hover {
    background-color: #30363d;
}
</style> 