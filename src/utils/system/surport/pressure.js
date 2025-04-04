
export const 当前设备支持压感 = (window.PointerEvent &&
'pressure' in window.PointerEvent.prototype
) || (
    window.TouchEvent &&
    'force' in window.TouchEvent.prototype
);