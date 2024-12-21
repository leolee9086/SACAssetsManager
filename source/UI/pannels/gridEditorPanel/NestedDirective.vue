<template>
  <div v-draggable="[modelValue, options]" class="cc-nested-list">
    <template v-for="el in list" :key="el.name">
      <div class="cc-nested-item" :class="{ 'is-folder': el.type === 'folder' }" :data-type="el.type">
        <div class="cc-nested-content">
          <slot name="item" :item="el" :is-collapsed="collapsed[el.name]" :on-toggle="() => toggleCollapse(el.name)">
            <span class="cc-nested-name" :class="{ 'is-collapsed': el.type === 'folder' && collapsed[el.name] }"
              @click="el.type === 'folder' && toggleCollapse(el.name)">
              {{ el.name }}
            </span>
          </slot>

          <div v-if="el.type === 'folder'&&el.children" v-show="!collapsed[el.name]" class="cc-nested-children">
            <nested-directive 
              v-if="el.children"
              v-model="el.children"
              class="cc-nested-sublist">
              <template v-for="(_, name) in $slots" #[name]="slotData">
                <slot :name="name" v-bind="slotData"/>
              </template>
            </nested-directive>
          </div>
        </div>
      </div>
    </template>
    <div v-if="!modelValue?.length" class="cc-nested-empty">
      <span>我是空的</span>
    </div>
  </div>
</template>

<script setup>
import { vDraggable } from '../../../../static/vue-draggable-plus.js'
import { computed, ref } from 'vue'
defineOptions({name:'nested-directive'})


const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  }
})

const emits = defineEmits(['update:modelValue'])

const collapsed = ref({})
const toggleCollapse = (name) => collapsed.value[name] = !collapsed.value[name]
const list = computed({
  get: () => props.modelValue,
  set: value => {console.log(value);emits('update:modelValue', value)}
})


const options = {
  group:{name:'nested'},
  animation: 150,
  handle: '.cc-nested-content',
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  dragClass: 'sortable-drag',
  swapThreshold: 0.65,
  emptyInsertThreshold: 5,
  sort: true,
  put:true,
  immediate:true,
  customUpdate:(evt)=>{
    console.log(evt)
  },
  onMove: function(evt, originalEvent) {
    const draggedEl = evt.dragged
    const relatedEl = evt.related
    
    if (!draggedEl || !relatedEl) return true
    
    const targetType = relatedEl.getAttribute('data-type')
    
    // 如果目标是文件夹，允许放入
    if (targetType === 'folder') {
      return true
    }
    
    // 防止将父文件夹拖入其子文件夹
    const draggedItem = draggedEl.closest('.cc-nested-item')
    const targetItem = relatedEl.closest('.cc-nested-item')
    if (draggedItem && targetItem && draggedItem.contains(targetItem)) {
      return false
    }
    
    return true
  },
  onChange: function(evt) {
    console.log('onChange:', evt)
  },
  onAdd: function(evt) {
    console.log('onAdd:', evt)
  },
  onRemove: function(evt) {
    console.log('onRemove:', evt)
  },
  onDragEnter: function(evt) {
    const targetEl = evt.to
    if (targetEl && targetEl.classList.contains('cc-nested-list')) {
      targetEl.style.backgroundColor = 'var(--cc-theme-primary-lighter)'
    }
    // 如果是文件夹，也高亮显示
    const folderEl = targetEl.closest('.is-folder')
    if (folderEl) {
      const content = folderEl.querySelector('.cc-nested-content')
      if (content) {
        content.style.backgroundColor = 'var(--cc-theme-primary-lighter)'
      }
    }
  },
  onDragLeave: function(evt) {
    const sourceEl = evt.from
    if (sourceEl && sourceEl.classList.contains('cc-nested-list')) {
      sourceEl.style.backgroundColor = ''
    }
    // 清除文件夹的高亮
    const folderEl = sourceEl.closest('.is-folder')
    if (folderEl) {
      const content = folderEl.querySelector('.cc-nested-content')
      if (content) {
        content.style.backgroundColor = ''
      }
    }
  },
  onEnd: function(evt) {
    // 清除所有可能的高亮状态
    document.querySelectorAll('.cc-nested-list, .cc-nested-content').forEach(el => {
      el.style.backgroundColor = ''
    })
  }
}
</script>

<style scoped>
.cc-nested-list {
  min-height: 50px;
  padding: var(--cc-space-xs);
  list-style: none;
  background: var(--cc-theme-surface-lighter);
  border-radius: var(--cc-border-radius);
  transition: background-color 0.2s ease;
}

.cc-nested-sublist {
  width: 100%;
  min-height: 20px;
}

.cc-nested-children {
  margin-left: var(--cc-space-md);
  padding-left: var(--cc-space-sm);
  border-left: 1px solid var(--cc-border-color);
  min-height: 20px;
}

.cc-nested-item {
  margin: var(--cc-space-xs) 0;
  border-radius: var(--cc-border-radius);
  transition: all 0.2s ease;
}

.cc-nested-content {
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface);
  border-radius: var(--cc-border-radius);
  cursor: move;
  display: flex;
  flex-direction: column;
  gap: var(--cc-space-xs);
  border: 1px solid var(--cc-border-color);
  transition: all 0.2s ease;
}

.cc-nested-content:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.cc-nested-name {
  display: flex;
  align-items: center;
  gap: var(--cc-space-sm);
  color: var(--cc-theme-on-background);
  user-select: none;
  font-size: 0.9em;
}

.is-folder>.cc-nested-content {
  background: var(--cc-theme-surface-light);
  border-color: var(--cc-border-color);
}

.is-folder>.cc-nested-content:hover {
  background: var(--cc-theme-surface);
}

.is-folder>.cc-nested-content>.cc-nested-name::before {
  content: '📁';
  font-size: 0.9em;
  opacity: 0.8;
}

.cc-nested-children {
  margin-left: var(--cc-space-md);
  padding-left: var(--cc-space-sm);
  border-left: 1px solid var(--cc-border-color);
  min-height: 20px;
}

/* 拖拽状态样式 */
.sortable-ghost {
  opacity: 0.5;
  background: var(--cc-theme-surface-lighter) !important;
}

.sortable-chosen {
  background: var(--cc-theme-surface-lighter);
}

.sortable-drag {
  opacity: 0.9;
  background: var(--cc-theme-surface) !important;
}

/* 修改折叠状态的样式 */
.cc-nested-name.is-collapsed::before {
  content: '📂' !important;
  display: inline-block;
}

.cc-nested-empty {
  padding: var(--cc-space-sm);
  margin: var(--cc-space-xs) 0;
  color: var(--cc-theme-on-surface-disabled);
  font-size: 0.9em;
  text-align: center;
  user-select: none;
  background: var(--cc-theme-surface-lighter);
  border-radius: var(--cc-border-radius);
}

.is-folder > .cc-nested-content:hover {
  background: var(--cc-theme-surface-light);
  cursor: pointer;
}
</style>
