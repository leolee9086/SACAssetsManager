/**
 * 数字输入控件
 * 
 * 创建一个用于数字输入的Vue组件，包含增加和减少按钮。
 * 使用JavaScript定义Vue组件，可以与Vue框架集成。
 * 
 * @module shared/components/controls/numberInput
 */

/**
 * 数字输入控件Vue组件
 */
export const SacNumberInput = {
  name: 'SacNumberInput',
  props: {
    // v-model绑定值
    value: {
      type: Number,
      required: true
    },
    // 最小值
    min: {
      type: Number,
      default: 0
    },
    // 最大值
    max: {
      type: Number,
      default: Infinity
    },
    // 步长
    step: {
      type: Number,
      default: 1
    },
    // 单位
    unit: {
      type: String,
      default: ''
    },
    // 精度（小数位数）
    precision: {
      type: Number,
      default: 0
    },
    // 禁用状态
    disabled: {
      type: Boolean,
      default: false
    },
    // 控件大小
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    }
  },
  
  computed: {
    // 计算显示值
    displayValue() {
      return `${this.value.toFixed(this.precision)}${this.unit}`;
    },
    
    // 控件类名
    inputClasses() {
      return [
        'sac-number-input',
        `sac-number-input--${this.size}`,
        {
          'sac-number-input--disabled': this.disabled
        }
      ];
    }
  },
  
  methods: {
    // 增加值
    increase() {
      if (this.disabled) return;
      
      const newValue = Math.min(this.value + this.step, this.max);
      if (newValue !== this.value) {
        this.$emit('input', newValue);
        this.$emit('change', newValue, this.value);
      }
    },
    
    // 减少值
    decrease() {
      if (this.disabled) return;
      
      const newValue = Math.max(this.value - this.step, this.min);
      if (newValue !== this.value) {
        this.$emit('input', newValue);
        this.$emit('change', newValue, this.value);
      }
    },
    
    // 处理键盘输入
    handleKeydown(event) {
      if (this.disabled) return;
      
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          this.increase();
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.decrease();
          break;
      }
    }
  },
  
  // 使用渲染函数
  render(h) {
    return h('div', {
      class: this.inputClasses,
      on: {
        keydown: this.handleKeydown
      }
    }, [
      // 减少按钮
      h('button', {
        class: 'sac-number-input__decrease',
        attrs: {
          type: 'button',
          disabled: this.disabled || this.value <= this.min
        },
        on: {
          click: this.decrease
        }
      }, '-'),
      
      // 值显示区域
      h('span', {
        class: 'sac-number-input__value',
        attrs: {
          tabindex: this.disabled ? -1 : 0
        }
      }, this.displayValue),
      
      // 增加按钮
      h('button', {
        class: 'sac-number-input__increase',
        attrs: {
          type: 'button',
          disabled: this.disabled || this.value >= this.max
        },
        on: {
          click: this.increase
        }
      }, '+')
    ]);
  }
};

/**
 * 可编辑数字输入控件Vue组件
 * 扩展了SacNumberInput，允许直接编辑数值
 */
export const SacEditableNumberInput = {
  name: 'SacEditableNumberInput',
  mixins: [{
    props: SacNumberInput.props,
    computed: SacNumberInput.computed,
    methods: SacNumberInput.methods
  }],
  
  data() {
    return {
      // 是否处于编辑状态
      isEditing: false,
      // 临时编辑值
      editValue: ''
    };
  },
  
  methods: {
    // 开始编辑
    startEdit() {
      if (this.disabled) return;
      
      this.isEditing = true;
      this.editValue = this.value.toFixed(this.precision);
      this.$nextTick(() => {
        const input = this.$el.querySelector('.sac-number-input__input');
        if (input) {
          input.focus();
          input.select();
        }
      });
    },
    
    // 结束编辑
    finishEdit() {
      this.isEditing = false;
      
      // 尝试解析输入值
      let newValue = parseFloat(this.editValue);
      
      // 验证输入
      if (isNaN(newValue)) {
        newValue = this.value;
      } else {
        // 确保在允许范围内
        newValue = Math.min(Math.max(newValue, this.min), this.max);
      }
      
      if (newValue !== this.value) {
        this.$emit('input', newValue);
        this.$emit('change', newValue, this.value);
      }
    },
    
    // 处理输入变化
    handleInput(event) {
      this.editValue = event.target.value;
    },
    
    // 处理键盘事件
    handleInputKeydown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.finishEdit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.isEditing = false;
      }
    }
  },
  
  // 使用渲染函数
  render(h) {
    return h('div', {
      class: this.inputClasses
    }, [
      // 减少按钮
      h('button', {
        class: 'sac-number-input__decrease',
        attrs: {
          type: 'button',
          disabled: this.disabled || this.value <= this.min
        },
        on: {
          click: this.decrease
        }
      }, '-'),
      
      // 值显示区域/输入框
      this.isEditing
        ? h('input', {
            class: 'sac-number-input__input',
            attrs: {
              type: 'text',
              value: this.editValue
            },
            on: {
              input: this.handleInput,
              blur: this.finishEdit,
              keydown: this.handleInputKeydown
            }
          })
        : h('span', {
            class: 'sac-number-input__value',
            attrs: {
              tabindex: this.disabled ? -1 : 0
            },
            on: {
              click: this.startEdit
            }
          }, this.displayValue),
      
      // 增加按钮
      h('button', {
        class: 'sac-number-input__increase',
        attrs: {
          type: 'button',
          disabled: this.disabled || this.value >= this.max
        },
        on: {
          click: this.increase
        }
      }, '+')
    ]);
  }
};

// 数字输入控件的CSS样式，可以通过Vue插件安装时注入
export const numberInputStyle = `
.sac-number-input {
  display: inline-flex;
  align-items: center;
  user-select: none;
}

.sac-number-input__decrease,
.sac-number-input__increase {
  background-color: #f5f7fa;
  color: #606266;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  padding: 0;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
}

.sac-number-input__decrease:hover,
.sac-number-input__increase:hover {
  color: #409eff;
}

.sac-number-input__decrease:disabled,
.sac-number-input__increase:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.sac-number-input__value {
  display: inline-block;
  text-align: center;
  font-size: 14px;
  margin: 0 5px;
  min-width: 40px;
  outline: none;
}

.sac-number-input__value:focus {
  color: #409eff;
}

.sac-number-input__input {
  text-align: center;
  font-size: 14px;
  margin: 0 5px;
  min-width: 40px;
  outline: none;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 2px 5px;
}

.sac-number-input--small .sac-number-input__decrease,
.sac-number-input--small .sac-number-input__increase {
  width: 24px;
  height: 24px;
}

.sac-number-input--medium .sac-number-input__decrease,
.sac-number-input--medium .sac-number-input__increase {
  width: 30px;
  height: 30px;
}

.sac-number-input--large .sac-number-input__decrease,
.sac-number-input--large .sac-number-input__increase {
  width: 36px;
  height: 36px;
}

.sac-number-input--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.sac-number-input--disabled .sac-number-input__value {
  color: #c0c4cc;
}
`;

// 中文别名
export const 数字输入 = SacNumberInput;
export const 可编辑数字输入 = SacEditableNumberInput; 