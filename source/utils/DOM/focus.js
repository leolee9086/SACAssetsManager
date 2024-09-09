export function setFocus(element) {
    if (!element.classList.contains('focused')) {
        element.focus()
        // 移除所有元素的焦点样式
        document.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));
        // 为目标元素添加焦点样式
        element.classList.add('focused');
        // 确保元素在视图中可见
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}