/**
 * 创建适配器工厂
 * @param {string} type - 适配器类型
 * @param {Object} capability - 适配器能力
 * @param {function} implementation - 适配器实现
 * @returns {Object} 适配器注册信息
 */
function createAdapterFactory(type, capability, implementation) {
  return {
    id: type,
    capability,
    factory: async (context) => implementation(context)
  };
}

export { createAdapterFactory };
