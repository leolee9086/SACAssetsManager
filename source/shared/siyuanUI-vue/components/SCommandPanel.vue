<template>
  <SDialog 
    :visible="visible" 
    :title="title" 
    :width="width" 
    :height="height"
    :data-key="dataKey"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="fn__flex-column">
      <div class="b3-form__icon search__header" style="border-top: 0;border-bottom: 1px solid var(--b3-theme-surface-lighter);">
        <svg class="b3-form__icon-icon"><use xlink:href="#iconSearch"></use></svg>
        <input 
          class="b3-text-field b3-text-field--text" 
          style="padding-left: 32px !important;"
          ref="inputRef"
          v-model="searchText"
          @keydown="handleKeydown"
          @input="handleInput"
          @compositionend="handleCompositionEnd"
        >
      </div>
      <SList background id="commands" ref="listRef">
        <SListItem 
          v-for="(item, index) in filteredCommands" 
          :key="index"
          :focus="index === focusIndex"
          :command="item.command"
          :hidden="item.hidden"
          @click="handleCommandClick(item)"
        >
          {{ item.text }}
          <template #meta>
            <span>{{ item.hotkey }}</span>
          </template>
        </SListItem>
      </SList>
      <div class="search__tip">
        <kbd>↑/↓</kbd> {{ searchTip1 }}
        <kbd>{{ enterKey }}/{{ clickText }}</kbd> {{ confirmText }}
        <kbd>Esc</kbd> {{ closeText }}
      </div>
    </div>
  </SDialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import SDialog from './SDialog.vue';
import SList from './SList.vue';
import SListItem from './SListItem.vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '命令面板'
  },
  width: {
    type: String,
    default: '80vw'
  },
  height: {
    type: String,
    default: '70vh'
  },
  dataKey: {
    type: String,
    default: 'command-panel'
  },
  commands: {
    type: Array,
    default: () => []
  },
  searchTip1: {
    type: String,
    default: '上下选择'
  },
  enterKey: {
    type: String,
    default: 'Enter'
  },
  clickText: {
    type: String,
    default: '点击'
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  closeText: {
    type: String,
    default: '关闭'
  }
});

const emit = defineEmits(['update:visible', 'command-click']);

const searchText = ref('');
const focusIndex = ref(0);
const inputRef = ref(null);
const listRef = ref(null);

const filteredCommands = computed(() => {
  if (!searchText.value) return props.commands;
  
  const input = searchText.value.toLowerCase();
  return props.commands.map(item => {
    const text = item.text.toLowerCase();
    const command = item.command.toLowerCase();
    const isVisible = text.includes(input) || input.includes(text) || 
                     command.includes(input) || input.includes(command);
    
    return {
      ...item,
      hidden: !isVisible
    };
  });
});

const visibleCommands = computed(() => {
  return filteredCommands.value.filter(item => !item.hidden);
});

watch(() => props.visible, (val) => {
  if (val) {
    searchText.value = '';
    focusIndex.value = 0;
    setTimeout(() => {
      inputRef.value?.focus();
    }, 50);
  }
});

const handleKeydown = (event) => {
  if (event.isComposing) return;
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusIndex.value = (focusIndex.value + 1) % visibleCommands.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusIndex.value = (focusIndex.value - 1 + visibleCommands.value.length) % visibleCommands.value.length;
  } else if (event.key === 'Enter') {
    const command = visibleCommands.value[focusIndex.value];
    if (command) {
      handleCommandClick(command);
    }
  } else if (event.key === 'Escape') {
    emit('update:visible', false);
  }
};

const handleInput = (event) => {
  if (event.isComposing) return;
  focusIndex.value = 0;
};

const handleCompositionEnd = () => {
  focusIndex.value = 0;
};

const handleCommandClick = (command) => {
  emit('command-click', command);
  emit('update:visible', false);
};

onMounted(() => {
  if (props.visible) {
    inputRef.value?.focus();
  }
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 