<template>
  <div class="cc-tree-node" :class="[node.type, { 'cc-tree-node--focus': isFocused }]">
    <div 
      class="cc-tree-item"
      :style="{ '--file-toggle-width': `${indent}px` }"
      :draggable="draggable"
      :data-type="node.type"
      :data-path="node.path"
    >
      <!-- 展开/折叠按钮 -->
      <span 
        class="cc-tree-item__toggle"
        :class="{ 'fn__hidden': !hasChildren }"
        :style="{ 'padding-left': `${indent - 18}px` }"
        @click="toggleNode"
      >
        <svg class="cc-tree-item__arrow" :class="{ 'cc-tree-item__arrow--open': isExpanded }">
          <use xlink:href="#iconRight"></use>
        </svg>
      </span>

      <!-- 节点图标 -->
      <slot 
        name="icon" 
        :node="node"
        :is-expanded="isExpanded"
      >
        <span class="cc-tree-item__icon" aria-label="修改图标">
          {{ node.icon || '📄' }}
        </span>
      </slot>
      
      <!-- 节点内容 -->
      <slot 
        name="content"
        :node="node"
      >
        <span 
          class="cc-tree-item__text" 
          :data-position="node.position"
          :aria-label="node.ariaLabel"
        >
          {{ node.title }}
        </span>
      </slot>

      <!-- 操作按钮 -->
      <slot name="actions">
        <span 
          v-if="node.showMoreAction"
          data-type="more-file" 
          class="cc-tree-item__action" 
          aria-label="更多"
        >
          <svg><use xlink:href="#iconMore"></use></svg>
        </span>
        <span 
          v-if="node.showAddAction"
          data-type="new" 
          class="cc-tree-item__action" 
          aria-label="新建子文档"
        >
          <svg><use xlink:href="#iconAdd"></use></svg>
        </span>
        <span 
          v-if="node.counter"
          class="cc-tree-item__counter" 
          :aria-label="node.counterLabel"
        >
          {{ node.counter }}
        </span>
      </slot>
    </div>

    <!-- 子节点容器 -->
    <ul v-if="hasChildren" v-show="isExpanded" class="cc-tree-node__children">
      <cc-tree-node
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :indent="indent + 18"
        :draggable="draggable"
      >
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData"/>
        </template>
      </cc-tree-node>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// 添加组件名称定义
const name = 'cc-tree-node';
defineOptions({
  name
});

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  indent: {
    type: Number,
    default: 22
  },
  draggable: {
    type: Boolean,
    default: true
  }
});

const isExpanded = ref(true);
const isFocused = ref(false);
const hasChildren = computed(() => props.node.children?.length > 0);

const toggleNode = () => {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
  }
};
</script>

<style scoped>
.cc-tree-node {
  position: relative;
}

.cc-tree-item {
  padding: var(--cc-space-sm) var(--cc-space-md);
  display: flex;
  align-items: center;
  gap: var(--cc-space-sm);
  cursor: pointer;
  transition: var(--cc-transition);
}

.cc-tree-item:hover {
  background-color: var(--cc-list-hover);
}

.cc-tree-node--focus .cc-tree-item {
  background-color: var(--cc-list-hover);
}

.cc-tree-item__toggle {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--cc-size-icon-sm);
  height: var(--cc-size-icon-sm);
}

.cc-tree-item__arrow {
  width: var(--cc-size-icon-xs);
  height: var(--cc-size-icon-xs);
  transition: transform var(--cc-duration-fast) var(--cc-ease-in-out);
  color: var(--cc-theme-on-surface);
}

.cc-tree-item__arrow--open {
  transform: rotate(90deg);
}

.cc-tree-item__icon {
  font-size: var(--cc-size-icon-xs);
  color: var(--cc-theme-on-surface);
}

.cc-tree-item__text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cc-theme-on-background);
}

.cc-tree-item__action {
  opacity: 0;
  padding: var(--cc-space-xs);
  color: var(--cc-theme-on-surface);
  transition: opacity var(--cc-duration-fast) var(--cc-ease-in-out);
}

.cc-tree-item:hover .cc-tree-item__action {
  opacity: 1;
}

.cc-tree-item__action:hover {
  color: var(--cc-theme-primary);
  background-color: var(--cc-list-icon-hover);
  border-radius: var(--cc-border-radius);
}

.cc-tree-item__counter {
  padding: 0 4px;
  font-size: 12px;
  background-color: var(--cc-theme-surface-lighter);
  border-radius: 2px;
}

.cc-tree-node__children {
  margin-left: var(--cc-space-lg);
  border-left: var(--cc-border-width) solid var(--cc-border-color);
}

.fn__hidden {
  display: none;
}
</style>
