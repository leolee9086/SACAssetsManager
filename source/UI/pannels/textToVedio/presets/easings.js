export const easings = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    elastic: t => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    },
    bounce: t => {
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
    },
    easeInCubic: t => t * t * t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeInQuart: t => t * t * t * t,
    easeOutQuart: t => 1 - Math.pow(1 - t, 4),
    easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
    easeInQuint: t => t * t * t * t * t,
    easeOutQuint: t => 1 - Math.pow(1 - t, 5),
    easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
    easeInCirc: t => 1 - Math.sqrt(1 - Math.pow(t, 2)),
    easeOutCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
    easeInOutCirc: t => t < 0.5 
        ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
        : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
    easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
    easeOutSine: t => Math.sin((t * Math.PI) / 2),
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutExpo: t => t === 0 
        ? 0 
        : t === 1 
        ? 1 
        : t < 0.5 
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2,
    easeInBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    },
    easeOutBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOutBack: t => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },
    elasticStrong: t => {
        if (t === 0 || t === 1) return t;
        const p = 0.25;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (4 * Math.PI) / p) + 1;
    },
    elasticGentle: t => {
        if (t === 0 || t === 1) return t;
        const p = 0.5;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    },
    bounceDouble: t => {
        const bounce = n => {
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
            return (1 - bounce(1 - t * 2)) / 2;
        } else {
            return (1 + bounce(t * 2 - 1)) / 2;
        }
    },
    steps: (n = 10) => t => Math.floor(t * n) / n,
    bouncePlusElastic: t => {
        const b = easings.bounce(t);
    }
}
