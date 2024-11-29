export const isPressureSupported = () => {
    return (
        window.PointerEvent &&
        'pressure' in window.PointerEvent.prototype
    ) || (
            window.TouchEvent &&
            'force' in window.TouchEvent.prototype
        );

}