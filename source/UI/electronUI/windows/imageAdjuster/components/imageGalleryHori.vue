<template>
    <div class="gallery-section fn__flex">
        <div class="folder-gallery">
            <div 
                v-for="folder in folders" 
                :key="folder"
                :class="['folder-item', { active: selectedFolder === folder }]"
                @click="handleFolderSelect(folder)"
                :title="folder"
            >
                <i class="icon icon-folder"></i>
                <span class="folder-name">{{ folder }}</span>
            </div>
            <div 
                class="folder-item"
                :class="{ active: selectedFolder === '' }"
                @click="handleFolderSelect('')"
            >
                <i class="icon icon-all"></i>
                <span class="folder-name">全部图片</span>
            </div>
        </div>
        
        <thumbnailGallery
            :items="filteredImages.map(item => ({
                ...item,
                thumbnailUrl: item.thumbnail,
                active: item.path === currentPath
            }))"
            @itemClick="(item, index) => $emit('select', getOriginalIndex(index))">
        </thumbnailGallery>
    </div>
</template>

<script setup>
import thumbnailGallery from '../../../../../UI/components/common/thumbnailGalleryHori.vue'
import { ref, computed } from 'vue'

const props = defineProps({
    historyQueue: {
        type: Array,
        required: true
    },
    currentPath: {
        type: String,
        required: true
    }
});

const selectedFolder = ref('');

const folders = computed(() => {
    const folderSet = new Set(
        props.historyQueue.map(item => {
            const normalizedPath = item.path.replace(/\\/g, '/');
            return normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        })
    );
    return Array.from(folderSet).filter(Boolean).sort();
});

const emit = defineEmits(['select', 'folderChange']);

const handleFolderSelect = (folder) => {
    selectedFolder.value = folder;
    emit('folderChange', folder);
};

const filteredImages = computed(() => {
    if (!selectedFolder.value) {
        return props.historyQueue;
    }
    
    return props.historyQueue.filter(item => {
        const normalizedPath = item.path.replace(/\\/g, '/');
        const itemFolder = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        return itemFolder === selectedFolder.value;
    });
});

const getOriginalIndex = (filteredIndex) => {
    if (!selectedFolder.value) {
        return filteredIndex;
    }
    
    const filteredItem = filteredImages.value[filteredIndex];
    return props.historyQueue.findIndex(item => item.path === filteredItem.path);
};
</script>

<style scoped>
.gallery-section {
    height: 130px;
    flex-shrink: 0;
    background: #2a2a2a;
    padding: 10px;
    border-top: 1px solid #3a3a3a;
    gap: 10px;
}

.folder-gallery {
    width: 150px;
    flex-shrink: 0;
    overflow-y: auto;
    border-right: 1px solid #3a3a3a;
    padding-right: 10px;
}

.folder-item {
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    border-radius: 4px;
    margin-bottom: 4px;
    color: #fff;
    transition: background-color 0.2s;
}

.folder-item:hover {
    background-color: #3a3a3a;
}

.folder-item.active {
    background-color: #4a4a4a;
}

.folder-item .icon {
    margin-right: 8px;
    font-size: 16px;
    color: #888;
}

.folder-name {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
}

.folder-gallery::-webkit-scrollbar {
    width: 4px;
}

.folder-gallery::-webkit-scrollbar-track {
    background: #2a2a2a;
}

.folder-gallery::-webkit-scrollbar-thumb {
    background: #4a4a4a;
    border-radius: 2px;
}

.folder-gallery::-webkit-scrollbar-thumb:hover {
    background: #555;
}
</style>
