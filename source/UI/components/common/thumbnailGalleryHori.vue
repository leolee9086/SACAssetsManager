<template>
    <div class="thumbnail-gallery" @wheel="horizontalScroll">
        <div class="gallery-container">
            <div class="fn__space"></div>
            <template v-for="(item, i) in items" :key="i">
                <div class="thumbnail-item"
                    :class="{ 
                        'thumbnail-item--active': item.active,
                        'thumbnail-item--bordered': item.show && showBorder
                    }"
                    @click="$emit('itemClick', item, i)"
                    @contextmenu="$emit('itemContextMenu', item, $event)">
                    <div class="thumbnail-image">
                        <img :src="item.thumbnailUrl" 
                             @error="$emit('imageError', $event)"
                             :alt="item.name">
                    </div>
                    <div class="thumbnail-info">
                        <div class="thumbnail-name">{{ item.name }}</div>
                        <slot name="extra-info" :item="item"></slot>
                    </div>
                </div>
                <div class="fn__space"></div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { horizontalScroll } from '../../utils/scroll.js'

defineProps({
    items: {
        type: Array,
        required: true
    },
    showBorder: {
        type: Boolean,
        default: false
    }
})

defineEmits(['itemClick', 'itemContextMenu', 'imageError'])
</script>

<style>
.thumbnail-gallery {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 140px;
    min-height: 140px;
}

.gallery-container {
    display: flex;
    height: 100%;
    padding-bottom: 8px;
}

.thumbnail-item {
    border-radius: 15px;
    min-width: 80px;
    width: 80px;
    height: 80px;
    background-color: var(--b3-theme-background-light);
    cursor: pointer;
    transition: all 0.2s;
}

.thumbnail-image {
    border-radius: 15px;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.thumbnail-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.thumbnail-info {
    text-align: center;
}

.thumbnail-name {
    font-size: small;
    overflow: hidden;
    text-overflow: ellipsis;
}

.thumbnail-item--active {
    color: aqua;
    border-color: aqua;
    border-width: 1px;
    border-style: ridge;
}

.thumbnail-item--bordered {
    border: 1px solid var(--b3-theme-primary);
    box-shadow: 0 0 3px var(--b3-theme-primary);
}
</style>
