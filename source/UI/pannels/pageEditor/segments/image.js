export default {
    type: 'image',
    defaultProps: {
      src: '',
      alt: '图片',
      objectFit: 'cover'
    },
    defaultStyle: {
      width: '200px',
      height: '200px'
    },
    render: (component) => `
      <img src="${component.props.src || ''}" 
        alt="${component.props.alt || ''}"
        style="width: 100%; height: 100%; object-fit: ${component.props.objectFit || 'cover'};">
    `,
    previewStyle: {
      width: '100px',
      height: '100px'
    }
  }