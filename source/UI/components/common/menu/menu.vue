<template>
  <div 
    class="menu"
    :style="menuStyle"
    v-show="visible"
    @contextmenu.prevent
  >
    <div 
      v-for="(item, index) in menuItems" 
      :key="index"
      class="menu-item"
      :class="{
        'menu-item--disabled': item.disabled,
        'menu-item--separator': item.type === 'separator',
        'menu-item--active': isItemActive(item)
      }"
      @click="handleItemClick(item)"
      @mouseenter="handleItemHover(item)"
      @mouseleave="handleItemLeave(item)"
    >
      <!-- 分隔线 -->
      <template v-if="item.type === 'separator'">
        <div class="menu-separator" />
      </template>
      
      <!-- 普通菜单项 -->
      <template v-else>
        <div class="menu-item__content">
          <!-- 图标 -->
          <span v-if="item.icon" class="menu-item__icon">
            {{ item.icon }}
          </span>
          
          <!-- 标签文本 -->
          <span class="menu-item__label">{{ item.label }}</span>
          
          <!-- 快捷键 -->
          <span v-if="item.accelerator" class="menu-item__accelerator">
            {{ item.accelerator }}
          </span>
          
          <!-- 子菜单指示器 -->
          <span v-if="item.children" class="menu-item__submenu-indicator">
            ▶
          </span>
        </div>

        <!-- 子菜单 -->
        <Menu
          v-if="item.children"
          :visible="isSubmenuVisible(item)"
          :menu-items="item.children"
          :x="getSubmenuX()"
          :y="getSubmenuY(index)"
          @select="handleSubmenuSelect"
          @close="handleSubmenuClose"
          class="submenu"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  visible: Boolean,
  x: Number,
  y: Number,
  menuItems: {
    type: Array,
    default: () => []
  },
  level: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['select', 'close']);

// 活动菜单项状态
const activeItem = ref(null);
const submenuTimer = ref(null);

// 计算菜单位置样式
const menuStyle = computed(() => ({
  left: props.x ? `${props.x}px` : 0,
  top: props.y ? `${props.y}px` : 0
}));

// 判断菜单项是否处于活动状态
const isItemActive = (item) => {
  return activeItem.value === item;
};

// 判断子菜单是否可见
const isSubmenuVisible = (item) => {
  return isItemActive(item);
};

// 计算子菜单X坐标
const getSubmenuX = () => {
  return 200; // 父菜单宽度
};

// 计算子菜单Y坐标
const getSubmenuY = (index) => {
  return index * 32; // 根据菜单项高度计算
};

// 处理菜单项点击
const handleItemClick = (item) => {
  if (item.disabled || item.type === 'separator') return;
  
  if (!item.children) {
    emit('select', item);
    emit('close');
  }
};

// 处理菜单项悬停
const handleItemHover = (item) => {
  if (item.disabled || item.type === 'separator') return;
  
  clearTimeout(submenuTimer.value);
  submenuTimer.value = setTimeout(() => {
    activeItem.value = item;
  }, 200);
};

// 处理菜单项离开
const handleItemLeave = (item) => {
  clearTimeout(submenuTimer.value);
  submenuTimer.value = setTimeout(() => {
    if (activeItem.value === item) {
      activeItem.value = null;
    }
  }, 200);
};

// 处理子菜单选择
const handleSubmenuSelect = (item) => {
  emit('select', item);
};

// 处理子菜单关闭
const handleSubmenuClose = () => {
  activeItem.value = null;
  emit('close');
};
</script>

<style scoped>
.menu {
  position: fixed;
  min-width: 200px;
  background: var(--cc-menu-background);
  border: 1px solid var(--cc-menu-border-color);
  border-radius: var(--cc-radius);
  padding: 4px 0;
  box-shadow: var(--cc-menu-shadow);
  z-index: 9999;
}

.menu-item {
  position: relative;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
}

.menu-item:hover:not(.menu-item--disabled):not(.menu-item--separator) {
  background: var(--cc-menu-hover-background);
}

.menu-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item__content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item__icon {
  width: 16px;
  text-align: center;
}

.menu-item__label {
  flex: 1;
}

.menu-item__accelerator {
  color: var(--cc-text-color-light);
  font-size: 0.9em;
}

.menu-item__submenu-indicator {
  font-size: 0.8em;
  color: var(--cc-text-color-light);
}

.menu-separator {
  height: 1px;
  background: var(--cc-menu-separator-color);
  margin: 4px 0;
}

.menu-item--active {
  background: var(--cc-menu-hover-background);
}

.submenu {
  position: absolute;
  left: 100%;
  top: 0;
}
</style>
