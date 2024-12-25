export default {
  type: 'text',
  defaultProps: {
    content: '点击编辑文本',
    fontSize: '14px',
    color: '#333333',
    textAlign: 'left'
  },
  defaultStyle: {
    width: '200px',
    height: 'auto',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '4px'
  },
  behaviors: ['clickable'],
  render: (component) => {
    return `
      <div v-scope
           data-behavior-type="clickable"
           data-component-behaviors='${JSON.stringify(component.behaviors || {})}'
           @click="handleBehavior('clickable', 'click', $event, $el.dataset.componentBehaviors)"
           style="
             font-size: ${component.props.fontSize || '14px'};
             color: ${component.props.color || '#333'};
             text-align: ${component.props.textAlign || 'left'};
             transition: all 0.3s ease;
           ">
        ${component.props.content}
      </div>
    `;
  }
}; 