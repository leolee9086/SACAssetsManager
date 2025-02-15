<template>
    <div class="common-pannel">
        <div ref="componentContainer" v-if="componentUrl"></div>
        <div v-else class="input-container">
            <input v-model="inputUrl" type="text" class="default-input" placeholder="请输入组件地址">
            <button class="load-button" @click="handleLoad">
                加载
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, inject, ref, watch, onUnmounted } from 'vue'
import { 创建Vue组件界面 } from '../../tab.js';

const appData = inject('appData')
const componentContainer = ref(null)
const inputUrl = ref('')

const componentUrl = computed(() => {
    return appData.data?.$componentURL || null
})

const handleLoad = () => {
    if (inputUrl.value) {
        console.log(inputUrl.value)
        // 更新组件URL
        const tab = appData.tab
        const currentApp = appData.getApp()
        if (currentApp) {
            currentApp.unmount()
        }
        setTimeout(
            () => 创建Vue组件界面(tab, inputUrl.value, 'assetsColumn', {})
        )

    }
}

watch(componentUrl, (newUrl) => {
    if (newUrl && componentContainer.value) {
        // 获取当前应用实例
        const currentApp = appData.getApp()

        // 清理之前的应用实例
        if (currentApp) {
            currentApp.unmount()
        }

        // 从 appData 中获取 tab
        const tab = appData.tab
        if (!tab) {
            console.error('未找到 tab 实例')
            return
        }

        // 创建新的Vue组件实例
        创建Vue组件界面(tab, newUrl, appData.data)
    }
}, { immediate: true })

onUnmounted(() => {
    const currentApp = appData.getApp()
    if (currentApp) {
        currentApp.unmount()
    }
})
</script>

<style scoped>
.common-pannel {
    width: 100%;
    height: 100%;
}

.input-container {
    display: flex;
    gap: 10px;
    margin: 20px;
}

.default-input {
    width: 200px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
}

.load-button {
    height: 32px;
    padding: 0 16px;
    background-color: #409eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.load-button:hover {
    background-color: #66b1ff;
}

.load-button:active {
    background-color: #3a8ee6;
}
</style>
