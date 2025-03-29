<template>
  <div class="b3-cards">
    <div v-for="pannel in pannels" :key="pannel.name" class="b3-card b3-card--wrap" @click="打开面板(pannel.name)">
      <div class="b3-card__img">
        <svg class="pannel-icon">
          <use xlink:href="#iconPanel"></use>
        </svg>
      </div>
      <div class="fn__flex-1 fn__flex-column">
        <div class="b3-card__info fn__flex-1">
          {{ pannel.name }}
          <div class="b3-card__desc">
            {{ pannel.description || '暂无描述' }}
          </div>
        </div>
        <div class="b3-card__actions">
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconSettings"></use></svg>
          </span>
          <div class="fn__flex-1"></div>
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconEdit"></use></svg>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import fs from '../../../../polyfills/fs.js'
import { clientApi } from '../../../asyncModules.js'
import { plugin } from '../../../pluginSymbolRegistry.js'

const pannels = ref([])

const 打开面板 = (pannelName) => {
  const tabType = `${pannelName}Tab`
  clientApi.openTab({
    app: plugin.app,
    custom: {
      icon: "iconPanel",
      title: pannelName,
      id: plugin.name + tabType,
      data: {}
    }
  })
}

onMounted(async () => {
  try {
    const pannelPath = '/data/plugins/SACAssetsManager/source/UI/pannels'
    const files = await fs.readDir(pannelPath)
    pannels.value = files.filter(file => file.isDir)
  } catch (error) {
    console.error('读取面板列表失败:', error)
  }
})
</script>

<style scoped>
.b3-card {
  cursor: pointer;
}
</style>
