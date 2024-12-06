<template>
    <div class="thumbnail-gallery" 
         @wheel="horizontalScroll"
         @keydown="handleKeyNavigation"
         role="listbox"
         tabindex="0">
        <div class="gallery-container">
            <div class="fn__space"></div>
            <template v-for="(item, i) in items" :key="i">
                <div class="thumbnail-item"
                    :class="{ 
                        'thumbnail-item--active': item.active,
                        'thumbnail-item--current': i === currentIndex,
                        'thumbnail-item--bordered': item.show && showBorder
                    }"
                    @click="handleItemClick(item, i)"
                    @contextmenu="$emit('itemContextMenu', item, $event)"
                    role="option"
                    :aria-selected="item.active"
                    :tabindex="i === currentIndex ? 0 : -1">
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
import { ref } from 'vue'

const props = defineProps({
    items: {
        type: Array,
        required: true
    },
    showBorder: {
        type: Boolean,
        default: false
    },
    itemWidth: {
        type: Number,
        default: 80
    },
    itemHeight: {
        type: Number,
        default: 80
    },
    galleryHeight: {
        type: Number,
        default: 140
    },
    loadingPlaceholder: {
        type: String,
        default: ''
    },
    errorPlaceholder: {
        type: String,
        default: ''
    },
    defaultCurrentIndex: {
        type: Number,
        default: -1
    }
})

const emit = defineEmits(['itemClick', 'itemContextMenu', 'imageError', 'activeIndexChange'])

// 当前导航位置的索引
const currentIndex = ref(props.defaultCurrentIndex)

// 处理键盘导航
const handleKeyNavigation = (event) => {
    if (!props.items.length) return
    
    let newIndex = currentIndex.value
    
    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault()
            newIndex = Math.max(0, currentIndex.value - 1)
            break
        case 'ArrowRight':
            event.preventDefault()
            newIndex = Math.min(props.items.length - 1, currentIndex.value + 1)
            break
        case 'Home':
            event.preventDefault()
            newIndex = 0
            break
        case 'End':
            event.preventDefault()
            newIndex = props.items.length - 1
            break
        case 'Enter':
        case ' ': // 空格键
            event.preventDefault()
            if (currentIndex.value >= 0) {
                const item = props.items[currentIndex.value]
                handleItemClick(item, currentIndex.value)
            }
            return
        default:
            return
    }

    if (newIndex !== currentIndex.value) {
        currentIndex.value = newIndex
        scrollToItem(newIndex)
    }
}

// 处理项目点击
const handleItemClick = (item, index) => {
    emit('itemClick', item, index)
    emit('activeIndexChange', index)
}

// 滚动到选中项
const scrollToItem = (index) => {
    const gallery = document.querySelector('.thumbnail-gallery')
    const item = gallery.querySelectorAll('.thumbnail-item')[index]
    if (item) {
        const scrollLeft = item.offsetLeft - (gallery.clientWidth / 2) + (item.clientWidth / 2)
        gallery.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        })
    }
}
</script>

<style>
.thumbnail-gallery {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 140px;
    min-height: 140px;
}

.thumbnail-gallery::-webkit-scrollbar {
    height: 6px;
}

.thumbnail-gallery::-webkit-scrollbar-thumb {
    background-color: var(--b3-scrollbar-thumb);
    border-radius: 3px;
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
    border: 2px solid var(--b3-theme-primary);
    box-shadow: 0 0 3px var(--b3-theme-primary);
}

.thumbnail-item--current {
    border: 2px dashed var(--b3-theme-secondary, #666);
    box-shadow: 0 0 3px var(--b3-theme-secondary, #666);
}

/* 当同时具有current和active状态时的样式 */
.thumbnail-item--current.thumbnail-item--active {
    border: 2px solid var(--b3-theme-primary);
    outline: 2px dashed var(--b3-theme-secondary, #666);
    outline-offset: 2px;
}

.thumbnail-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.thumbnail-image--loading {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
}

/* 添加焦点样式 */
.thumbnail-gallery:focus {
    outline: 2px solid var(--b3-theme-primary);
    outline-offset: 2px;
}

.thumbnail-item:focus {
    outline: none; /* 移除默认的outline样式 */
}
</style>
