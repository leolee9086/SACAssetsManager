/**
 * 基础按钮组件
 * 
 * 提供可定制的按钮组件，使用JavaScript定义Vue组件。
 * 
 * @module shared/components/base/button
 */

/**
 * 按钮组件
 * 用JavaScript定义的Vue按钮组件
 */
export const SacButton = {
  name: 'SacButton',
  props: {
    // 按钮文本
    text: {
      type: String,
      default: ''
    },
    // 按钮类型
    type: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'primary', 'danger', 'text'].includes(value)
    },
    // 按钮大小
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    // 图标
    icon: {
      type: String,
      default: ''
    },
    // 是否为圆形按钮
    round: {
      type: Boolean,
      default: false
    },
    // 是否为块级按钮
    block: {
      type: Boolean,
      default: false
    }
  },
  
  computed: {
    // 计算按钮类名
    buttonClasses() {
      return [
        'sac-button',
        `sac-button--${this.type}`,
        `sac-button--${this.size}`,
        {
          'sac-button--disabled': this.disabled,
          'sac-button--round': this.round,
          'sac-button--block': this.block
        }
      ];
    }
  },
  
  methods: {
    // 处理点击事件
    handleClick(event) {
      if (this.disabled) {
        event.preventDefault();
        return;
      }
      this.$emit('click', event);
    }
  },
  
  // 使用渲染函数
  render(h) {
    return h(
      'button',
      {
        class: this.buttonClasses,
        attrs: {
          disabled: this.disabled,
          type: 'button'
        },
        on: {
          click: this.handleClick
        }
      },
      [
        // 图标
        this.icon ? h('span', { class: 'sac-button__icon' }, [
          h('i', { class: this.icon })
        ]) : null,
        
        // 文本
        this.text ? h('span', { class: 'sac-button__text' }, this.text) : null,
        
        // 默认插槽
        this.$slots.default
      ].filter(Boolean)
    );
  }
};

/**
 * 按钮组组件
 * 用JavaScript定义的Vue按钮组组件
 */
export const SacButtonGroup = {
  name: 'SacButtonGroup',
  props: {
    // 排列方向
    vertical: {
      type: Boolean,
      default: false
    },
    // 大小
    size: {
      type: String,
      default: '',
      validator: (value) => ['', 'small', 'medium', 'large'].includes(value)
    }
  },
  
  computed: {
    // 计算组件类名
    groupClasses() {
      return [
        'sac-button-group',
        {
          'sac-button-group--vertical': this.vertical
        },
        this.size ? `sac-button-group--${this.size}` : ''
      ];
    }
  },
  
  render(h) {
    // 如果指定了大小，给所有子按钮应用相同大小
    const children = this.$slots.default || [];
    
    if (this.size) {
      children.forEach(vnode => {
        if (vnode.componentOptions && vnode.componentOptions.tag === 'sac-button') {
          if (!vnode.componentOptions.propsData) {
            vnode.componentOptions.propsData = {};
          }
          vnode.componentOptions.propsData.size = this.size;
        }
      });
    }
    
    return h('div', { class: this.groupClasses }, children);
  }
};

// 按钮的CSS样式，可以通过Vue插件安装时注入
export const buttonStyle = `
.sac-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  -webkit-appearance: none;
  text-align: center;
  box-sizing: border-box;
  outline: none;
  transition: .1s;
  user-select: none;
  vertical-align: middle;
  border: 1px solid transparent;
  background-color: transparent;
  border-radius: 4px;
  padding: 8px 15px;
  font-size: 14px;
  margin: 0;
}

.sac-button:hover,
.sac-button:focus {
  opacity: 0.8;
}

.sac-button:active {
  opacity: 0.9;
}

.sac-button--disabled {
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}

.sac-button--default {
  background-color: #ffffff;
  border-color: #dcdfe6;
  color: #606266;
}

.sac-button--primary {
  background-color: #4285f4;
  border-color: #4285f4;
  color: #ffffff;
}

.sac-button--danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #ffffff;
}

.sac-button--text {
  border-color: transparent;
  color: #4285f4;
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

.sac-button--small {
  padding: 5px 10px;
  font-size: 12px;
}

.sac-button--medium {
  padding: 8px 15px;
  font-size: 14px;
}

.sac-button--large {
  padding: 11px 20px;
  font-size: 16px;
}

.sac-button--round {
  border-radius: 20px;
}

.sac-button--block {
  display: block;
  width: 100%;
}

.sac-button__icon {
  margin-right: 5px;
}

.sac-button-group {
  display: inline-flex;
}

.sac-button-group .sac-button {
  border-radius: 0;
}

.sac-button-group .sac-button:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.sac-button-group .sac-button:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.sac-button-group--vertical {
  flex-direction: column;
}

.sac-button-group--vertical .sac-button:first-child {
  border-radius: 4px 4px 0 0;
}

.sac-button-group--vertical .sac-button:last-child {
  border-radius: 0 0 4px 4px;
}
`;

// 中文别名
export const 按钮 = SacButton;
export const 按钮组 = SacButtonGroup; 