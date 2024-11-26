export  const ispressureSupported =()=>{
    return window.PointerEvent &&
    typeof window.PointerEvent === 'function';
}