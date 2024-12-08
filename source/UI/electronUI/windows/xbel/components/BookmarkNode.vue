<template>
  <div class="bookmark-tree">
    <CcTreeNode
      :node="transformedNode"
      :draggable="false"
      :indent="indent"
    >
      <!-- 自定义图标插槽 -->
      <template #icon="{ node, isExpanded }">
        <span class="bookmark-icon" v-if="node.type === 'folder'">
          {{ isExpanded ? '📂' : '📁' }}
        </span>
        <span class="bookmark-icon" v-else-if="node.type === 'bookmark'">
          <img v-if="node.icon" :src="node.icon" class="bookmark-icon" alt="">
          <span v-else>🔖</span>
        </span>
      </template>

      <!-- 自定义内容插槽 -->
      <template #content="{ node }">
        <a 
          v-if="node.type === 'bookmark'"
          :href="node.href"
          target="_blank"
          rel="noopener noreferrer"
          class="bookmark-link"
          :title="node.desc"
          @click.stop
        >
          {{ node.title || node.href }}
        </a>
        <span v-else>{{ node.title }}</span>
      </template>

      <!-- 子节点插槽 -->
      <template #children v-if="node.children?.length">
        <BookmarkNode
          v-for="child in node.children"
          :key="child.id || child.href"
          :node="child"
          :indent="indent + 18"
        />
      </template>
    </CcTreeNode>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CcTreeNode from '../../../../components/common/baseComponents/tree.vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  indent: {
    type: Number,
    default: 22
  }
});

// 转换节点数据以匹配 tree 组件的数据结构
const transformedNode = computed(() => {
  const nodeType = props.node.href ? 'bookmark' : 'folder';
  return {
    ...props.node,
    id: props.node.id || props.node.href || props.node.title,
    type: nodeType,
    children: props.node.children?.map(child => ({
      ...child,
      id: child.id || child.href,
      type: child.type || (child.href ? 'bookmark' : 'folder')
    }))
  };
});
</script>

<style scoped>
.bookmark-icon {
  display: flex;
  align-items: center;
}

.bookmark-icon img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.bookmark-link {
  color: #0066cc;
  text-decoration: none;
}

.bookmark-link:hover {
  text-decoration: underline;
}
</style>
