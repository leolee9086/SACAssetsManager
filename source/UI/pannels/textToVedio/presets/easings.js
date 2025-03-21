export const linear = t => t

export const easeIn = t => t * t

export const easeOut = t => t * (2 - t)

export const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

export const elastic = t => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

export const bounce = t => {
    if (t < 1 / 2.75) {
        return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
        t -= 1.5 / 2.75;
        return 7.5625 * t * t + 0.75;
    } else if (t < 2.5 / 2.75) {
        t -= 2.25 / 2.75;
        return 7.5625 * t * t + 0.9375;
    } else {
        t -= 2.625 / 2.75;
        return 7.5625 * t * t + 0.984375;
    }
}

export const easeInCubic = t => t * t * t

export const easeOutCubic = t => 1 - Math.pow(1 - t, 3)

export const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const easeInQuart = t => t * t * t * t

export const easeOutQuart = t => 1 - Math.pow(1 - t, 4)

export const easeInOutQuart = t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2

export const easeInQuint = t => t * t * t * t * t

export const easeOutQuint = t => 1 - Math.pow(1 - t, 5)

export const easeInOutQuint = t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2

export const easeInCirc = t => 1 - Math.sqrt(1 - Math.pow(t, 2))

export const easeOutCirc = t => Math.sqrt(1 - Math.pow(t - 1, 2))

export const easeInOutCirc = t => t < 0.5 
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2

export const easeInSine = t => 1 - Math.cos((t * Math.PI) / 2)

export const easeOutSine = t => Math.sin((t * Math.PI) / 2)

export const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2

export const easeInExpo = t => t === 0 ? 0 : Math.pow(2, 10 * t - 10)

export const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)

export const easeInOutExpo = t => t === 0 
    ? 0 
    : t === 1 
    ? 1 
    : t < 0.5 
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2

export const easeInBack = t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
}

export const easeOutBack = t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export const easeInOutBack = t => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}

export const elasticStrong = t => {
    if (t === 0 || t === 1) return t;
    const p = 0.25;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (4 * Math.PI) / p) + 1;
}

export const elasticGentle = t => {
    if (t === 0 || t === 1) return t;
    const p = 0.5;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

export const bounceDouble = t => {
    const bounceCalc = n => {
        if (n < 1 / 2.75) {
            return 7.5625 * n * n;
        } else if (n < 2 / 2.75) {
            n -= 1.5 / 2.75;
            return 7.5625 * n * n + 0.75;
        } else if (n < 2.5 / 2.75) {
            n -= 2.25 / 2.75;
            return 7.5625 * n * n + 0.9375;
        } else {
            n -= 2.625 / 2.75;
            return 7.5625 * n * n + 0.984375;
        }
    };
    
    if (t < 0.5) {
        return (1 - bounceCalc(1 - t * 2)) / 2;
    } else {
        return (1 + bounceCalc(t * 2 - 1)) / 2;
    }
}

export const steps = (n = 10) => t => Math.floor(t * n) / n

export const bouncePlusElastic = t => {
    const b = bounce(t);
    // 这里似乎缺少实现，需要完成函数
    return b;
}

// 为了向后兼容，也可以导出包含所有函数的对象
export const easings = {
    linear,
    easeIn,
    easeOut,
    easeInOut,
    elastic,
    bounce,
    easeInCubic,
    easeOutCubic,
    easeInOutCubic,
    easeInQuart,
    easeOutQuart,
    easeInOutQuart,
    easeInQuint,
    easeOutQuint,
    easeInOutQuint,
    easeInCirc,
    easeOutCirc,
    easeInOutCirc,
    easeInSine,
    easeOutSine,
    easeInOutSine,
    easeInExpo,
    easeOutExpo,
    easeInOutExpo,
    easeInBack,
    easeOutBack,
    easeInOutBack,
    elasticStrong,
    elasticGentle,
    bounceDouble,
    steps,
    bouncePlusElastic
    // 其他缓动函数也要添加在这里
}
