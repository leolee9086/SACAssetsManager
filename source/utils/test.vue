<template>
  <menu-root>
    <menu-item v-for="(item, index) in menuItems" :key="index" :label="item.label">
      <template v-if="item.shortcut" #shortcut>
        <span class="b3-menu__accelerator">{{ item.shortcut }}</span>
      </template>
      <menu-item v-for="(subItem, subIndex) in item.subMenu" :key="subIndex" :label="subItem.label">
        <template v-if="subItem.shortcut" #shortcut>
          <span class="b3-menu__accelerator">{{ subItem.shortcut }}</span>
        </template>
        <div>
            测试
        </div>
      </menu-item>
    </menu-item>
  </menu-root>
</template>

<script setup>
const menuItems = [
  {
    label: '转换为',
    subMenu: [
      { label: '无序列表' },
      { label: '有序列表' },
      { label: '任务列表', shortcut: 'Ctrl+L' },
      { label: '引述' },
      { label: '一级标题', shortcut: 'Ctrl+Alt+1' },
      { label: '二级标题', shortcut: 'Ctrl+Alt+2' },
      { label: '三级标题', shortcut: 'Ctrl+Alt+3' },
      { label: '四级标题', shortcut: 'Ctrl+Alt+4' },
      { label: '五级标题', shortcut: 'Ctrl+Alt+5' },
      { label: '六级标题', shortcut: 'Ctrl+Alt+6' }
    ]
  },
  { label: '人工智能' },
  {
    label: '复制',
    subMenu: [
      { label: '复制文本' },
      { label: '复制HTML' },
      { label: '复制Markdown' }
    ]
  },
  { label: '剪切', shortcut: 'Ctrl+X' },
  { label: '移动' },
  { label: '添加到数据库' },
  { label: '删除', shortcut: 'Backspace' },
  { label: '聚焦', shortcut: 'Alt++/Ctrl+点击' },
  { label: '聚焦到上层', shortcut: 'Alt++' },
  { label: '记始插入块', shortcut: 'Ctrl+Shift+B' }
];
</script>

<style>
.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-item:hover {
  background-color: var(--b3-menu-item-hover);
}

.shortcut {
  color: var(--b3-theme-on-surface-light);
  margin-left: 16px;
  font-size: 0.9em;
}

.menu-separator {
  height: 1px;
  background-color: var(--b3-theme-surface-lighter);
  margin: 4px 0;
}
</style>