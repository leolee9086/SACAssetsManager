/**
 * Function Call 构建器
 * @param {string} name - function call 名称
 * @param {string} description - function call 描述
 * @param {object} options - 配置选项
 * @param {string} options.context - 背景信息
 * @param {string} options.reference - 参考信息
 * @param {object} parameters - function call 参数
 * @returns {object} - 兼容自然语言和 JS 调用的 function call 对象
 */
export function functionCallBuilder(name, description, { context, reference } = {}, parameters = {}) {
  // 生成供 AI 阅读的策略说明
  const strategyDescription = `
Function Call: ${name}
Description: ${description}
${context ? `Context: ${context}` : ''}
${reference ? `Reference: ${reference}` : ''}
Parameters:
${Object.entries(parameters)
  .map(([key, { type, description }]) => `- ${key} (${type}): ${description}`)
  .join('\n')}
`;

  // 返回兼容自然语言和 JS 调用的对象
  return {
    // 自然语言描述
    description: strategyDescription,

    // JS 程序调用
    call: (args) => {
      // 参数校验
      for (const [key, { type }] of Object.entries(parameters)) {
        if (args[key] === undefined) {
          throw new Error(`Missing required parameter: ${key}`);
        }
        if (typeof args[key] !== type) {
          throw new Error(`Invalid type for parameter ${key}: expected ${type}, got ${typeof args[key]}`);
        }
      }

      // 返回 function call 结构
      return {
        name,
        arguments: args
      };
    },

    // 元数据
    meta: {
      name,
      description,
      context,
      reference,
      parameters
    }
  };
}

