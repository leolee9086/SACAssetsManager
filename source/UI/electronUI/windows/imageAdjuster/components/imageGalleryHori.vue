<template>
    <div class="gallery-section">
        <thumbnailGallery
            :items="historyQueue.map(item => ({
                ...item,
                thumbnailUrl: item.thumbnail,
                active: item.path === currentPath
            }))"
            @itemClick="(item, index) => $emit('select', index)">
        </thumbnailGallery>
    </div>
</template>

<script setup>
import thumbnailGallery from '../../../../../UI/components/common/thumbnailGalleryHori.vue'

defineProps({
    historyQueue: {
        type: Array,
        required: true
    },
    currentPath: {
        type: String,
        required: true
    }
});

defineEmits(['select']);
</script>

<style scoped>
.gallery-section {
    height: 130px;
    flex-shrink: 0;
    background: #2a2a2a;
    padding: 10px;
    border-top: 1px solid #3a3a3a;
}
</style>
