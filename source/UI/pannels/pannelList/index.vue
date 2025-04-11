<template>
  <div class="b3-cards">
    <div v-for="pannel in pannels" :key="pannel.name" class="b3-card b3-card--wrap">
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
          <!-- 作为Tab打开 -->
          <span class="block__icon block__icon--show" @click.stop="打开面板(pannel.name)" title="作为Tab打开">
            <svg><use xlink:href="#iconTab"></use></svg>
          </span>
          <!-- 作为对话框打开 -->
          <span class="block__icon block__icon--show" @click.stop="openPanelAsDialog(pannel)" title="作为对话框打开">
            <svg><use xlink:href="#iconHelp"></use></svg>
          </span>
          <div class="fn__flex-1"></div>
          <span class="block__icon block__icon--show">
            <svg><use xlink:href="#iconInfo"></use></svg>
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

const openPanelAsDialog = async (panel) => {
  try {
    const { openPanelAsDialog } = await import('../../siyuanCommon/dialog/panelDialog.js');
    openPanelAsDialog(
      panel.name,
      {}, // 传递数据
      panel.name || '面板',
      '80vw',
      '90vh'
    );
  } catch (error) {
    console.error('以对话框方式打开面板失败:', error);
  }
};

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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.b3-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.block__icon {
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.block__icon:hover {
  background-color: var(--b3-theme-background-light);
}
</style>
