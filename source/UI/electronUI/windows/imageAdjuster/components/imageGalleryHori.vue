<template>
    <div class="gallery-section">
        <div class="history-gallery">
            <div class="gallery-container" ref="galleryContainer">
                <template v-for="(item, index) in historyQueue" :key="index">
                    <div v-if="item?.path" 
                         class="gallery-item" 
                         :class="{ active: item.path === currentPath }"
                         @click="$emit('select', index)">
                        <img :src="item.thumbnail" :alt="item.name" />
                        <div class="image-name">{{ item.name }}</div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
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

.history-gallery {
    height: 110px;
    position: relative;
    width: 100%;
    background: transparent;
    box-shadow: none;
}

.gallery-container {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    height: 100%;
    padding-bottom: 10px;
}

.gallery-container::-webkit-scrollbar {
    height: 6px;
}

.gallery-container::-webkit-scrollbar-track {
    background: #1e1e1e;
    border-radius: 3px;
}

.gallery-container::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 3px;
}

.gallery-item {
    flex: 0 0 auto;
    width: 100px;
    height: 100px;
    position: relative;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    transition: all 0.2s;
}

.gallery-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.gallery-item.active {
    border-color: orange;
}

.gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 10px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
