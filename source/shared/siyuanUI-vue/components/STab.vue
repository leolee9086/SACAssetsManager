<template>
  <div class="layout-tab-container">
    <div class="layout-tab-bar">
      <ul>
        <li 
          v-for="tab in tabs" 
          :key="tab.id"
          class="item"
          :class="{ 
            'item--focus': tab.id === activeTabId,
            'item--pin': tab.pinned 
          }"
          :data-id="tab.id"
          :data-type="'tab-header'"
          draggable="true"
          @click="switchTab(tab.id)"
          @dragstart="handleDragStart($event, tab)"
          @dragend="handleDragEnd"
        >
          <svg v-if="tab.icon" class="item__graphic">
            <use :xlink:href="`#${tab.icon}`"></use>
          </svg>
          <span v-if="tab.docIcon" class="item__icon">{{ renderEmoji(tab.docIcon) }}</span>
          <span class="item__text" :class="{ 'fn__none': tab.pinned && (tab.icon || tab.docIcon) }">{{ tab.title }}</span>
          <span class="item__close" @click.stop="closeTab(tab.id)">
            <svg><use xlink:href="#iconClose"></use></svg>
          </span>
        </li>
      </ul>
    </div>
    <div class="layout-tab-content">
      <div 
        v-for="tab in tabs" 
        :key="tab.id"
        class="fn__flex-1"
        :data-id="tab.id"
        :style="{ display: tab.id === activeTabId ? 'block' : 'none' }"
      >
        <slot :name="tab.id"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps({
  initialTabs: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['tab-change', 'tab-close']);

const tabs = ref(props.initialTabs.map(tab => ({
  ...tab,
  id: tab.id || uuidv4()
})));

const activeTabId = ref(tabs.value.length > 0 ? tabs.value[0].id : null);

const renderEmoji = (unicode) => {
  // 简化的表情符号渲染
  return String.fromCodePoint(parseInt(unicode.replace('U+', ''), 16));
};

const switchTab = (id) => {
  activeTabId.value = id;
  emit('tab-change', id);
};

const closeTab = (id) => {
  const index = tabs.value.findIndex(tab => tab.id === id);
  if (index !== -1) {
    tabs.value.splice(index, 1);
    
    if (activeTabId.value === id && tabs.value.length > 0) {
      // 选择下一个或前一个标签页
      const nextIndex = Math.min(index, tabs.value.length - 1);
      activeTabId.value = tabs.value[nextIndex].id;
      emit('tab-change', activeTabId.value);
    }
    
    emit('tab-close', id);
  }
};

const addTab = (tab) => {
  const newTab = {
    ...tab,
    id: tab.id || uuidv4()
  };
  tabs.value.push(newTab);
  return newTab.id;
};

const pinTab = (id) => {
  const tab = tabs.value.find(tab => tab.id === id);
  if (tab) {
    tab.pinned = true;
    // 将标签移到固定标签区域
    const index = tabs.value.findIndex(tab => tab.id === id);
    if (index !== -1) {
      const pinnedTab = tabs.value.splice(index, 1)[0];
      let lastPinnedIndex = -1;
      for (let i = 0; i < tabs.value.length; i++) {
        if (tabs.value[i].pinned) {
          lastPinnedIndex = i;
        } else {
          break;
        }
      }
      tabs.value.splice(lastPinnedIndex + 1, 0, pinnedTab);
    }
  }
};

const unpinTab = (id) => {
  const tab = tabs.value.find(tab => tab.id === id);
  if (tab) {
    tab.pinned = false;
    // 将标签移到非固定标签区域
    const index = tabs.value.findIndex(tab => tab.id === id);
    if (index !== -1) {
      const unpinnedTab = tabs.value.splice(index, 1)[0];
      let firstUnpinnedIndex = tabs.value.length;
      for (let i = 0; i < tabs.value.length; i++) {
        if (!tabs.value[i].pinned) {
          firstUnpinnedIndex = i;
          break;
        }
      }
      tabs.value.splice(firstUnpinnedIndex, 0, unpinnedTab);
    }
  }
};

// 拖拽处理
const handleDragStart = (event, tab) => {
  event.dataTransfer.setData("text/html", event.target.outerHTML);
  event.dataTransfer.setData("application/siyuan-tab", JSON.stringify({ id: tab.id }));
  event.dataTransfer.dropEffect = "move";
  event.target.style.opacity = "0.1";
};

const handleDragEnd = (event) => {
  event.target.style.opacity = "1";
  // 清理可能的克隆元素
  document.querySelectorAll("li[data-clone='true']").forEach(item => {
    item.remove();
  });
};

// 暴露方法给父组件
defineExpose({
  addTab,
  closeTab,
  switchTab,
  pinTab,
  unpinTab
});
</script>

<style scoped>
.layout-tab-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.layout-tab-bar {
  border-bottom: 1px solid var(--b3-border-color);
}

.layout-tab-bar ul {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.layout-tab-content {
  flex: 1;
  overflow: auto;
}

/* 项目样式 */
.item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-right: 1px solid var(--b3-border-color);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item--focus {
  background-color: var(--b3-theme-background);
}

.item__graphic,
.item__icon {
  margin-right: 4px;
  flex-shrink: 0;
}

.item__text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item__close {
  display: flex;
  align-items: center;
  opacity: 0.7;
  margin-left: 4px;
}

.item__close:hover {
  opacity: 1;
}

.fn__none {
  display: none !important;
}
</style> 