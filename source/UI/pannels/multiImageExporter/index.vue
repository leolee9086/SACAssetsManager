<template>
  <div class="b3-dialog__content" :style="mobileStyle">
    <canvas id="export-bglayer" class="bglayer"></canvas>
    
    <div class="export-img export-img-multi" 
         :class="{'protyle-wysiwyg--attr': displayBookmarkIcon}"
         :style="contentStyle"
         id="preview">
    </div>

    <div class="config-about__logo fn__flex">
      <div>
        <img src="/stage/icon.png">
        <span>{{ i18n.思源笔记 }}</span>
        <span class="fn__space"></span>
        <span class="ft__on-surface">{{ i18n.重构你的思维 }}</span>
      </div>
      
      <div class="fn__space fn__flex-1" style="text-align:center;color:transparent">
        知行合一&nbsp;经世致用
      </div>
      
      <div>
        <span class="ft__on-surface">{{ i18n.匠造为常 }}</span>
        <span class="fn__space"></span>
        <span>{{ i18n.椽承设计 }}</span>
        <img src="/plugins/modemkiller/logo.png">
      </div>
    </div>

    <div class="fn__hr--b"></div>
    <div class="fn__hr--b"></div>

    <div class="b3-dialog__action">
      <label class="fn__flex">
        {{ languages.exportPDF5 }}
        <span class="fn__space"></span>
        <input id="keepFold" 
               class="b3-switch fn__flex-center" 
               type="checkbox" 
               v-model="keepFold">
      </label>
      
      <span class="fn__flex-1"></span>
      
      <select id="ratio" class="b3-select fn__flex-center fn__size200" v-model="selectedRatio">
        <option value="4/3">4:3</option>
        <option value="3/4">3:4</option>
        <option value="16/9">16:9</option>
        <option value="9/16">9:16</option>
        <option value="21/9">21:9</option>
        <option value="9/21">9:21</option>
        <option value="9/32">9:32</option>
        <option value="32/9">32:9</option>
        <option value="1/1">1:1</option>
        <option value="按分割线">{{ i18n.使用分割线 }}</option>
        <option value="按大纲最高级">{{ i18n.按大纲最高级 }}</option>
      </select>

      <button class="b3-button b3-button--cancel" :disabled="isDisabled">
        {{ languages.cancel }}
      </button>
      <div class="fn__space"></div>
      <button class="b3-button b3-button--text" :disabled="isDisabled">
        {{ languages.confirm }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const isMobile = ref(false) // 这里需要从插件配置中获取
const keepFold = ref(false)
const selectedRatio = ref('4/3')
const isDisabled = ref(false)
const displayBookmarkIcon = computed(() => window.siyuan.config.editor.displayBookmarkIcon)

// 样式计算
const mobileStyle = computed(() => ({
  padding: isMobile.value ? '8px' : '',
  backgroundColor: 'var(--b3-theme-background)'
}))

const contentStyle = computed(() => ({
  padding: isMobile.value ? '16px' : '48px',
  margin: isMobile.value ? '16px 0' : '8px 0 8px',
  border: '1px solid var(--b3-border-color)',
  borderRadius: 'var(--b3-border-radius-b)',
  maxHeight: 'calc(100% - 48px)',
  overflow: 'auto'
}))

// i18n 和 languages 需要从插件配置中导入
const i18n = {
  思源笔记: '思源笔记',
  重构你的思维: '重构你的思维',
  匠造为常: '匠造为常',
  椽承设计: '椽承设计',
  使用分割线: '使用分割线',
  按大纲最高级: '按大纲最高级'
}

const languages = {
  exportPDF5: '保持折叠',
  cancel: '取消',
  confirm: '确认'
}
</script>

<style scoped>
.bglayer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-image: url("/public/siyuan-plugin-background-cover/assets/images/hash-6130f530e783c70.png");
  filter: blur(0px);
  background-position: 50% 50%;
  overflow: hidden;
}

.export-img-multi {
  position: relative;
  isolation: isolate;
}

.config-about__logo {
  z-index: 1;
}

.b3-dialog__action {
  z-index: 1;
}
</style>
