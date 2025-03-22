// 词法状态常量
const STATE = {
  TEXT: 'TEXT',             // 文本内容
  ATTR_START: 'ATTR_START', // 属性开始
  ATTR_KEY: 'ATTR_KEY',     // 属性键
  EQUAL: 'EQUAL',           // 等号
  QUOTE_VALUE: 'QUOTE_VALUE', // 引号值
  UNQUOTE_VALUE: 'UNQUOTE_VALUE', // 无引号值
  SPACE: 'SPACE'            // 属性间空格
};

// 处理不同状态的函数
const stateHandlers = {
  [STATE.TEXT]: (char, nextChar, ctx) => {
    if (char === '{' && nextChar === ':') {
      return {
        ...ctx,
        state: STATE.ATTR_START,
        skipNext: true
      };
    }
    return {
      ...ctx,
      text: ctx.text + char
    };
  },

  [STATE.ATTR_START]: (char, _, ctx) => {
    if (/\s/.test(char)) {
      return { ...ctx, state: STATE.SPACE };
    } 
    if (char === '}') {
      return { ...ctx, state: STATE.TEXT };
    }
    return {
      ...ctx,
      currentKey: char,
      state: STATE.ATTR_KEY
    };
  },

  [STATE.ATTR_KEY]: (char, _, ctx) => {
    if (char === '=') {
      return { ...ctx, state: STATE.EQUAL };
    } 
    if (/\s/.test(char)) {
      return {
        ...ctx,
        attributes: { ...ctx.attributes, [ctx.currentKey]: true },
        currentKey: '',
        state: STATE.SPACE
      };
    } 
    if (char === '}') {
      return {
        ...ctx,
        attributes: { ...ctx.attributes, [ctx.currentKey]: true },
        currentKey: '',
        state: STATE.TEXT
      };
    }
    return { ...ctx, currentKey: ctx.currentKey + char };
  },

  [STATE.EQUAL]: (char, _, ctx) => {
    if (char === '"') {
      return { 
        ...ctx, 
        state: STATE.QUOTE_VALUE,
        currentValue: '' 
      };
    } 
    if (/\s/.test(char)) {
      return ctx; // 忽略等号后的空格
    }
    return {
      ...ctx,
      currentValue: char,
      state: STATE.UNQUOTE_VALUE
    };
  },

  [STATE.QUOTE_VALUE]: (char, _, ctx) => {
    if (char === '"') {
      return {
        ...ctx,
        attributes: { ...ctx.attributes, [ctx.currentKey]: ctx.currentValue },
        currentKey: '',
        currentValue: '',
        state: STATE.SPACE
      };
    }
    return { ...ctx, currentValue: ctx.currentValue + char };
  },

  [STATE.UNQUOTE_VALUE]: (char, _, ctx) => {
    if (/\s/.test(char)) {
      return {
        ...ctx,
        attributes: { ...ctx.attributes, [ctx.currentKey]: ctx.currentValue },
        currentKey: '',
        currentValue: '',
        state: STATE.SPACE
      };
    } 
    if (char === '}') {
      return {
        ...ctx,
        attributes: { ...ctx.attributes, [ctx.currentKey]: ctx.currentValue },
        currentKey: '',
        currentValue: '',
        state: STATE.TEXT
      };
    }
    return { ...ctx, currentValue: ctx.currentValue + char };
  },

  [STATE.SPACE]: (char, _, ctx) => {
    if (char === '}') {
      return { ...ctx, state: STATE.TEXT };
    } 
    if (!/\s/.test(char)) {
      return {
        ...ctx,
        currentKey: char,
        state: STATE.ATTR_KEY
      };
    }
    return ctx;
  }
};

// 处理文本末尾可能的残留属性
const finalizeAttributes = (ctx) => {
  const { state, currentKey, currentValue, attributes } = ctx;
  if (!currentKey) return attributes;
  
  if (state === STATE.UNQUOTE_VALUE) {
    return { ...attributes, [currentKey]: currentValue };
  } 
  if (state === STATE.ATTR_KEY) {
    return { ...attributes, [currentKey]: true };
  }
  
  return attributes;
};

/**
 * 解析文本行中的IAL属性
 * @param {string} line - 要解析的文本行
 * @returns {Object} 包含解析后的文本和属性对象
 */
export const parseLineWithAttributes = (line) => {
  // 初始上下文
  const initialContext = {
    text: '',
    attributes: {},
    currentKey: '',
    currentValue: '',
    state: STATE.TEXT,
    skipNext: false
  };
  
  // 使用reduce函数式处理字符串
  const finalContext = [...line].reduce((ctx, char, index) => {
    if (ctx.skipNext) {
      return { ...ctx, skipNext: false };
    }
    
    const nextChar = index < line.length - 1 ? line[index + 1] : '';
    const handler = stateHandlers[ctx.state];
    return handler(char, nextChar, ctx);
  }, initialContext);
  
  // 处理最终结果
  return {
    text: finalContext.text.trimEnd(),
    attributes: finalizeAttributes(finalContext)
  };
};
  
  