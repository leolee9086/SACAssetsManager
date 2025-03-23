<template>
  <VWindow 
    v-model:isFloating="isWindowOpen"
    :window-data="componentData"
    @data-updated="handleDataUpdate"
    title="我的组件窗口">
    <div class="my-component">
      <!-- 你的组件内容 -->
      <button @click="openWindow">打开窗口</button>
    </div>
  </VWindow>
</template>

<script setup>
import { ref } from 'vue';
import VWindow from '../../components/VWindow.vue';

const isWindowOpen = ref(false);
const componentData = ref({
  // 需要在窗口间共享的数据
  count: 0,
  items: []
});

const openWindow = () => {
  isWindowOpen.value = true;
};

const handleDataUpdate = (updatedData) => {
  // 合并更新的数据
  componentData.value = {...componentData.value, ...updatedData};
};
</script>
