import { createStateManager } from "./createStateManager.js";

const createDefaultOptions = () => ({
    width: 0,
    height: 0,
    maintainAspectRatio: true
});

const createResizeController = (resizeOptions) => ({
    updateOptions(newOptions) {
        Object.assign(resizeOptions.value, newOptions);
    },

    resetToSize(width, height, maintainRatio = true) {
        resizeOptions.value = {
            width,
            height,
            maintainAspectRatio: maintainRatio
        };
    },
    setWidth(width) {
        const newWidth = parseInt(width) || 0;
        resizeOptions.value.width = newWidth;

        if (resizeOptions.value.maintainAspectRatio) {
            const ratio = resizeOptions.value.width / resizeOptions.value.height;
            resizeOptions.value.height = Math.round(newWidth / ratio);
        }
    },
    handleResizeInputWithRatio(dimension, aspectRatio) {
        if (resizeOptions.value.maintainAspectRatio) {

            if (dimension === 'width') {
                resizeOptions.value.height = Math.round(resizeOptions.value.width / aspectRatio);
            } else {
                resizeOptions.value.width = Math.round(resizeOptions.value.height * aspectRatio);
            }
        }
    },
    setHeight(height) {
        const newHeight = parseInt(height) || 0;
        resizeOptions.value.height = newHeight;

        if (resizeOptions.value.maintainAspectRatio) {
            const ratio = resizeOptions.value.width / resizeOptions.value.height;
            resizeOptions.value.width = Math.round(newHeight * ratio);
        }
    },

    toggleAspectRatio() {
        resizeOptions.value.maintainAspectRatio = !resizeOptions.value.maintainAspectRatio;
    },

    getDimensions() {
        return {
            width: resizeOptions.value.width,
            height: resizeOptions.value.height,
            maintainAspectRatio: resizeOptions.value.maintainAspectRatio
        };
    },

    isValidSize() {
        return resizeOptions.value.width > 0 && resizeOptions.value.height > 0;
    },

    dispose() {
        const { registry } = getRegistryInstance();
        registry.delete(instanceId);
    }
});

const { useManager: useResizeOptions, utils: resizeOptionsUtils } = createStateManager({
    registryKey: 'resize-options-registry',
    createDefaultState: createDefaultOptions,
    prefix: 'resize-options',
    createController: createResizeController
});

export { useResizeOptions, resizeOptionsUtils };