/**
 * 消息提示组件
 * 
 * 提供轻量级消息提示功能，使用JavaScript定义Vue组件。
 * 
 * @module shared/components/feedback/message
 */

/**
 * 消息类型
 */
const MESSAGE_TYPES = ['success', 'warning', 'info', 'error'];

/**
 * 消息默认选项
 */
const DEFAULT_OPTIONS = {
  type: 'info',
  message: '',
  duration: 3000,
  showClose: false,
  onClose: null,
  offset: 20,
  center: false,
  dangerouslyUseHTMLString: false
};

/**
 * 消息实例数组
 */
const instances = [];

/**
 * 消息组件计数
 */
let seed = 1;

/**
 * 消息组件
 */
export const SacMessage = {
  name: 'SacMessage',
  props: {
    // 消息类型
    type: {
      type: String,
      default: 'info',
      validator: (value) => MESSAGE_TYPES.includes(value)
    },
    // 消息文本
    message: {
      type: String,
      default: ''
    },
    // 显示时间，单位ms，0表示不会自动关闭
    duration: {
      type: Number,
      default: 3000
    },
    // 是否显示关闭按钮
    showClose: {
      type: Boolean,
      default: false
    },
    // 关闭回调
    onClose: {
      type: Function,
      default: null
    },
    // 垂直偏移量
    offset: {
      type: Number,
      default: 20
    },
    // 文字是否居中
    center: {
      type: Boolean,
      default: false
    },
    // 是否将message作为HTML片段处理
    dangerouslyUseHTMLString: {
      type: Boolean,
      default: false
    },
    // 消息ID
    id: {
      type: String,
      default: ''
    },
    // z-index值
    zIndex: {
      type: Number,
      default: 2000
    }
  },
  
  data() {
    return {
      // 是否可见
      visible: false,
      // 计时器
      timer: null,
      // 高度
      height: 0,
      // 关闭动画是否完成
      closed: false,
      // 垂直位置
      verticalOffset: this.offset
    };
  },
  
  computed: {
    // 计算组件类名
    messageClasses() {
      return [
        'sac-message',
        `sac-message--${this.type}`,
        {
          'sac-message--center': this.center,
          'is-closable': this.showClose
        }
      ];
    },
    
    // 计算组件样式
    messageStyle() {
      return {
        top: `${this.verticalOffset}px`,
        zIndex: this.zIndex
      };
    },
    
    // 图标类名
    iconClass() {
      const typeMap = {
        success: 'sac-icon-success',
        warning: 'sac-icon-warning',
        info: 'sac-icon-info',
        error: 'sac-icon-error'
      };
      
      return typeMap[this.type] || 'sac-icon-info';
    }
  },
  
  mounted() {
    this.startTimer();
    this.visible = true;
  },
  
  beforeDestroy() {
    this.clearTimer();
  },
  
  methods: {
    // 开始计时
    startTimer() {
      if (this.duration > 0) {
        this.timer = setTimeout(() => {
          if (!this.closed) {
            this.close();
          }
        }, this.duration);
      }
    },
    
    // 清除计时器
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },
    
    // 关闭消息
    close() {
      this.closed = true;
      this.visible = false;
      
      // 移除消息实例
      const index = instances.findIndex(instance => instance.id === this.id);
      if (index !== -1) {
        instances.splice(index, 1);
      }
      
      // 调整其他消息的位置
      const len = instances.length;
      if (len === 0) return;
      
      // 计算新位置
      const position = index;
      for (let i = position; i < len; i++) {
        const instance = instances[i];
        const pos = parseInt(instance.verticalOffset) - this.height - 16;
        instance.verticalOffset = pos;
      }
      
      // 触发关闭回调
      if (typeof this.onClose === 'function') {
        this.onClose();
      }
    },
    
    // 鼠标进入事件
    handleMouseEnter() {
      this.clearTimer();
    },
    
    // 鼠标离开事件
    handleMouseLeave() {
      this.startTimer();
    },
    
    // 关闭按钮点击事件
    handleCloseClick() {
      this.close();
    },
    
    // 动画结束回调
    handleAfterLeave() {
      this.$destroy(true);
      this.$el.parentNode.removeChild(this.$el);
    }
  },
  
  // 使用渲染函数
  render(h) {
    const { message, dangerouslyUseHTMLString, showClose } = this;
    
    // 消息内容
    const messageContent = dangerouslyUseHTMLString
      ? h('p', { class: 'sac-message__content', domProps: { innerHTML: message } })
      : h('p', { class: 'sac-message__content' }, message);
    
    // 子元素
    const children = [
      h('i', { class: ['sac-message__icon', this.iconClass] }),
      messageContent
    ];
    
    // 关闭按钮
    if (showClose) {
      children.push(
        h('div', { 
          class: 'sac-message__closeBtn',
          on: { click: this.handleCloseClick }
        }, 'x')
      );
    }
    
    return h('transition', {
      attrs: { name: 'sac-message-fade' },
      on: { 'after-leave': this.handleAfterLeave }
    }, [
      h('div', {
        class: this.messageClasses,
        style: this.messageStyle,
        directives: [{ name: 'show', value: this.visible }],
        on: {
          mouseenter: this.handleMouseEnter,
          mouseleave: this.handleMouseLeave
        },
        ref: 'message'
      }, children)
    ]);
  }
};

/**
 * 创建消息组件实例
 * @param {Object} options - 消息配置参数
 * @returns {Object} 消息实例对象
 */
const createMessage = (options) => {
  if (typeof options === 'string') {
    options = { message: options };
  }
  
  // 合并选项
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // 创建消息ID
  const id = `message_${seed++}`;
  mergedOptions.id = id;
  
  // 创建Vue构造函数
  const Constructor = Vue.extend(SacMessage);
  
  // 实例化消息组件
  const instance = new Constructor({
    propsData: mergedOptions
  });
  
  // 挂载到DOM
  const container = document.createElement('div');
  document.body.appendChild(container);
  instance.$mount(container);
  
  // 计算垂直偏移
  let verticalOffset = mergedOptions.offset;
  instances.forEach(item => {
    verticalOffset += item.$el.offsetHeight + 16;
  });
  instance.verticalOffset = verticalOffset;
  
  // 获取消息高度
  instance.height = instance.$el.offsetHeight;
  
  // 记录实例
  instances.push(instance);
  
  // 返回实例对象
  return {
    close: () => {
      instance.close();
    }
  };
};

/**
 * 消息API
 */
export const Message = (options) => createMessage(options);

// 为每种类型提供快捷方法
MESSAGE_TYPES.forEach(type => {
  Message[type] = (options) => {
    if (typeof options === 'string') {
      options = { message: options };
    }
    options.type = type;
    return createMessage(options);
  };
});

// 关闭所有消息
Message.closeAll = () => {
  for (let i = instances.length - 1; i >= 0; i--) {
    instances[i].close();
  }
};

// 消息提示相关的CSS样式
export const messageStyle = `
.sac-message {
  position: fixed;
  left: 50%;
  top: 20px;
  transform: translateX(-50%);
  min-width: 300px;
  padding: 10px 15px;
  border-radius: 4px;
  box-sizing: border-box;
  border: 1px solid #ebeef5;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: opacity 0.3s, transform 0.3s, top 0.3s;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.sac-message__icon {
  margin-right: 10px;
  font-size: 16px;
}

.sac-message__content {
  flex: 1;
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.sac-message__closeBtn {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  color: #c0c4cc;
  font-size: 16px;
}

.sac-message__closeBtn:hover {
  color: #909399;
}

.sac-message--center {
  justify-content: center;
}

.sac-message--center .sac-message__content {
  text-align: center;
}

.sac-message--success {
  background-color: #f0f9eb;
  border-color: #e1f3d8;
}

.sac-message--success .sac-message__icon,
.sac-message--success .sac-message__content {
  color: #67c23a;
}

.sac-message--warning {
  background-color: #fdf6ec;
  border-color: #faecd8;
}

.sac-message--warning .sac-message__icon,
.sac-message--warning .sac-message__content {
  color: #e6a23c;
}

.sac-message--info {
  background-color: #edf2fc;
  border-color: #ebeef5;
}

.sac-message--info .sac-message__icon,
.sac-message--info .sac-message__content {
  color: #909399;
}

.sac-message--error {
  background-color: #fef0f0;
  border-color: #fde2e2;
}

.sac-message--error .sac-message__icon,
.sac-message--error .sac-message__content {
  color: #f56c6c;
}

.sac-message-fade-enter,
.sac-message-fade-leave-active {
  opacity: 0;
  transform: translate(-50%, -20px);
}
`;

// 中文别名
export const 消息 = Message; 