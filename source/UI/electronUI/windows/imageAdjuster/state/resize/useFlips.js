import { ref } from "../../../../../../../static/vue.esm-browser.js"
import { createStateManager } from "./createStateManager.js";
import { buildFlipPipeLine } from "../../pipelineBuilder.js";

const createDefaultFlips = () => ({
    horizontal: false,
    vertical: false
});

const createFlipsController = (flipOptions) => ({
    flipDirection(direction) {
        if (direction in flipOptions.value) {
            flipOptions.value[direction] = !flipOptions.value[direction];
        }
    },

    reset() {
        Object.assign(flipOptions.value, createDefaultFlips());
    },

    getFlipState() {
        return { ...flipOptions.value };
    },

    updateFlips(newFlips) {
        Object.assign(flipOptions.value, newFlips);
    },

    getPipeLine() {
        return buildFlipPipeLine(flipOptions.value);
    },

    dispose() {
        const { registry } = getRegistryInstance();
        registry.delete(instanceId);
    }
});

const { useManager: useFlips, utils: flipsUtils } = createStateManager({
    registryKey: 'flips-registry',
    createDefaultState: createDefaultFlips,
    prefix: 'flips',
    createController: createFlipsController
});

export { useFlips, flipsUtils };