export default {
    type: 'button',
    defaultProps: {
      text: '按钮',
      padding: '8px 16px',
      background: '#1890ff',
      color: '#ffffff'
    },
    defaultStyle: {
      width: 'auto',
      height: 'auto',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    behaviors: ['clickable', 'hoverable'],
    render: (component) => {
      return `
        <button v-scope
                data-behavior-type="clickable,hoverable"
                data-component-behaviors='${JSON.stringify(component.behaviors || {})}'
                @click="handleBehavior('clickable', 'click', $event, $el.dataset.componentBehaviors)"
                @mouseenter="handleBehavior('hoverable', 'mouseenter', $event, $el.dataset.componentBehaviors)"
                @mouseleave="handleBehavior('hoverable', 'mouseleave', $event, $el.dataset.componentBehaviors)"
                style="
                  padding: ${component.props.padding || '8px 16px'};
                  background: ${component.props.background || '#1890ff'};
                  color: ${component.props.color || '#fff'};
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  transition: all 0.3s ease;
                ">
          ${component.props.text || '按钮'}
        </button>
      `;
    }
  }