export default{
    type: 'container',
    defaultProps: {
      direction: 'vertical',
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
      console.log('Rendering container:', component);
      
      const containerStyle = `
        display: flex;
        flex-direction: ${component.props.direction === 'horizontal' ? 'row' : 'column'};
        gap: ${component.props.gap || '12px'};
        padding: ${component.props.padding || '16px'};
        min-height: ${component.style.minHeight || '100px'};
        width: ${component.style.width || '100%'};
        background-color: ${component.style.backgroundColor || '#ffffff'};
        border-radius: ${component.style.borderRadius || '4px'};
        border: ${component.style.border || '1px solid #eee'};
      `;

      return `
        <div class="editor-component-container" style="${containerStyle}">
          ${component.childrenContent || '<div class="empty-container">拖拽组件到这里</div>'}
        </div>
      `;
    },
    previewStyle: {
      width: '150px',
      height: '80px',
      padding: '8px'
    }
  }