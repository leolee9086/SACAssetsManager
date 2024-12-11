<template>
  <div class="bookmark-tree">
    <CcTreeNode
      :node="transformedNode"
      :draggable="false"
      :indent="indent"
      :level="level"
    >
      <!-- 自定义图标插槽 -->
      <template #icon="{ node, isExpanded }">
        <span class="bookmark-icon">
          <!-- 添加文件系统图标支持 -->
          <template v-if="node.type === 'file'">
            {{ getFileIcon(node) }}
          </template>
          <template v-else-if="node.type === 'folder'">
            {{ isExpanded ? '📂' : '📁' }}
          </template>
          <template v-else-if="node.type === 'bookmark'">
            <img v-if="node.icon" :src="node.icon" class="bookmark-icon" alt="">
            <span v-else>🔖</span>
          </template>
        </span>
      </template>

      <!-- 自定义内容插槽 -->
      <template #content="{ node }">
        <div class="bookmark-content">
          <div class="bookmark-main">
            <!-- 添加文件系统内容支持 -->
            <template v-if="node.type === 'file'">
              <span class="file-name" :title="node.path">{{ node.name }}</span>
            </template>
            <template v-else-if="node.type === 'folder'">
              <span class="folder-name">{{ node.name }}</span>
            </template>
            <a v-else-if="node.type === 'bookmark'"
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
          </div>
          
          <!-- 添加文件系统元数据显示 -->
          <div class="bookmark-meta">
            <template v-if="node.type === 'file'">
              <span v-if="node.meta?.stats?.size" class="meta-item size">
                {{ formatFileSize(node.meta.stats.size) }}
              </span>
              <span v-if="node.meta?.stats?.modified" class="meta-item modified">
                修改于 {{ formatDate(node.meta.stats.modified) }}
              </span>
            </template>
            <template v-else-if="node.type === 'bookmark'">
              <span v-if="node.domain" class="meta-item domain">
                {{ node.domain }}
              </span>
              <span v-if="node.visitTime" class="meta-item visit-time">
                {{ formatDate(node.visitTime) }}
              </span>
              <span v-if="node.created" class="meta-item created-time">
                创建于 {{ formatDate(node.created) }}
              </span>
            </template>
          </div>
        </div>
      </template>

      <!-- 子节点插槽 -->
      <template #children v-if="node.children?.length">
        <URTNode
          v-for="child in node.children"
          :key="child.id || child.href"
          :node="child"
          :indent="indent"
          :level="level + 1"
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
  },
  level: {
    type: Number,
    default: 0
  }
});

// 日期格式化函数
const formatDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

// 添加文件图标获取函数
const getFileIcon = (node) => {
  const ext = node.extra?.ext?.toLowerCase();
  const iconMap = {
    'txt': '📄',
    'pdf': '📑',
    'doc': '📃',
    'docx': '📃',
    'xls': '📊',
    'xlsx': '📊',
    'ppt': '📽',
    'pptx': '📽',
    'jpg': '🖼',
    'jpeg': '🖼',
    'png': '🖼',
    'gif': '🖼',
    'mp3': '🎵',
    'mp4': '🎬',
    'zip': '📦',
    'rar': '📦',
    'exe': '⚙️',
    'js': '📜',
    'json': '📜',
    'html': '🌐',
    'css': '🎨',
  };
  
  return iconMap[ext] || '📄';
};

// 添加文件大小格式化函数
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// 转换节点数据以匹配 tree 组件的数据结构
const transformedNode = computed(() => {
  const node = props.node;
  const nodeType = node.type || (node.url ? 'bookmark' : 'folder');
  
  return {
    ...node,
    id: node.meta?.id || node.url || node.name,
    type: nodeType,
    title: node.name,
    level: props.level,
    href: node.url,
    desc: node.extra?.description || '',
    icon: node.extra?.favicon || null,
    domain: node.extra?.domain || null,
    visitTime: node.extra?.visitTime || null,
    created: node.meta?.created || null,
    isExpanded: false,
    children: node.children?.map(child => ({
      ...child,
      id: child.meta?.id || child.url || child.name,
      type: child.type || (child.url ? 'bookmark' : 'folder'),
      title: child.name,
      href: child.url,
      desc: child.extra?.description || '',
      icon: child.extra?.favicon || null,
      domain: child.extra?.domain || null,
      visitTime: child.extra?.visitTime || null,
      created: child.meta?.created || null
    }))
  };
});
</script>

<style scoped>
.bookmark-tree {
  width: 100%;
}

.bookmark-icon {
  display: flex;
  align-items: center;
}

.bookmark-icon img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.bookmark-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bookmark-main {
  display: flex;
  align-items: center;
}

.bookmark-link {
  color: var(--cc-theme-primary, #0066cc);
  text-decoration: none;
}

.bookmark-link:hover {
  text-decoration: underline;
}

.bookmark-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85em;
  color: var(--cc-theme-on-background-muted, #666);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.domain {
  color: var(--cc-theme-on-background-muted, #666);
}

.visit-time, .created-time {
  font-size: 0.9em;
}

.file-name, .folder-name {
  color: var(--cc-theme-on-background);
  text-decoration: none;
}

.file-name:hover {
  text-decoration: underline;
  cursor: pointer;
}

.size {
  font-family: monospace;
  color: var(--cc-theme-on-background-muted);
}

.modified {
  color: var(--cc-theme-on-background-muted);
}
</style>
