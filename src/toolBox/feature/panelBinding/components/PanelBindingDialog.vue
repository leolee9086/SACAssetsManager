<template>
  <div class="panel-binding-dialog">
    <div class="dialog-header">
      <h3>创建面板绑定</h3>
      <button class="dialog-close-btn" @click="closeDialog">×</button>
    </div>
    
    <div class="dialog-content">
      <div class="binding-source">
        <h4>源面板</h4>
        <div class="selected-panel" v-if="sourcePanel">
          <div class="panel-icon">
            <svg><use xlink:href="#iconPanel"></use></svg>
          </div>
          <div class="panel-info">
            <div class="panel-name">{{ sourcePanel.name || sourcePanel.id }}</div>
            <div class="panel-id">ID: {{ sourcePanel.id }}</div>
          </div>
        </div>
        <div v-else class="error-message">
          错误：源面板信息缺失
        </div>
      </div>
      
      <div class="binding-type">
        <h4>绑定类型</h4>
        <div class="binding-type-options">
          <div 
            class="binding-type-option" 
            :class="{ active: bindingType === 'bidirectional' }"
            @click="bindingType = 'bidirectional'"
          >
            <div class="type-icon">
              <svg><use xlink:href="#iconSync"></use></svg>
            </div>
            <div class="type-info">
              <div class="type-name">双向绑定</div>
              <div class="type-desc">两个面板互相影响</div>
            </div>
          </div>
          
          <div 
            class="binding-type-option" 
            :class="{ active: bindingType === 'unidirectional' }"
            @click="bindingType = 'unidirectional'"
          >
            <div class="type-icon">
              <svg><use xlink:href="#iconForward"></use></svg>
            </div>
            <div class="type-info">
              <div class="type-name">单向绑定</div>
              <div class="type-desc">源面板影响目标面板</div>
            </div>
          </div>
          
          <div 
            class="binding-type-option" 
            :class="{ active: bindingType === 'partial' }"
            @click="bindingType = 'partial'"
          >
            <div class="type-icon">
              <svg><use xlink:href="#iconMenu"></use></svg>
            </div>
            <div class="type-info">
              <div class="type-name">部分绑定</div>
              <div class="type-desc">只绑定选定的属性</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="binding-theme">
        <h4>绑定主题</h4>
        <div class="theme-selector">
          <div 
            v-for="(theme, key) in BINDING_THEMES" 
            :key="key"
            class="theme-option"
            :class="{ active: bindingTheme === key }"
            :style="{
              backgroundColor: theme.indicator,
              borderColor: theme.border
            }"
            @click="bindingTheme = key"
          ></div>
        </div>
      </div>
      
      <div class="binding-target">
        <h4>目标面板</h4>
        <div class="target-selector">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜索面板..." 
            class="target-search"
          />
          
          <div class="target-list">
            <div 
              v-for="panel in filteredPanels" 
              :key="panel.id"
              class="target-panel"
              :class="{ active: targetPanel && targetPanel.id === panel.id }"
              @click="targetPanel = panel"
            >
              <div class="panel-icon">
                <svg><use xlink:href="#iconPanel"></use></svg>
              </div>
              <div class="panel-info">
                <div class="panel-name">{{ panel.name || panel.id }}</div>
                <div class="panel-id">ID: {{ panel.id }}</div>
              </div>
            </div>
            
            <div v-if="filteredPanels.length === 0" class="no-panels">
              没有找到匹配的面板
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="bindingType === 'partial'" class="binding-properties">
        <h4>绑定属性</h4>
        <div class="properties-selector">
          <div 
            v-for="prop in availableProperties" 
            :key="prop"
            class="property-option"
            :class="{ active: selectedProperties.includes(prop) }"
            @click="toggleProperty(prop)"
          >
            <div class="property-checkbox">
              <input 
                type="checkbox" 
                :checked="selectedProperties.includes(prop)" 
                @change="toggleProperty(prop)"
              />
            </div>
            <div class="property-name">{{ prop }}</div>
          </div>
          
          <div v-if="availableProperties.length === 0" class="no-properties">
            没有可用的属性
          </div>
        </div>
      </div>
    </div>
    
    <div class="dialog-footer">
      <button class="dialog-btn dialog-btn--cancel" @click="closeDialog">取消</button>
      <button 
        class="dialog-btn dialog-btn--confirm" 
        :disabled="!targetPanel"
        @click="createBinding"
      >
        创建绑定
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, getCurrentInstance, inject } from 'vue';
import { 
  bindPanels, 
  getAllPanels, 
  getBindingBetweenPanels,
  BINDING_TYPES,
  BINDING_THEMES
} from '../panelBindingManager.js';

export default {
  name: 'PanelBindingDialog',
  props: {
    sourcePanel: {
      type: Object,
      required: true,
      default: () => ({}),
      validator: (value) => {
        console.log("验证sourcePanel:", value);
        // 如果值为空，直接返回false
        if (!value || Object.keys(value).length === 0) {
          console.error('sourcePanel为空或不存在');
          return false;
        }
        
        // 必须包含id属性
        if (!value.id) {
          console.error('sourcePanel必须包含id属性');
          return false;
        }
        
        return true;
      }
    },
    availablePanels: {
      type: Array,
      default: () => [],
      validator: (value) => {
        if (!Array.isArray(value)) {
          console.error('availablePanels必须是数组');
          return false;
        }
        return true;
      }
    },
    availableProperties: {
      type: Array,
      default: () => [],
      validator: (value) => {
        if (!Array.isArray(value)) {
          console.error('availableProperties必须是数组');
          return false;
        }
        return true;
      }
    }
  },
  emits: ['binding-created', 'close'],
  
  setup(props, { emit }) {
    // 获取组件实例
    const instance = getCurrentInstance();
    
    // 从appData获取注入的数据（这是vueComponentLoader特有的注入机制）
    const appData = inject('appData', {});
    console.log("Injected appData:", appData);
    
    // 尝试通过多种方式获取props
    const injectedSourcePanel = appData.sourcePanel || null;
    const injectedAvailablePanels = appData.availablePanels || [];
    const injectedAvailableProperties = appData.availableProperties || [];
    
    console.log("Props sourcePanel:", props.sourcePanel);
    console.log("Injected from appData sourcePanel:", injectedSourcePanel);
    
    // 使用props或injected的值（优先使用props）
    const actualSourcePanel = computed(() => {
      const sourcePanelValue = props.sourcePanel && props.sourcePanel.id ? props.sourcePanel : injectedSourcePanel;
      console.log("Using sourcePanel:", sourcePanelValue);
      return sourcePanelValue;
    });
    
    const actualAvailablePanels = computed(() => props.availablePanels || injectedAvailablePanels);
    const actualAvailableProperties = computed(() => props.availableProperties || injectedAvailableProperties);
    
    // 状态
    const bindingType = ref('bidirectional');
    const bindingTheme = ref('blue');
    const targetPanel = ref(null);
    const searchQuery = ref('');
    const selectedProperties = ref([]);

    // 计算属性
    const filteredPanels = computed(() => {
      if (!actualAvailablePanels.value) return [];
      
      const query = searchQuery.value.trim().toLowerCase();
      
      return actualAvailablePanels.value.filter(panel => {
        if (!panel || !panel.id) return false;
        
        // 排除源面板自身
        if (actualSourcePanel.value && panel.id === actualSourcePanel.value.id) {
          return false;
        }
        
        // 搜索匹配
        if (query) {
          const panelName = (panel.name || panel.id || '').toLowerCase();
          const panelId = (panel.id || '').toLowerCase();
          return panelName.includes(query) || panelId.includes(query);
        }
        
        return true;
      });
    });

    const canCreate = computed(() => {
      // 检查源面板
      if (!actualSourcePanel.value || !actualSourcePanel.value.id) {
        return false;
      }
      
      // 必须有目标面板
      if (!targetPanel.value || !targetPanel.value.id) {
        return false;
      }
      
      // 如果是部分绑定，必须选择至少一个属性
      if (bindingType.value === 'partial' && selectedProperties.value.length === 0) {
        return false;
      }
      
      // 检查是否已经存在绑定
      const existingBinding = getBindingBetweenPanels(
        actualSourcePanel.value.id, 
        targetPanel.value.id
      );
      
      return !existingBinding;
    });

    // 方法
    const createBinding = () => {
      if (!canCreate.value) {
        console.error('无法创建绑定：条件不满足');
        return;
      }
      
      try {
        const bindingOptions = {
          type: bindingType.value,
          theme: bindingTheme.value,
          properties: selectedProperties.value,
        };
        
        const bindingId = bindPanels(
          actualSourcePanel.value.id,
          targetPanel.value.id,
          bindingOptions
        );
        
        if (bindingId) {
          const bindingData = {
            bindingId,
            sourcePanel: actualSourcePanel.value,
            targetPanel: targetPanel.value,
            options: bindingOptions
          };
          
          // 使用事件总线触发事件
          if (instance && instance.appContext.config.globalProperties.eventBus) {
            instance.appContext.config.globalProperties.eventBus.emit('binding-created', bindingData);
          }
          // 同时保留原有的emit调用，确保兼容性
          emit('binding-created', bindingData);
        } else {
          console.error('创建绑定失败');
        }
      } catch (error) {
        console.error('创建绑定时发生错误:', error);
      }
    };

    const closeDialog = () => {
      // 使用事件总线触发关闭事件
      if (instance && instance.appContext.config.globalProperties.eventBus) {
        instance.appContext.config.globalProperties.eventBus.emit('close');
      }
      // 同时保留原有的emit调用，确保兼容性
      emit('close');
    };

    function toggleProperty(prop) {
      if (!prop) return;
      
      const index = selectedProperties.value.indexOf(prop);
      if (index === -1) {
        selectedProperties.value.push(prop);
      } else {
        selectedProperties.value.splice(index, 1);
      }
    }

    // 生命周期钩子
    onMounted(() => {
      // 验证必要属性
      if (!actualSourcePanel.value || !actualSourcePanel.value.id) {
        console.error('PanelBindingDialog: 缺少必要的sourcePanel属性');
        return;
      }
      
      // 如果有可用属性，默认全选
      if (actualAvailableProperties.value && actualAvailableProperties.value.length > 0) {
        selectedProperties.value = [...actualAvailableProperties.value];
      }
    });
    
    return {
      bindingType,
      bindingTheme,
      targetPanel,
      searchQuery,
      selectedProperties,
      filteredPanels,
      canCreate,
      createBinding,
      closeDialog,
      toggleProperty,
      BINDING_THEMES,
      // 导出计算属性以便模板使用
      sourcePanel: actualSourcePanel,
      availablePanels: actualAvailablePanels,
      availableProperties: actualAvailableProperties
    };
  }
};
</script>

<style scoped>
.panel-binding-dialog {
  width: 100%;
  background-color: var(--cc-theme-surface);
  border-radius: var(--cc-border-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: var(--cc-theme-surface-light);
  border-bottom: 1px solid var(--cc-border-color);
}

.dialog-header h3 {
  margin: 0;
  font-weight: 500;
  font-size: 16px;
  color: var(--cc-theme-on-background);
}

.dialog-close-btn {
  background: none;
  border: none;
  color: var(--cc-theme-on-surface);
  font-size: 18px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close-btn:hover {
  color: var(--cc-theme-on-background);
}

.dialog-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  max-height: 70vh;
}

.dialog-content h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--cc-theme-on-background);
}

.binding-source,
.binding-type,
.binding-theme,
.binding-target,
.binding-properties {
  margin-bottom: 20px;
}

.selected-panel {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
}

.panel-icon, 
.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

.panel-icon svg, 
.type-icon svg {
  width: 20px;
  height: 20px;
  color: var(--cc-theme-on-background);
}

.panel-info, 
.type-info {
  flex: 1;
}

.panel-name, 
.type-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--cc-theme-on-background);
}

.panel-id, 
.type-desc {
  font-size: 12px;
  color: var(--cc-theme-on-surface);
  margin-top: 2px;
}

.binding-type-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.binding-type-option {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.binding-type-option:hover {
  background-color: var(--cc-theme-surface-lighter);
}

.binding-type-option.active {
  background-color: var(--cc-theme-primary-lightest);
  border-color: var(--cc-theme-primary);
}

.binding-type-option.active .type-icon svg {
  color: var(--cc-theme-primary);
}

.theme-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-option.active {
  transform: scale(1.2);
}

.target-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.target-search {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  background-color: var(--cc-theme-surface-light);
  color: var(--cc-theme-on-background);
  font-size: 14px;
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.target-panel {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.target-panel:hover {
  background-color: var(--cc-theme-surface-lighter);
}

.target-panel.active {
  background-color: var(--cc-theme-primary-lightest);
  border-color: var(--cc-theme-primary);
}

.target-panel.active .panel-icon svg {
  color: var(--cc-theme-primary);
}

.no-panels {
  padding: 16px;
  text-align: center;
  color: var(--cc-theme-on-surface);
  font-size: 14px;
  background-color: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
}

.properties-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.property-option {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.property-option:hover {
  background-color: var(--cc-theme-surface-lighter);
}

.property-option.active {
  background-color: var(--cc-theme-primary-lightest);
  border-color: var(--cc-theme-primary-lighter);
}

.property-checkbox {
  margin-right: 8px;
}

.property-checkbox input {
  width: 16px;
  height: 16px;
}

.property-name {
  font-size: 14px;
  color: var(--cc-theme-on-background);
}

.no-properties {
  padding: 16px;
  text-align: center;
  color: var(--cc-theme-on-surface);
  font-size: 14px;
  background-color: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  background-color: var(--cc-theme-surface-light);
  border-top: 1px solid var(--cc-border-color);
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: var(--cc-border-radius);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.dialog-btn--cancel {
  background-color: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  color: var(--cc-theme-on-background);
}

.dialog-btn--cancel:hover {
  background-color: var(--cc-theme-surface-lighter);
}

.dialog-btn--confirm {
  background-color: var(--cc-theme-primary);
  border: 1px solid var(--cc-theme-primary);
  color: var(--cc-theme-on-primary);
}

.dialog-btn--confirm:hover {
  background-color: var(--cc-theme-primary-light);
}

.dialog-btn--confirm:disabled {
  background-color: var(--cc-theme-surface-light);
  border-color: var(--cc-border-color);
  color: var(--cc-theme-on-surface);
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background-color: var(--cc-theme-error-light);
  border: 1px solid var(--cc-theme-error);
  border-radius: var(--cc-border-radius);
  color: var(--cc-theme-error);
  font-size: 14px;
  text-align: center;
}
</style> 