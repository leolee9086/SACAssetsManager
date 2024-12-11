<template>
  <div class="cc-wnd" :class="{ 'cc-wnd--active': isActive }" v-show="visible">
    <!-- 标题栏 -->
    <div class="cc-wnd__header" v-if="!config?.hideHeader">
      <div class="cc-wnd__tabs" :class="{ 'cc-wnd__tabs--single': config?.singleTab }">
        <template v-if="config?.singleTab">
          <!-- 单标签模式 -->
          <div v-if="currentTab" 
            class="cc-wnd__tab cc-wnd__tab--active"
          >
            {{ currentTab.title }}
            <div class="cc-wnd__tab-controls" v-if="!config?.hideControls">
              <span v-if="config?.floatable" class="cc-wnd__tab-float" @click.stop="toggleTabFloat(currentTab)">
                {{ isTabFloating(currentTab.id) ? '固定' : '浮动' }}
              </span>
              <span v-if="config?.closable" class="cc-wnd__tab-close" @click.stop="closeTab(currentTab.id)">×</span>
            </div>
          </div>
        </template>
        <template v-else>
          <!-- 多标签模式 -->
          <div v-for="tab in tabs" 
            :key="tab.id"
            class="cc-wnd__tab"
            :class="{'cc-wnd__tab--active': currentTab?.id === tab.id}"
            @click="switchTab(tab.id)"
            draggable="true"
            @dragstart="handleDragStart($event, tab)"
            @dragend="handleDragEnd"
          >
            {{ tab.title }}
            <div class="cc-wnd__tab-controls" v-if="!config?.hideControls">
              <span v-if="config?.floatable" class="cc-wnd__tab-float" @click.stop="toggleTabFloat(tab)">
                {{ isTabFloating(tab.id) ? '固定' : '浮动' }}
              </span>
              <span v-if="config?.closable" class="cc-wnd__tab-close" @click.stop="closeTab(tab.id)">×</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="cc-wnd__content">
      <template v-for="tab in tabs" :key="tab.id">
        <div 
          v-show="currentTab?.id === tab.id && !isTabFloating(tab.id)"
          class="cc-wnd__content-container"
          :ref="el => setTabContainer(tab.id, el)"
        >
          <div :id="`wnd-content-${tab.id}`" class="cc-wnd__render-container"></div>
        </div>
      </template>
    </div>

    <!-- 浮动窗口 -->
    <FloatLayerWindow
      v-for="tab in floatingTabs"
      :key="tab.id"
      :visible="true"
      :title="tab.title"
      :initialWidth="600"
      :initialHeight="400"
      :initialX="200"
      :initialY="100"
      @update:visible="handleFloatClose(tab.id)"
    >
      <div 
        class="cc-wnd__content-container"
        :ref="el => setTabContainer(tab.id, el)"
      >
        <div :id="`wnd-content-${tab.id}`" class="cc-wnd__render-container"></div>
      </div>
    </FloatLayerWindow>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import FloatLayerWindow from '../floatLayerWindow/floatLayerWindow.vue';

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  tabs: {
    type: Array,
    default: () => []
  },
  renderers: {
    type: Object,
    default: () => ({})
  },
  config: {
    type: Object,
    default: () => ({
      singleTab: false,
      hideHeader: false,
      hideControls: false,
      closable: true,
      floatable: true
    })
  }
});

const emit = defineEmits(['tab-switch', 'tab-close', 'tab-drag', 'close']);

// 状态
const visible = ref(true);
const isActive = ref(false);
const floatingTabs = ref(new Set());
const renderedTabs = ref(new Set());

// 当前激活的标签页
const currentTab = computed(() => {
  if (props.config.singleTab) {
    return props.tabs[0];
  }
  return props.tabs.find(tab => !isTabFloating(tab.id)) || props.tabs[0];
});

// 获取浮动标签页
const floatingTabsList = computed(() => {
  return props.tabs.filter(tab => isTabFloating(tab.id));
});

// 检查标签页是否处于浮动状态
const isTabFloating = (tabId) => {
  return floatingTabs.value.has(tabId);
};

// 切换标签页
const switchTab = (tabId) => {
  if (!isTabFloating(tabId)) {
    emit('tab-switch', tabId);
  }
};

// 关闭标签页
const closeTab = (tabId) => {
  if (isTabFloating(tabId)) {
    floatingTabs.value.delete(tabId);
  }
  emit('tab-close', tabId);
};

// 切换标签页的浮动状态
const toggleTabFloat = (tab) => {
  if (isTabFloating(tab.id)) {
    floatingTabs.value.delete(tab.id);
  } else {
    floatingTabs.value.add(tab.id);
  }
  floatingTabs.value = new Set(floatingTabs.value);
};

// 处理浮动窗口关闭
const handleFloatClose = (tabId) => {
  floatingTabs.value.delete(tabId);
  floatingTabs.value = new Set(floatingTabs.value);
};

// 渲染器相关
const setTabContainer = (tabId, el) => {
  if (el && !renderedTabs.value.has(tabId) && props.renderers[tabId]) {
    renderContent(tabId, el);
  }
};

const renderContent = async (tabId, container) => {
  const renderer = props.renderers[tabId];
  if (!renderer) return;

  try {
    const renderContainer = container.querySelector(`#wnd-content-${tabId}`);
    if (!renderContainer) return;

    if (typeof renderer === 'function') {
      await renderer(renderContainer);
    } else if (renderer instanceof Element) {
      renderContainer.appendChild(renderer);
    } else if (typeof renderer === 'object' && renderer.mount) {
      await renderer.mount(renderContainer);
    }
    renderedTabs.value.add(tabId);
  } catch (error) {
    console.error(`Failed to render tab ${tabId}:`, error);
  }
};

// 监听标签页变化
watch(() => props.tabs, (newTabs) => {
  // 清理已不存在的标签页
  const currentTabIds = new Set(newTabs.map(tab => tab.id));
  [...renderedTabs.value].forEach(tabId => {
    if (!currentTabIds.has(tabId)) {
      renderedTabs.value.delete(tabId);
    }
  });
  
  // 清理不存在的浮动标签页
  [...floatingTabs.value].forEach(tabId => {
    if (!currentTabIds.has(tabId)) {
      floatingTabs.value.delete(tabId);
    }
  });
}, { deep: true });

// 组件卸载时清理
onBeforeUnmount(() => {
  renderedTabs.value.clear();
  floatingTabs.value.clear();
});
</script>

<style>
.cc-wnd {
  display: flex;
  flex-direction: column;
  background: var(--cc-theme-background);
  border: 1px solid var(--cc-border-color);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: 100%;
  min-height: 0;
}

.cc-wnd__header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: var(--cc-theme-background-secondary);
  cursor: move;
  flex-shrink: 0;
}

.cc-wnd__tabs {
  display: flex;
  flex: 1;
  overflow-x: auto;
}

.cc-wnd__tab {
  padding: 4px 8px;
  margin-right: 2px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
}

.cc-wnd__tab--active {
  background: var(--cc-theme-primary);
  color: white;
}

.cc-wnd__tab-close {
  margin-left: 4px;
  opacity: 0.7;
}

.cc-wnd__tab-close:hover {
  opacity: 1;
}

.cc-wnd__content {
  flex: 1;
  overflow: auto;
  position: relative;
  min-height: 0;
}

/* 添加标签页控制按钮样式 */
.cc-wnd__tab-controls {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.cc-wnd__tab-float,
.cc-wnd__tab-close {
  opacity: 0.7;
  cursor: pointer;
  padding: 0 4px;
}

.cc-wnd__tab-float:hover,
.cc-wnd__tab-close:hover {
  opacity: 1;
}

.cc-wnd__content-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

.cc-wnd__render-container {
  height: 100%;
  width: 100%;
}

.cc-wnd__tabs--single {
  .cc-wnd__tab {
    flex: 1;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--cc-background-secondary);
  }
}
</style>
