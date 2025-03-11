export const 是串链器 = (目标) => {
    return Boolean(目标 && 目标.串链器);
}

export const 标记串链器 = (目标) => {
    Object.defineProperty(目标, 串链器标记, {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false
    });
    return 目标;
}

export const 串链器标记 = Symbol.for('串链器');
export const 是串链器标记 = (目标) => {
    return 目标 === 串链器标记
}

