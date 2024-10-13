<template>
    <div ref="dropdownContainer">
        <div @click="toggleDropdown" class="multi-select">
            <span v-if="selectedExtensions.length === 0">扩展名</span>
            <span v-else>{{ selectedExtensions.join(', ') }}</span>
            <span class="arrow" :class="{ open: dropdownOpen }">▼</span>
        </div>
        <div v-if="dropdownOpen" class="dropdown">
            <input type="text" v-model="searchQuery" placeholder="搜索扩展名" class="search-input" />
            <div>
                <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" />
                <label>全选/取消全选</label>
            </div>
            <div v-for="extension in filteredExtensions" :key="extension" class="dropdown-item">
                <input type="checkbox" :value="extension" v-model="selectedExtensions" />
                <label>{{ extension }}</label>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted,watch } from 'vue';
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
    options: {
        type: Array,
        default: () => ['jpg', 'png', 'gif', 'bmp', 'svg', 'pdf'] // 默认扩展名列表
    },
    modelValue: {
        type: Array,
        default: () => []
    }
});
const emit = defineEmits(['update:modelValue']);

const selectedExtensions = ref([...props.modelValue]);

// 监听 selectedExtensions 的变化并更新父组件的 v-model
watch(selectedExtensions, (newValue) => {
    emit('update:modelValue', newValue);
});
const dropdownOpen = ref(false);
const searchQuery = ref('');
const dropdownContainer = ref(null);

const toggleDropdown = () => {
    dropdownOpen.value = !dropdownOpen.value;
};

const filteredExtensions = computed(() => {
    return props.options.filter(extension => 
        extension.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
});

const isAllSelected = computed(() => {
    return selectedExtensions.value.length === props.options.length;
});

const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedExtensions.value = [];
    } else {
        selectedExtensions.value = [...props.options];
    }
};

const handleClickOutside = (event) => {
    if (dropdownContainer.value && !dropdownContainer.value.contains(event.target)) {
        dropdownOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.multi-select {
    border: 1px solid #ccc;
    padding: 5px;
    cursor: pointer;
    display: flex; /* 使用 flexbox 布局 */
    align-items: center; /* 垂直居中 */
    position: relative;
    width: 100px;
    overflow: hidden;
    white-space: nowrap; /* 确保文本不换行 */
    text-overflow: ellipsis; /* 超出部分显示省略号 */
    box-sizing: border-box; /* 确保内边距和边框包含在宽度内 */
    flex-grow: 1; /* 允许文本部分扩展 */

}

.arrow {
    transition: transform 0.3s;
    margin-left: auto; /* 确保箭头在最右侧 */
    flex-shrink: 0; /* 防止箭头缩小 */
    position: absolute; /* 绝对定位箭头 */
    right: 5px; /* 距离右侧5px */
    background-color: var(--b3-theme-background);
}
.arrow.open {
    transform: rotate(180deg);
}

.dropdown {
    border: 1px solid #ccc;
    position: absolute;
    background-color: var(--b3-theme-background-light);
    z-index: 1000;
    width: 100%;
    max-width: 100px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 5px;
}

.dropdown-item {
    padding: 5px;
    display: flex;
    align-items: center;
}

.dropdown-item input {
    margin-right: 5px;
}

.search-input {
    width: 100%;
    padding: 5px;
    margin-bottom: 5px;
    box-sizing: border-box;
}
</style>