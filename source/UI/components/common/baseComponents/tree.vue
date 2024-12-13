<template>
  <div class="cc-tree-node" :class="[node.type, { 'cc-tree-node--focus': isFocused, 'stripe': isStriped }]">
    <template v-if="level > 0">
      <span 
        class="cc-tree-item__connector-vertical"
        :style="{
          marginLeft: `${(level - 1) * indent}px`,
          marginTop: `${0 - calcMargin - 7}px`,
          marginBottom: '7px',
          width: `${indent}px`,
          borderLeft: !isNodeVisible ? '1px solid var(--cc-border-color)' : '1px solid var(--cc-theme-primary)',
          borderBottom: !isNodeVisible ? '1px solid var(--cc-border-color)' : '1px solid var(--cc-theme-primary)',
          zIndex: !isNodeVisible ? 1 : 2
        }"
      ></span>
      <span 
        class="cc-tree-item__connector-horizontal"
        :style="{
          marginBottom: '7px',
          width: `${indent}px`,
          borderBottom: !isNodeVisible ? '1px solid var(--cc-border-color)' : '1px solid var(--cc-theme-primary)',
          zIndex: !isNodeVisible ? 1 : 2
        }"
      ></span>
    </template>

    <div 
      class="cc-tree-item"
      :style="{ 
        '--file-toggle-width': `${indent}px`,
        'padding-left': `${getNodePadding}px`
      }"
      :draggable="draggable"
      :data-type="node.type"
      :data-path="node.path"
    >
      <!-- 展开/折叠按钮 -->
      <span 
        v-if="hasChildren"
        class="cc-tree-item__toggle"
        @click="toggleNode"
      >
        <svg class="cc-tree-item__arrow" :class="{ 'cc-tree-item__arrow--open': isExpanded }">
          <use xlink:href="#iconRight"></use>
        </svg>
      </span>
      <span 
        v-else
        class="cc-tree-item__toggle-placeholder"
      ></span>

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
        :nodes="nodes"
        :parent-path="node.path"
        :indent="indent"
        :level="level + 1"
        :draggable="draggable"
        :is-striped="isStriped"
        :is-visible="isNodeVisible"
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
  level: {
    type: Number,
    default: 0
  },
  draggable: {
    type: Boolean,
    default: true
  },
  isStriped: {
    type: Boolean,
    default: false
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  nodes: {
    type: Array,
    default: () => [],
    required: true
  },
  parentPath: {
    type: String,
    default: ''
  }
});

const isExpanded = ref(true);
const isFocused = ref(false);
const hasChildren = computed(() => props.node.children?.length > 0);

// 计算节点的实际缩进值
const getNodePadding = computed(() => {
  const ARROW_WIDTH = 18; // 箭头图标的宽度
  const basePadding = props.level * props.indent;
  return basePadding;
});

// 修改连接线计算逻辑
const calcMargin = computed(() => {
  if (!props.nodes || !props.node) return 0;
  
  const currentIndex = props.nodes.findIndex(item => item.path === props.node.path);
  const parentIndex = props.nodes.findIndex(item => item.path === props.parentPath);
  
  return (currentIndex - parentIndex) * 19; // 使用固定的行高 19px
});

const toggleNode = () => {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
  }
};

// 新增计算属性
const isNodeVisible = computed(() => {
    let flag = true;
    if (!props.nodes || !props.node) return flag;
    
    // 查找所有选中的节点
    const selectedNodes = props.nodes.filter(item => item.selected);
    
    if (selectedNodes.length === 0) {
        return true; // 没有选中节点时显示所有连接线
    }

    // 当前节点被选中
    if (props.node.selected) {
        flag = true;
    }
    // 选中节点是当前节点的子孙
    else if (selectedNodes.some(item => item.path.startsWith(props.node.path + '/'))) {
        flag = true;
    }
    // 当前节点是选中节点的祖先，且没有同级选中项
    else if (
        selectedNodes.some(item => props.node.path.startsWith(item.path + '/')) &&
        !selectedNodes.some(item => item.parentPath === props.node.parentPath)
    ) {
        flag = true;
    }

    return flag;
});
</script>

<style scoped>
.cc-tree-node {
  position: relative;
  min-height: 28px;
}

.cc-tree-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--cc-space-sm);
  cursor: pointer;
  transition: var(--cc-transition);
  padding-top: var(--cc-space-sm);
  padding-bottom: var(--cc-space-sm);
  padding-right: var(--cc-space-md);
  min-height: 28px; 
}
.cc-tree-item:hover {
  background-color: var(--cc-list-hover);
}

.cc-tree-node--focus .cc-tree-item {
  background-color: var(--cc-list-hover);
}

.cc-tree-item__toggle,
.cc-tree-item__toggle-placeholder {
  flex-shrink: 0;
  width: 18px; /* 固定箭头区域宽度 */
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cc-tree-item__toggle {
  cursor: pointer;
}

.cc-tree-item__toggle-placeholder {
  cursor: default;
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
  margin: 0;
  padding-left: var(--cc-space-md);
}

.fn__hidden {
  display: none;
}

.cc-tree-item__connector-vertical,
.cc-tree-item__connector-horizontal {
  position: absolute;
  pointer-events: none;
  height: 14px; /* 设置合适的连接线高度 */
}

.stripe {
  background-color: var(--cc-theme-surface-lighter);
}

/* 可以添加选中状态的样式 */
.cc-tree-node--selected .cc-tree-item {
    background-color: var(--cc-theme-primary);
    color: var(--cc-theme-on-primary);
}

/* 优化连接线的视觉效果 */
.cc-tree-item__connector-vertical,
.cc-tree-item__connector-horizontal {
    position: absolute;
    pointer-events: none;
    height: 14px;
    transition: border-color 0.3s ease;
}
</style>
