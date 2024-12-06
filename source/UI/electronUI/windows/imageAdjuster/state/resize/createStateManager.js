// 创建全局注册表
import { ref,onUnmounted  } from "../../../../../../../static/vue.esm-browser.js";
const createRegistry = (registryKey) => {
    const getRegistry = () => {
        if (!globalThis[registryKey]) {
            globalThis[registryKey] = {
                registry: new Map(),
                autoIncrementId: 0
            };
        }
        return globalThis[registryKey];
    };

    const getRegistryInstance = () => {
        const global = getRegistry();
        return {
            registry: global.registry,
            getNextId: () => global.autoIncrementId++
        };
    };

    // 通用工具方法
    const utils = {
        getAllInstances() {
            const { registry } = getRegistryInstance();
            return Array.from(registry.entries());
        },
        
        dispose(id) {
            const { registry } = getRegistryInstance();
            return registry.delete(id);
        },
        
        disposeAll() {
            const { registry } = getRegistryInstance();
            registry.clear();
            getRegistry().autoIncrementId = 0;
        },
        
        getInstanceCount() {
            const { registry } = getRegistryInstance();
            return registry.size;
        }
    };

    return {
        getRegistryInstance,
        utils
    };
};

// 创建状态管理器
export const createStateManager = ({
    registryKey,
    createDefaultState,
    prefix,
    createController
}) => {
    const { getRegistryInstance, utils } = createRegistry(Symbol.for(registryKey));

    const useManager = (id = null) => {
        const { registry, getNextId } = getRegistryInstance();
        const instanceId = id || Symbol(`${prefix}-${getNextId()}`);

        if (registry.has(instanceId)) {
            return {
                state: registry.get(instanceId),
                instanceId,
                ...createController(registry.get(instanceId))
            };
        }

        const state = ref(createDefaultState());
        registry.set(instanceId, state);

        onUnmounted(() => {
            if (!id) {
                registry.delete(instanceId);
            }
        });

        return {
            state,
            instanceId,
            ...createController(state)
        };
    };

    return {
        useManager,
        utils
    };
};
