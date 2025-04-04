export const addUniquePalletColors = (existingPallet, newColors) => {
    return Array.from(new Set([
        ...existingPallet,
        ...newColors.filter(color =>
            color && !existingPallet.some(existingColor =>
                existingColor.every((value, index) => value === color[index])
            )
        )
    ]));
};
