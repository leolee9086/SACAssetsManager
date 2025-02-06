// 时间格式化
export const 格式化时间戳 = (时间戳) => {
  if (!时间戳) return ''
  const 日期 = new Date(时间戳)
  return 日期.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 安全转义HTML字符
const 转义HTML = (文本) => {
  const 映射表 = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return 文本.replace(/[&<>"']/g, 字符 => 映射表[字符])
}

// 反转义HTML字符
const 反转义HTML = (文本) => {
  const 映射表 = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'"
  }
  return 文本.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, 实体 => 映射表[实体])
}

// Think内容解析
export const 解析思考内容 = (内容) => {
  if (!内容 || typeof 内容 !== 'string') {
    return { 思考内容: '', 普通内容: '', 有思考: false }
  }

  // 先转义内容中的HTML，但保留think标签
  const 安全内容 = 内容.replace(/<think>(.*?)<\/think>/g, (匹配, 组1) => {
    return `<think>${转义HTML(组1)}</think>`
  })
  
  const 解析器 = new DOMParser()
  const 文档 = 解析器.parseFromString(`<div>${安全内容}</div>`, 'text/html')
  const 思考元素 = 文档.querySelector('think')

  if (思考元素) {
    // 获取think标签内的内容并反转义
    const 思考内容 = 反转义HTML(思考元素.textContent.trim())
    // 移除think标签后的剩余内容并反转义
    思考元素.remove()
    const 普通内容 = 反转义HTML(文档.body.textContent.trim())

    return {
      思考内容,
      普通内容,
      有思考: true
    }
  }

  // 处理未闭合的think标签情况
  if (内容.includes('<think>') && !内容.includes('</think>')) {
    return {
      思考内容: '',
      普通内容: 转义HTML(内容),
      有思考: false
    }
  }

  return {
    思考内容: '',
    普通内容: 转义HTML(内容),
    有思考: false
  }
}

// DOM 相关工具函数
export const 更新元素高度 = (元素, 是否展开) => {
  if (!元素) return
  
  if (是否展开) {
    元素.style.maxHeight = `${元素.scrollHeight}px`
  } else {
    元素.style.maxHeight = '0px'
  }
}
