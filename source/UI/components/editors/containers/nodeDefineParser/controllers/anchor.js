import { AnchorTypes } from "../types.js";
export function createAnchorController(anchor, cardInfo) {
    return {
        ...anchor,
        setValue: (newValue) => {
            anchor.value.value = newValue;
        },
        getValue: () => anchor.value.value,
        reset: () => {
            const defaultValue = anchor.type === AnchorTypes.INPUT ? anchor.define.default : null;
            anchor.value.value = defaultValue;
        },
        cardId: cardInfo.id,
        anchorId: anchor.id
    };
}

export function createAnchorControllers(inputAnchors, outputAnchors, nodeDefine, componentProps, cardInfo) {
    const anchorPoints = inputAnchors.concat(outputAnchors);
    return anchorPoints.map(anchor => createAnchorController(anchor, cardInfo));
  }
  