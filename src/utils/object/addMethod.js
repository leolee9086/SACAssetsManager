// 创建方法管理器
const METHOD_MANAGER = Symbol('methodManager');

// 初始化全局方法管理器
if (!window[METHOD_MANAGER]) {
    window[METHOD_MANAGER] = (() => {
        // 使用 Map 存储方法与对象的关系
        const methodTargetsMap = new Map();
        // 使用 WeakMap 存储对象与其方法的关系
        const targetMethodsMap = new WeakMap();
        // 添加方法元数据存储
        const methodMetadataMap = new Map();
        
        return {
            // 注册方法
            registerMethod(methodName, target) {
                if (!methodTargetsMap.has(methodName)) {
                    methodTargetsMap.set(methodName, new Set());
                }
                methodTargetsMap.get(methodName).add(new WeakRef(target));
                
                if (!targetMethodsMap.has(target)) {
                    targetMethodsMap.set(target, new Set());
                }
                targetMethodsMap.get(target).add(methodName);
                
                // 清理失效的引用
                this.cleanup();
            },
            // 清理失效的引用
            cleanup() {
                for (const [methodName, targets] of methodTargetsMap.entries()) {
                    for (const targetRef of targets) {
                        if (!targetRef.deref()) {
                            targets.delete(targetRef);
                        }
                    }
                }
            },
            // 获取拥有特定方法的所有对象
            getTargetsByMethod(methodName) {
                this.cleanup();
                const targets = methodTargetsMap.get(methodName);
                if (!targets) return [];
                return Array.from(targets)
                    .map(ref => ref.deref())
                    .filter(Boolean);
            },
            // 获取对象的所有方法
            getMethodsByTarget(target) {
                return Array.from(targetMethodsMap.get(target) || []);
            },
            // 移除对象的方法记录
            removeTarget(target) {
                const methods = targetMethodsMap.get(target);
                if (methods) {
                    methods.forEach(methodName => {
                        const targets = methodTargetsMap.get(methodName);
                        if (targets) {
                            for (const ref of targets) {
                                if (ref.deref() === target) {
                                    targets.delete(ref);
                                }
                            }
                        }
                    });
                }
                targetMethodsMap.delete(target);
            },
            // 添加方法元数据
            addMethodMetadata(methodName, metadata) {
                if (!methodMetadataMap.has(methodName)) {
                    methodMetadataMap.set(methodName, new Map());
                }
                const metadataMap = methodMetadataMap.get(methodName);
                Object.entries(metadata).forEach(([key, value]) => {
                    metadataMap.set(key, value);
                });
            },

            // 获取方法元数据
            getMethodMetadata(methodName) {
                return Object.fromEntries(methodMetadataMap.get(methodName) || new Map());
            },

            // 批量添加方法
            batchRegisterMethods(target, methods) {
                Object.entries(methods).forEach(([name, method]) => {
                    this.registerMethod(name, target);
                    target[name] = method;
                });
            },

            // 获取实现了所有指定方法的对象
            getTargetsWithAllMethods(methodNames) {
                this.cleanup();
                const allTargets = new Set(this.getTargetsByMethod(methodNames[0]));
                return Array.from(allTargets).filter(target => 
                    methodNames.every(method => this.getMethodsByTarget(target).includes(method))
                );
            },

            // 检查方法是否被任何对象实现
            isMethodImplemented(methodName) {
                this.cleanup();
                const targets = this.getTargetsByMethod(methodName);
                return targets.length > 0;
            }
        };
    })();
}

// 获取方法管理器
const getMethodManager = () => window[METHOD_MANAGER];

// 增强的 addMethod 函数
const addMethod = (target, name, method) => {
    target[name] = method;
    getMethodManager().registerMethod(name, target);
    return target;
};

// 增强的 addMethod 函数，添加元数据
const addMethodWithMetadata = (target, name, method, metadata = {}) => {
    target[name] = method;
    getMethodManager().registerMethod(name, target);
    getMethodManager().addMethodMetadata(name, metadata);
    return target;
};

// 批量添加方法
const addMethods = (target, methods) => {
    getMethodManager().batchRegisterMethods(target, methods);
    return target;
};

// 工具方法：检查对象是否具有指定方法
const hasMethod = (target, methodName) => {
    return getMethodManager().getMethodsByTarget(target).includes(methodName);
};

// 工具方法：获取所有具有指定方法的对象
const getObjectsWithMethod = (methodName) => {
    return getMethodManager().getTargetsByMethod(methodName);
};

// 工具方法：移除对象的所有方法记录
const removeMethodRecords = (target) => {
    getMethodManager().removeTarget(target);
    return target;
};

// 获取实现了所有指定方法的对象
const getObjectsWithAllMethods = (methodNames) => {
    return getMethodManager().getTargetsWithAllMethods(methodNames);
};

// 检查方法是否被任何对象实现
const isMethodImplemented = (methodName) => {
    return getMethodManager().isMethodImplemented(methodName);
};

// 获取方法的元数据
const getMethodMetadata = (methodName) => {
    return getMethodManager().getMethodMetadata(methodName);
};

// 导出所有公共API
export {
    addMethod,
    addMethodWithMetadata,
    addMethods,
    hasMethod,
    getObjectsWithMethod,
    getObjectsWithAllMethods,
    removeMethodRecords,
    isMethodImplemented,
    getMethodMetadata
};

// 默认导出主函数
export default addMethod;
