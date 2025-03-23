<template>
  <div class="svg-generator" ref="containerRef">
    <div class="content-container">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 模板选择器始终显示在主界面 -->
        <TemplateSelector 
          :templates="svgTemplates" 
          :selectedIndex="selectedTemplateIndex"
          @select="selectedTemplateIndex = $event" 
        />
        
        <!-- 自定义参数区域 - 使用VFloat -->
        <VFloat 
          v-model:isFloating="customizerFloating" 
          title="编辑SVG参数"
          anchorText="编辑参数面板已浮动"
          @close="customizerFloating = false"
        >
          <TemplateCustomizer 
            v-if="selectedTemplate" 
            :template="selectedTemplate"
            :customValues="customValues"
            @update:values="updateCustomValues"
          />
        </VFloat>
      </div>
      
      <!-- 右侧预览 - 使用VFloat -->
      <div class="right-panel">
        <VFloat 
          v-model:isFloating="previewFloating" 
          title="SVG预览"
          anchorText="预览面板已浮动"
          @close="previewFloating = false"
        >
          <ResultPreview 
            :template="selectedTemplate"
            :customValues="customValues"
            :generateFinalSvg="generateFinalSvg"
          />
        </VFloat>
      </div>
    </div>
    
    <!-- 自适应时显示浮出按钮 -->
    <div v-if="shouldAutoFloat && !anyPanelFloating" class="float-controls">
      <button class="float-button customizer-float" @click="floatCustomizer">
        浮动编辑器
      </button>
      <button class="float-button preview-float" @click="floatPreview">
        浮动预览
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, nextTick, onUnmounted } from 'vue';
import TemplateSelector from './components/TemplateSelector.vue';
import TemplateCustomizer from './components/TemplateCustomizer.vue';
import ResultPreview from './components/ResultPreview.vue';
import VFloat from '../../components/VFloat.vue';
import { useSvgTemplates } from './composables/useSvgTemplates.js';

// 获取SVG模板
const { svgTemplates, generatePreview, generateFinal } = useSvgTemplates();

// 浮动状态
const customizerFloating = ref(false);
const previewFloating = ref(false);
const containerWidth = ref(0);

// 计算是否有任何面板处于浮动状态
const anyPanelFloating = computed(() => 
  customizerFloating.value || previewFloating.value
);

// 容器引用
const containerRef = ref(null);

// 选中的模板索引
const selectedTemplateIndex = ref(0);

// 计算属性：当前选中的模板
const selectedTemplate = computed(() => {
  if (selectedTemplateIndex.value < 0 || selectedTemplateIndex.value >= svgTemplates.value.length) {
    return null;
  }
  return svgTemplates.value[selectedTemplateIndex.value];
});

// 自定义值
const customValues = reactive({});

// 重置自定义值为默认值
const resetCustomValues = () => {
  const newValues = {};
  Object.entries(selectedTemplate.value.customizableFields).forEach(([key, field]) => {
    newValues[key] = field.default;
  });
  
  // 使用Object.assign来一次性更新reactive对象
  Object.assign(customValues, newValues);
};

// 监听选中的模板变化，重置自定义值为默认值
watch(selectedTemplateIndex, () => {
  if (!selectedTemplate.value) return;
  resetCustomValues();
});

// 初始化默认值
watch(selectedTemplate, (template) => {
  if (!template) return;
  resetCustomValues();
}, { immediate: true });

// 更新自定义值
const updateCustomValues = (newValues) => {
  Object.assign(customValues, newValues);
};

// 生成最终SVG
const generateFinalSvg = () => {
  if (!selectedTemplate.value) return '';
  return generateFinal(selectedTemplate.value, customValues);
};

// 响应式布局相关
const shouldAutoFloat = computed(() => {
  return containerWidth.value > 0 && containerWidth.value < 768;
});

// 测量容器宽度
const updateContainerWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.offsetWidth;
  }
};

// 保存上一次检测状态
const lastSpaceState = ref(false);

// 重置浮动状态的辅助函数
const resetFloatingState = () => {
  customizerFloating.value = false;
  previewFloating.value = false;
};

// 自动适应空间布局变化
watch(shouldAutoFloat, (newShouldAutoFloat) => {
  // 只在最初检测到空间不足时自动浮动一次
  if (newShouldAutoFloat && !lastSpaceState.value && !anyPanelFloating.value) {
    // 先确保所有面板关闭
    resetFloatingState();
    
    // 延迟一点再打开预览面板
    setTimeout(() => {
      previewFloating.value = true; // 自动浮动预览区域
    }, 50);
  } else if (!newShouldAutoFloat && anyPanelFloating.value) {
    // 空间足够时自动收回浮动面板
    resetFloatingState();
  }
  
  // 记录当前状态
  lastSpaceState.value = newShouldAutoFloat;
});

// 手动浮动触发器
const floatCustomizer = () => {
  resetFloatingState(); // 先关闭所有面板
  setTimeout(() => {
    customizerFloating.value = true;
  }, 50);
};

const floatPreview = () => {
  resetFloatingState(); // 先关闭所有面板
  setTimeout(() => {
    previewFloating.value = true;
  }, 50);
};

// 初始化ResizeObserver监听容器大小变化
let resizeObserver;

onMounted(() => {
  nextTick(() => {
    updateContainerWidth();
    
    // 创建ResizeObserver监听大小变化
    resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
    });
    
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value);
    }
  });
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
:root {
  --primary-color: #3a86ff;
  --secondary-color: #8338ec;
  --background-color: #f8f9fa;
  --card-background: #ffffff;
  --border-radius: 12px;
  --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  --transition: all 0.3s ease;
}

.svg-generator {
  width: 100%;
  height: 100%;
  min-height: 480px;
  background-color: var(--background-color);
  display: flex;
  flex-direction: column;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  position: relative;
}

.content-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 20px;
  padding: 20px;
  height: 100%;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 280px;
}

.right-panel {
  flex: 1;
  min-width: 280px;
  height: 100%;
}

/* 浮动控制 */
.float-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.float-button {
  padding: 10px 15px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.float-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
}

.customizer-float {
  background-color: #8338ec;
}

.preview-float {
  background-color: #3a86ff;
}

/* 浮动锚点 */
.float-anchor {
  background-color: var(--card-background);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 15px;
  margin: 20px 0;
  text-align: center;
}

.right-anchor {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.anchor-button {
  padding: 10px 15px;
  background-color: #f0f7ff;
  color: var(--primary-color);
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.close-icon {
  font-size: 18px;
  font-weight: bold;
}

@media (max-width: 900px) {
  .content-container {
    flex-direction: column;
  }
  
  .left-panel, .right-panel {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .content-container {
    padding: 12px;
    gap: 12px;
  }
}
</style>
