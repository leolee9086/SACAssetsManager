<template>
    <div ref="dropdownContainer">
        <div @click="toggleDropdown" class="multi-select">
            <span v-if="selectedExtensions.length === 0">{{ placeholder }}</span>
            <span v-else>{{ selectedExtensions.join(', ') }}</span>
            <span class="arrow" :class="{ open: dropdownOpen }">▼</span>
        </div>
        <div v-if="dropdownOpen" class="dropdown">
            <div class="dropdown-header">
                <input type="text" v-model="searchQuery" :placeholder="searchPlaceholder" class="search-input" />
                <div class="select-all">
                    <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" />
                    <label>{{ selectAllLabel }}</label>
                </div>
            </div>
            <div class="dropdown-content">
                <div v-for="extension in filteredExtensions" :key="extension" class="dropdown-item">
                    <input type="checkbox" :value="extension" v-model="selectedExtensions" />
                    <label>{{ extension }}</label>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
    options: {
        type: Array,
        default: () => ['jpg', 'png', 'gif', 'bmp', 'svg', 'pdf'] // 默认扩展名列表
    },
    modelValue: {
        type: Array,
        default: () => []
    },
    placeholder: {
        type: String,
        default: '扩展名' // 默认占位符
    },
    searchPlaceholder: {
        type: String,
        default: '搜索扩展名' // 默认搜索框占位符
    },
    selectAllLabel: {
        type: String,
        default: '全选/取消全选' // 默认全选标签
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
    border: 1px solid var(--b3-border-color);
    padding: 8px 24px 8px 8px; /* 增加内边距，右侧留出箭头空间 */
    cursor: pointer;
    display: flex;
    align-items: center;
    position: relative;
    min-width: 120px; /* 设置最小宽度 */
    background-color: var(--b3-menu-background);
    border-radius: 4px; /* 添加圆角 */
}

.arrow {
    transition: transform 0.3s;
    position: absolute;
    right: 8px;
    color: var(--b3-theme-on-surface);
    font-size: 12px; /* 调整箭头大小 */
}

.arrow.open {
    transform: rotate(180deg);
}

.dropdown {
    border: 1px solid var(--b3-border-color);
    position: absolute;
    background-color: var(--b3-menu-background);
    z-index: 1000;
    width: 200px;
    max-height: 300px;
    margin-top: 4px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
}

.dropdown-header {
    position: sticky;
    top: 0;
    background-color: var(--b3-menu-background);
    padding: 8px;
    border-bottom: 1px solid var(--b3-border-color);
    z-index: 1;
}

.select-all {
    display: flex;
    align-items: center;
    padding: 6px 0;
    margin-top: 4px;
}

.dropdown-content {
    overflow-y: auto;
    padding: 8px;
}

.dropdown-item {
    padding: 6px 8px;
    display: flex;
    align-items: center;
    cursor: pointer;
}

.dropdown-item:hover {
    background-color: var(--b3-list-hover); /* 添加悬停效果 */
}

.dropdown-item input {
    margin-right: 5px;
}

.search-input {
    padding: 6px 8px;
    border: 1px solid var(--b3-border-color);
    border-radius: 4px;
    background-color: var(--b3-menu-background);
    color: var(--b3-theme-on-background);
}
</style>