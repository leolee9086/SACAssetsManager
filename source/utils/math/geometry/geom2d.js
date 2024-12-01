// 计算两点之间的距离和角度
export const 计算点距离和角度 = (startX, startY, endX, endY) => {
    const dx = endX - startX
    const dy = endY - startY
    return {
        distance: Math.sqrt(dx * dx + dy * dy),
        angle: Math.atan2(dy, dx)
    }
}

export const 按距离采样点序列 = (原始点序列, 最小采样距离, 最大采样距离) => {
    return 原始点序列.reduce((采样后点序列, 当前点) => {
        if (采样后点序列.length === 0) {
            采样后点序列.push(当前点);
            return 采样后点序列;
        }
        const 上一采样点 = 采样后点序列[采样后点序列.length - 1];
        const 空间距离 = Math.hypot(当前点.x - 上一采样点.x, 当前点.y - 上一采样点.y);

        if (空间距离 >= 最小采样距离 && 空间距离 <= 最大采样距离) {
            采样后点序列.push(当前点);
        }
        return 采样后点序列;
    }, []);
};

export const xywh2ltwh = (xywh) => {
    if (!xywh || typeof xywh !== 'object') {
        console.warn('无效的XYWH格式数据')
        return null
    }

    return {
        left: xywh.x,
        top: xywh.y,
        width: xywh.width,
        height: xywh.height
    }
}
