import text from "./segments/text.js";
import button from './segments/button.js'
import image from "./segments/image.js";
import container from "./segments/container.js";
// 组件基础配置
export const componentConfigs = {
  text,
  button ,
  image,
  container ,
  grid: {
    type: 'grid',
    defaultProps: {
      columns: 2,
      gap: '12px',
      padding: '16px'
    },
    defaultStyle: {
      width: '100%',
      minHeight: '100px',
      backgroundColor: '#ffffff',
      borderRadius: '4px',
      border: '1px solid #eee'
    },
    isContainer: true,
    render: (component) => {
      const gridStyle = `
        display: grid;
        grid-template-columns: repeat(${component.props.columns || 2}, 1fr);
        gap: ${component.props.gap || '12px'};
        padding: ${component.props.padding || '16px'};
        min-height: ${component.style.minHeight || '100px'};
        width: ${component.style.width || '100%'};
        background-color: ${component.style.backgroundColor || '#ffffff'};
        border-radius: ${component.style.borderRadius || '4px'};
        border: ${component.style.border || '1px solid #eee'};
      `;

      const childrenContent = component.children?.map(child => {
        const childConfig = componentConfigs[child.type];
        return childConfig ? childConfig.render(child) : '';
      }).join('') || '<div class="empty-container">拖拽组件到这里</div>';

      return `
        <div class="editor-component-container" style="${gridStyle}">
          ${childrenContent}
        </div>
      `;
    }
  },
  flex: {
    type: 'flex',
    defaultProps: {
      direction: 'row',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      gap: '12px',
      padding: '16px'
    },
    defaultStyle: {
      width: '100%',
      minHeight: '100px',
      backgroundColor: '#ffffff',
      borderRadius: '4px',
      border: '1px solid #eee'
    },
    isContainer: true,
    render: (component) => {
      const flexStyle = `
        display: flex;
        flex-direction: ${component.props.direction || 'row'};
        justify-content: ${component.props.justifyContent || 'flex-start'};
        align-items: ${component.props.alignItems || 'stretch'};
        gap: ${component.props.gap || '12px'};
        padding: ${component.props.padding || '16px'};
        min-height: ${component.style.minHeight || '100px'};
        width: ${component.style.width || '100%'};
        background-color: ${component.style.backgroundColor || '#ffffff'};
        border-radius: ${component.style.borderRadius || '4px'};
        border: ${component.style.border || '1px solid #eee'};
      `;

      const childrenContent = component.children?.map(child => {
        const childConfig = componentConfigs[child.type];
        return childConfig ? childConfig.render(child) : '';
      }).join('') || '<div class="empty-container">拖拽组件到这里</div>';

      return `
        <div class="editor-component-container" style="${flexStyle}">
          ${childrenContent}
        </div>
      `;
    }
  },
  divider: {
    type: 'divider',
    defaultProps: {
      direction: 'horizontal',
      thickness: '1px',
      style: 'solid',
      color: '#E8E8E8',
      margin: '16px 0'
    },
    defaultStyle: {
      width: '100%',
      height: 'auto'
    },
    render: (component) => {
      const isHorizontal = component.props.direction === 'horizontal';
      return `
        <div style="
          width: ${isHorizontal ? '100%' : component.props.thickness};
          height: ${isHorizontal ? component.props.thickness : '100%'};
          border: none;
          background-color: ${component.props.color};
          margin: ${component.props.margin};
        "></div>
      `;
    },
    previewStyle: {
      width: '150px',
      height: '20px',
      padding: '8px'
    }
  }
};

// 添加空器样式
export const emptyContainerStyle = `
  .empty-container {
    width: 100%;
    min-height: 60px;
    border: 2px dashed #ddd;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 14px;
    border-radius: 4px;
  }
`;

// 添加行为定义
export const behaviors = {
  clickable: {
    name: '可点击',
    events: {
      click: {
        name: '点击',
        params: {
          url: { type: 'string', name: '跳转链接' },
          target: { 
            type: 'select', 
            name: '打开方式',
            options: [
              { label: '当前窗口', value: '_self' },
              { label: '新窗口', value: '_blank' }
            ]
          }
        },
        handler: (params, el, event) => {
          // 在编辑模式下不触发行为
          if (!window.isPreviewMode) {
            event.preventDefault();
            return;
          }
          
          try {
            const behaviors = JSON.parse(el.dataset.componentBehaviors || '{}');
            const clickParams = behaviors.clickable?.click || {};
            if (clickParams.url) {
              // 确保 URL 是完整的
              let url = clickParams.url;
              if (!url.match(/^https?:\/\//i)) {
                // 如果不是以 http:// 或 https:// 开头，添加 https://
                url = 'https://' + url.replace(/^\/+/, '');
              }
              window.open(url, clickParams.target || '_self');
            }
          } catch (error) {
            console.error('Error parsing behavior params:', error);
          }
        }
      }
    }
  },
  hoverable: {
    name: '悬浮效果',
    events: {
      mouseenter: {
        name: '鼠标进入',
        params: {
          scale: { type: 'number', name: '缩放比例', default: 1.05 },
          shadow: { type: 'string', name: '阴影效果', default: '0 4px 12px rgba(0,0,0,0.15)' }
        },
        handler: (params, el, event) => {
          if (!window.isPreviewMode) return;
          
          try {
            const behaviors = JSON.parse(el.dataset.componentBehaviors || '{}');
            const hoverParams = behaviors.hoverable?.mouseenter || {};
            el.style.transform = `scale(${hoverParams.scale || 1.05})`;
            el.style.boxShadow = hoverParams.shadow || '0 4px 12px rgba(0,0,0,0.15)';
          } catch (error) {
            console.error('Error parsing behavior params:', error);
          }
        }
      },
      mouseleave: {
        name: '鼠标离开',
        handler: (params, el, event) => {
          if (!window.isPreviewMode) return;
          el.style.transform = 'scale(1)';
          el.style.boxShadow = 'none';
        }
      }
    }
  }
};


// 添加组件管理相关的逻辑
export const componentManager = {
  // 组件注册和获取
  getComponentConfig(type) {
    return componentConfigs[type];
  },

  // 创建新组件实例
  createComponent(type, props = {}, style = {}) {
    const config = this.getComponentConfig(type);
    if (!config) return null;

    return {
      id: `${type}_${Date.now()}`,
      type,
      props: { ...config.defaultProps, ...props },
      style: { ...config.defaultStyle, ...style },
      behaviors: this.initComponentBehaviors(type),
      children: []
    };
  },

  // 初始化组件行为
  initComponentBehaviors(type) {
    const config = this.getComponentConfig(type);
    if (!config?.behaviors) return {};

    const componentBehaviors = {};
    config.behaviors.forEach(behaviorType => {
      const behavior = behaviors[behaviorType];
      if (behavior) {
        componentBehaviors[behaviorType] = {
          enabled: false
        };
        Object.entries(behavior.events).forEach(([event, config]) => {
          componentBehaviors[behaviorType][event] = {};
          if (config.params) {
            Object.entries(config.params).forEach(([param, paramConfig]) => {
              componentBehaviors[behaviorType][event][param] = paramConfig.default || '';
            });
          }
        });
      }
    });
    return componentBehaviors;
  },

  // 获取组件名称
  getComponentName(component) {
    const typeConfig = {
      text: '文本',
      button: '按钮',
      image: '图片',
      container: '容器',
      // ... 其他组件类型
    };
    
    let name = typeConfig[component.type] || component.type;
    
    if (component.props) {
      if (component.type === 'text') {
        name += `: ${component.props.content?.slice(0, 10)}${component.props.content?.length > 10 ? '...' : ''}`;
      } else if (component.type === 'button') {
        name += `: ${component.props.text}`;
      }
    }
    
    return name;
  },

  // 获取组件图标
  getComponentIcon(type) {
    const icons = {
      text: '📝',
      button: '🔘',
      image: '🖼️',
      container: '📦',
      // ... 其他组件图标
    };
    return icons[type] || '📄';
  }
};

// 添加组件树操作相关的逻辑
export const componentTreeManager = {
  // 构建组件树
  buildComponentTree(components, level = 0) {
    return components.map(comp => ({
      id: comp.id,
      name: componentManager.getComponentName(comp),
      type: comp.type,
      level,
      children: comp.children ? this.buildComponentTree(comp.children, level + 1) : []
    }));
  },

  // 查找组件
  findComponent(components, id) {
    for (const comp of components) {
      if (comp.id === id) return comp;
      if (comp.children?.length) {
        const found = this.findComponent(comp.children, id);
        if (found) return found;
      }
    }
    return null;
  },

  // 更新组件
  updateComponent(components, id, updates) {
    return components.map(comp => {
      if (comp.id === id) {
        return { ...comp, ...updates };
      }
      if (comp.children?.length) {
        return {
          ...comp,
          children: this.updateComponent(comp.children, id, updates)
        };
      }
      return comp;
    });
  }
};

// 添加悬浮菜单配置
export const hoverMenuConfig = {
  text: {
    editMode: [
      { icon: '✏️', label: '编辑', action: 'edit' },
      { icon: '🗑️', label: '删除', action: 'delete' },
      { icon: '📋', label: '复制', action: 'copy' }
    ],
    previewMode: [
      { icon: '🔗', label: '链接', action: 'link' }
    ]
  },
  button: {
    editMode: [
      { icon: '✏️', label: '编辑', action: 'edit' },
      { icon: '🗑️', label: '删除', action: 'delete' },
      { icon: '📋', label: '复制', action: 'copy' }
    ],
    previewMode: [
      { icon: '🔗', label: '链接', action: 'link' }
    ]
  },
  // ... 其他组件类型的菜单配置
};
