/**
 * 选项卡组件
 * 
 * 提供选项卡导航功能，使用JavaScript定义Vue组件。
 * 
 * @module shared/components/navigation/tabs
 */

/**
 * 选项卡面板组件
 */
export const SacTabPane = {
  name: 'SacTabPane',
  props: {
    // 选项卡标签
    label: {
      type: String,
      default: ''
    },
    // 选项卡名称，作为唯一标识
    name: {
      type: [String, Number],
      required: true
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    // 是否延迟渲染，即当选中后才渲染内容
    lazy: {
      type: Boolean,
      default: false
    },
    // 选项卡标签右侧的图标
    icon: {
      type: String,
      default: ''
    },
    // 是否可关闭
    closable: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      // 是否已渲染
      rendered: false
    };
  },
  
  computed: {
    // 是否为活动状态
    isActive() {
      const { $parent: tabs } = this;
      if (!tabs) return false;
      return tabs.currentName === this.name;
    },
    
    // 是否应该渲染内容
    shouldRender() {
      return !this.lazy || this.isActive || this.rendered;
    }
  },
  
  watch: {
    // 监听活动状态变化
    isActive(value) {
      if (value) {
        this.rendered = true;
      }
    }
  },
  
  mounted() {
    // 如果初始状态为活动，则设置渲染状态
    if (this.isActive) {
      this.rendered = true;
    }
  },
  
  // 使用渲染函数
  render(h) {
    const show = this.isActive || (this.$parent.animated && this.rendered);
    
    const content = this.shouldRender ? this.$slots.default : null;
    
    return h('div', {
      directives: [{ name: 'show', value: show }],
      class: {
        'sac-tab-pane': true,
        'sac-tab-pane--active': this.isActive
      },
      attrs: {
        role: 'tabpanel',
        'aria-hidden': !this.isActive,
        id: `pane-${this.name}`,
        'aria-labelledby': `tab-${this.name}`
      }
    }, content);
  }
};

/**
 * 选项卡组件
 */
export const SacTabs = {
  name: 'SacTabs',
  props: {
    // 绑定值，当前激活的选项卡
    value: {
      type: [String, Number],
      default: ''
    },
    // 选项卡类型
    type: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'card', 'border-card'].includes(value)
    },
    // 选项卡位置
    tabPosition: {
      type: String,
      default: 'top',
      validator: (value) => ['top', 'right', 'bottom', 'left'].includes(value)
    },
    // 是否可添加选项卡
    addable: {
      type: Boolean,
      default: false
    },
    // 是否可关闭选项卡
    closable: {
      type: Boolean,
      default: false
    },
    // 是否使用动画
    animated: {
      type: Boolean,
      default: true
    },
    // 是否铺满容器宽度
    stretch: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      // 当前激活的选项卡
      currentName: this.value || '',
      // 所有面板
      panes: []
    };
  },
  
  watch: {
    // 监听外部值变化
    value(val) {
      this.setCurrentName(val);
    },
    
    // 监听当前选项卡变化
    currentName() {
      // 更新选项卡导航
      this.$nextTick(() => {
        this.updateNavScroll();
      });
    }
  },
  
  methods: {
    // 获取所有面板
    getPanes() {
      const panes = [];
      this.$children.forEach(child => {
        if (child.$options.name === 'SacTabPane') {
          panes.push(child);
        }
      });
      return panes;
    },
    
    // 更新面板列表
    updatePanes() {
      this.panes = this.getPanes();
    },
    
    // 设置当前选项卡
    setCurrentName(value) {
      // 如果选项卡名称没有变化，直接返回
      if (this.currentName === value) return;
      
      this.currentName = value;
      this.$emit('input', value);
      this.$emit('tab-change', value);
    },
    
    // 处理选项卡点击
    handleTabClick(tab, event) {
      // 如果选项卡被禁用，直接返回
      if (tab.disabled) return;
      
      this.setCurrentName(tab.name);
      this.$emit('tab-click', tab, event);
    },
    
    // 处理选项卡移除
    handleTabRemove(pane, event) {
      event.stopPropagation();
      
      // 移除前的回调
      this.$emit('tab-remove', pane);
      
      // 获取当前面板索引
      const index = this.panes.indexOf(pane);
      
      // 如果存在，从数组中移除
      if (index !== -1) {
        this.panes.splice(index, 1);
      }
      
      // 如果移除的是当前选中的选项卡，需要激活其它选项卡
      if (this.currentName === pane.name) {
        // 选择新的活动选项卡
        let newActivePane;
        
        if (index === this.panes.length) {
          // 如果是最后一个，选择前一个
          newActivePane = this.panes[index - 1];
        } else {
          // 否则选择后一个
          newActivePane = this.panes[index];
        }
        
        // 设置新的活动选项卡
        if (newActivePane) {
          this.setCurrentName(newActivePane.name);
        } else {
          this.setCurrentName('');
        }
      }
    },
    
    // 处理添加选项卡
    handleTabAdd() {
      this.$emit('tab-add');
    },
    
    // 更新选项卡导航滚动位置
    updateNavScroll() {
      // 此方法可以在滚动导航栏时调整位置，例如滚动到活动的选项卡
      // 由于渲染函数中没有具体的滚动逻辑，这里仅作为接口留存
    },
    
    // 返回面板信息
    getPaneInfo(pane) {
      return {
        name: pane.name,
        label: pane.label,
        disabled: pane.disabled,
        closable: this.closable || pane.closable,
        icon: pane.icon
      };
    }
  },
  
  mounted() {
    this.updatePanes();
    
    // 如果没有设置初始值或初始值对应的面板不存在，则自动选择第一个非禁用的面板
    if (!this.currentName && this.panes.length) {
      const firstPane = this.panes.find(pane => !pane.disabled);
      if (firstPane) {
        this.setCurrentName(firstPane.name);
      }
    }
  },
  
  updated() {
    this.updatePanes();
  },
  
  // 使用渲染函数
  render(h) {
    // 选项卡头部
    const tabHeader = this.renderTabHeader(h);
    
    // 选项卡内容
    const tabContent = h('div', {
      class: 'sac-tabs__content'
    }, this.$slots.default);
    
    // 选项卡容器类名
    const tabsClasses = [
      'sac-tabs',
      `sac-tabs--${this.type}`,
      `sac-tabs--${this.tabPosition}`
    ];
    
    // 创建选项卡组件
    return h('div', {
      class: tabsClasses
    }, [
      tabHeader,
      tabContent
    ]);
  },
  
  // 渲染选项卡头部
  methods: {
    renderTabHeader(h) {
      // 选项卡导航按钮
      const tabs = this.panes.map(pane => {
        const tabInfo = this.getPaneInfo(pane);
        return this.renderTabButton(h, tabInfo);
      });
      
      // 添加按钮
      if (this.addable) {
        tabs.push(h('div', {
          class: 'sac-tabs__add-btn',
          on: { click: this.handleTabAdd }
        }, '+'));
      }
      
      // 导航容器
      const navClasses = [
        'sac-tabs__nav',
        {
          'sac-tabs__nav--stretch': this.stretch
        }
      ];
      
      const nav = h('div', {
        class: navClasses,
        ref: 'nav'
      }, tabs);
      
      // 头部容器
      return h('div', {
        class: 'sac-tabs__header'
      }, [nav]);
    },
    
    // 渲染选项卡按钮
    renderTabButton(h, tab) {
      // 选项卡按钮类名
      const tabClasses = [
        'sac-tabs__tab',
        {
          'sac-tabs__tab--active': this.currentName === tab.name,
          'sac-tabs__tab--disabled': tab.disabled,
          'sac-tabs__tab--closable': tab.closable
        }
      ];
      
      // 选项卡内容
      const children = [];
      
      // 图标
      if (tab.icon) {
        children.push(h('i', { class: ['sac-tabs__icon', tab.icon] }));
      }
      
      // 标签
      children.push(h('span', { class: 'sac-tabs__label' }, tab.label));
      
      // 关闭按钮
      if (tab.closable) {
        const pane = this.panes.find(p => p.name === tab.name);
        children.push(h('span', {
          class: 'sac-tabs__close',
          on: {
            click: (event) => this.handleTabRemove(pane, event)
          }
        }, '×'));
      }
      
      // 返回选项卡按钮
      return h('div', {
        class: tabClasses,
        attrs: {
          id: `tab-${tab.name}`,
          'aria-controls': `pane-${tab.name}`,
          role: 'tab',
          'aria-selected': this.currentName === tab.name,
          tabindex: tab.disabled ? -1 : 0
        },
        key: tab.name,
        on: {
          click: (event) => this.handleTabClick(tab, event)
        }
      }, children);
    }
  }
};

// 选项卡相关的CSS样式
export const tabsStyle = `
.sac-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.sac-tabs__header {
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 15px;
  position: relative;
}

.sac-tabs__nav {
  display: flex;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
}

.sac-tabs__nav--stretch {
  justify-content: space-around;
}

.sac-tabs__tab {
  padding: 0 20px;
  height: 40px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  font-size: 14px;
  color: #606266;
  transition: color 0.3s;
}

.sac-tabs__tab--active {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

.sac-tabs__tab--disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.sac-tabs__icon {
  margin-right: 5px;
}

.sac-tabs__close {
  margin-left: 5px;
  font-size: 12px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.sac-tabs__close:hover {
  background-color: #c0c4cc;
  color: #fff;
}

.sac-tabs__add-btn {
  width: 30px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  color: #606266;
}

.sac-tabs__add-btn:hover {
  color: #409eff;
}

.sac-tabs__content {
  flex: 1;
  position: relative;
}

.sac-tab-pane {
  width: 100%;
}

/* 卡片样式 */
.sac-tabs--card .sac-tabs__header {
  border-bottom: none;
}

.sac-tabs--card .sac-tabs__tab {
  border: 1px solid #e4e7ed;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  margin-right: 2px;
  background-color: #f5f7fa;
}

.sac-tabs--card .sac-tabs__tab--active {
  border-bottom-color: #fff;
  background-color: #fff;
}

/* 边框卡片样式 */
.sac-tabs--border-card {
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 4px 0 rgba(0,0,0,.12), 0 0 6px 0 rgba(0,0,0,.04);
}

.sac-tabs--border-card .sac-tabs__header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 0;
}

.sac-tabs--border-card .sac-tabs__content {
  padding: 15px;
}

/* 不同位置的样式 */
.sac-tabs--left {
  flex-direction: row;
}

.sac-tabs--left .sac-tabs__header {
  border-bottom: none;
  border-right: 1px solid #e4e7ed;
  margin-bottom: 0;
  margin-right: 15px;
}

.sac-tabs--left .sac-tabs__nav {
  flex-direction: column;
}

.sac-tabs--left .sac-tabs__tab {
  border-bottom: none;
}

.sac-tabs--left .sac-tabs__tab--active {
  border-right: 2px solid #409eff;
  border-bottom: none;
}

.sac-tabs--right {
  flex-direction: row-reverse;
}

.sac-tabs--right .sac-tabs__header {
  border-bottom: none;
  border-left: 1px solid #e4e7ed;
  margin-bottom: 0;
  margin-left: 15px;
}

.sac-tabs--right .sac-tabs__nav {
  flex-direction: column;
}

.sac-tabs--right .sac-tabs__tab {
  border-bottom: none;
}

.sac-tabs--right .sac-tabs__tab--active {
  border-left: 2px solid #409eff;
  border-bottom: none;
}

.sac-tabs--bottom {
  flex-direction: column-reverse;
}

.sac-tabs--bottom .sac-tabs__header {
  border-top: 1px solid #e4e7ed;
  border-bottom: none;
  margin-top: 15px;
  margin-bottom: 0;
}

.sac-tabs--bottom .sac-tabs__tab--active {
  border-top: 2px solid #409eff;
  border-bottom: none;
}
`;

// 中文别名
export const 选项卡 = SacTabs;
export const 选项卡面板 = SacTabPane; 