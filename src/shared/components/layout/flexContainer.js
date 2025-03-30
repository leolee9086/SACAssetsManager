/**
 * Flex布局容器
 * 
 * 提供可配置的Flex布局容器，使用JavaScript定义Vue组件。
 * 
 * @module shared/components/layout/flexContainer
 */

/**
 * Flex容器组件
 */
export const SacFlexContainer = {
  name: 'SacFlexContainer',
  props: {
    // 排列方向
    direction: {
      type: String,
      default: 'row',
      validator: (value) => ['row', 'column', 'row-reverse', 'column-reverse'].includes(value)
    },
    // 主轴对齐方式
    justify: {
      type: String,
      default: 'flex-start',
      validator: (value) => [
        'flex-start', 'flex-end', 'center', 
        'space-between', 'space-around', 'space-evenly'
      ].includes(value)
    },
    // 交叉轴对齐方式
    align: {
      type: String,
      default: 'stretch',
      validator: (value) => [
        'flex-start', 'flex-end', 'center', 
        'baseline', 'stretch'
      ].includes(value)
    },
    // 换行设置
    wrap: {
      type: String,
      default: 'nowrap',
      validator: (value) => ['nowrap', 'wrap', 'wrap-reverse'].includes(value)
    },
    // 间距
    gap: {
      type: [String, Number],
      default: 0
    },
    // 行间距
    rowGap: {
      type: [String, Number],
      default: null
    },
    // 列间距
    columnGap: {
      type: [String, Number],
      default: null
    },
    // 内边距
    padding: {
      type: String,
      default: '0'
    },
    // 外边距
    margin: {
      type: String,
      default: '0'
    },
    // 是否占满容器宽度
    fullWidth: {
      type: Boolean,
      default: false
    },
    // 是否占满容器高度
    fullHeight: {
      type: Boolean,
      default: false
    },
    // 自定义类名
    customClass: {
      type: String,
      default: ''
    }
  },
  
  computed: {
    // 计算容器类名
    containerClasses() {
      return [
        'sac-flex-container',
        this.customClass
      ];
    },
    
    // 计算容器样式
    containerStyles() {
      const styles = {
        display: 'flex',
        flexDirection: this.direction,
        justifyContent: this.justify,
        alignItems: this.align,
        flexWrap: this.wrap,
        padding: this.padding,
        margin: this.margin
      };
      
      // 设置间距
      if (this.gap !== null && this.gap !== undefined) {
        styles.gap = typeof this.gap === 'number' ? `${this.gap}px` : this.gap;
      }
      
      if (this.rowGap !== null && this.rowGap !== undefined) {
        styles.rowGap = typeof this.rowGap === 'number' ? `${this.rowGap}px` : this.rowGap;
      }
      
      if (this.columnGap !== null && this.columnGap !== undefined) {
        styles.columnGap = typeof this.columnGap === 'number' ? `${this.columnGap}px` : this.columnGap;
      }
      
      // 是否占满宽高
      if (this.fullWidth) {
        styles.width = '100%';
      }
      
      if (this.fullHeight) {
        styles.height = '100%';
      }
      
      return styles;
    }
  },
  
  render(h) {
    return h('div', {
      class: this.containerClasses,
      style: this.containerStyles
    }, this.$slots.default);
  }
};

/**
 * 行容器组件
 */
export const SacRow = {
  name: 'SacRow',
  functional: true,
  
  render(h, { props, data, children }) {
    // 将props传递给SacFlexContainer，并确保方向为row
    const containerProps = {
      ...data.props,
      ...props,
      direction: 'row'
    };
    
    return h(SacFlexContainer, {
      ...data,
      props: containerProps
    }, children);
  }
};

/**
 * 列容器组件
 */
export const SacColumn = {
  name: 'SacColumn',
  functional: true,
  
  render(h, { props, data, children }) {
    // 将props传递给SacFlexContainer，并确保方向为column
    const containerProps = {
      ...data.props,
      ...props,
      direction: 'column'
    };
    
    return h(SacFlexContainer, {
      ...data,
      props: containerProps
    }, children);
  }
};

/**
 * 空白间隔组件
 */
export const SacSpacer = {
  name: 'SacSpacer',
  props: {
    // 间隔大小
    size: {
      type: [String, Number],
      default: '8px'
    },
    // 是否为垂直方向
    vertical: {
      type: Boolean,
      default: false
    },
    // 是否为自动填充空间
    flex: {
      type: Boolean,
      default: false
    }
  },
  
  computed: {
    // 计算间隔样式
    spacerStyles() {
      if (this.flex) {
        return {
          flex: '1',
          minWidth: this.vertical ? '1px' : this.size,
          minHeight: this.vertical ? this.size : '1px'
        };
      } else {
        return {
          width: this.vertical ? '1px' : (typeof this.size === 'number' ? `${this.size}px` : this.size),
          height: this.vertical ? (typeof this.size === 'number' ? `${this.size}px` : this.size) : '1px',
          flexShrink: 0,
          flexGrow: 0
        };
      }
    }
  },
  
  render(h) {
    return h('div', {
      class: 'sac-spacer',
      style: this.spacerStyles
    });
  }
};

/**
 * Flex项目组件
 */
export const SacFlexItem = {
  name: 'SacFlexItem',
  props: {
    // flex属性
    flex: {
      type: [String, Number],
      default: null
    },
    // flex-grow属性
    grow: {
      type: [String, Number],
      default: null
    },
    // flex-shrink属性
    shrink: {
      type: [String, Number],
      default: null
    },
    // flex-basis属性
    basis: {
      type: [String, Number],
      default: null
    },
    // align-self属性
    alignSelf: {
      type: String,
      default: null
    },
    // 自定义类名
    customClass: {
      type: String,
      default: ''
    }
  },
  
  computed: {
    // 计算项目样式
    itemStyles() {
      const styles = {};
      
      if (this.flex !== null) {
        styles.flex = this.flex;
      }
      
      if (this.grow !== null) {
        styles.flexGrow = this.grow;
      }
      
      if (this.shrink !== null) {
        styles.flexShrink = this.shrink;
      }
      
      if (this.basis !== null) {
        styles.flexBasis = typeof this.basis === 'number' ? `${this.basis}px` : this.basis;
      }
      
      if (this.alignSelf !== null) {
        styles.alignSelf = this.alignSelf;
      }
      
      return styles;
    }
  },
  
  render(h) {
    return h('div', {
      class: ['sac-flex-item', this.customClass],
      style: this.itemStyles
    }, this.$slots.default);
  }
};

// Flex容器相关的CSS样式
export const flexContainerStyle = `
.sac-flex-container {
  display: flex;
  box-sizing: border-box;
}

.sac-flex-item {
  box-sizing: border-box;
}

.sac-spacer {
  display: block;
}
`;

// 中文别名
export const Flex容器 = SacFlexContainer;
export const 行容器 = SacRow;
export const 列容器 = SacColumn;
export const 间隔 = SacSpacer;
export const Flex项目 = SacFlexItem; 