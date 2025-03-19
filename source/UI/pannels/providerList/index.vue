<template>
  <div class="fn__flex-column">
    <div class="fn__flex">
      <div class="provider-container">
        <!-- 左侧供应商列表 -->
        <div class="provider-list-container">
          <ProviderListPanel :providers="providers" v-model:selectedProviderId="selectedProviderId"
            @addProvider="addProviderAddress" />
        </div>

      </div>
      <!-- 右侧模型列表 -->
      <div class="model-list-container">
        <ModelContainer :providerId="selectedProviderId" :providerName="getSelectedProviderName()" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { providerList } from '../../../../assets/modelProviders/index.js'
import ProviderListPanel from './components/ProviderListPanel.vue'
import ModelContainer from './components/ModelContainer.vue'

// 响应式状态
const providers = ref(providerList)
const selectedProviderId = ref('')

// 方法
const addProviderAddress = () => {
  console.log('添加供应商地址')
}

// 获取当前选中供应商的名称
const getSelectedProviderName = () => {
  const provider = providers.value.find(p => p.id === selectedProviderId.value)
  return provider ? provider.name : ''
}
</script>
