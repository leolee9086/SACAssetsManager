export function horizontalScrollFirst(event) {
    const container = event.currentTarget;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const newScrollLeft = container.scrollLeft + event.deltaX;
    if ((newScrollLeft <= 0 && event.deltaX < 0) || (newScrollLeft >= maxScrollLeft && event.deltaX > 0)) {
        if (newScrollLeft <= 0) {
            container.scrollLeft = 0;
        } else if (newScrollLeft >= maxScrollLeft) {
            container.scrollLeft = maxScrollLeft;
        }
        // 尝试垂直滚动
        verticalScroll(event);
        
    } else {
        
        event.preventDefault();
        event.stopPropagation() 
        container.scrollLeft = newScrollLeft;
    }
}

export function verticalScrollFirst(event) {
    const container = event.currentTarget;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const newScrollTop = container.scrollTop + event.deltaY;

    if ((newScrollTop <= 0 && event.deltaY < 0) || (newScrollTop >= maxScrollTop && event.deltaY > 0)) {
        if (newScrollTop <= 0) {
            container.scrollTop = 0;
        } else if (newScrollTop >= maxScrollTop) {
            container.scrollTop = maxScrollTop;
        }
        // 尝试水平滚动
        horizontalScroll(event);
    } else {
        event.preventDefault();
        container.scrollTop = newScrollTop;
    }
}
export function verticalScroll(event) {
    const container = event.currentTarget;
    const maxScrollTop = container.scrollHeight - container.clientHeight; // 计算最大滚动高度

    // 更新滚动位置
    const newScrollTop = container.scrollTop + event.deltaY + event.deltaX;

    // 检查是否滚动到顶部或底部
    if ((newScrollTop <= 0 && event.deltaY < 0) || (newScrollTop >= maxScrollTop && event.deltaY > 0)) {
        // 如果在顶部向上滚或在底部向下滚，不阻止默认行为
        if(newScrollTop <= 0 && event.deltaY < 0){
          container.scrollTop=0
        }
        if(newScrollTop >= maxScrollTop && event.deltaY > 0){
          container.scrollTop=maxScrollTop
        }
    } else {
        // 在其他情况下，阻止默认滚动行为
        event.preventDefault();
        container.scrollTop = newScrollTop; // 应用新的滚动位置
    }
}
export function horizontalScroll(event) {
    const container = event.currentTarget;
    const maxScrollLeft = container.scrollWidth - container.clientWidth; // 计算最大滚动宽度

    // 更新滚动位置
    const newScrollLeft = container.scrollLeft + event.deltaY + event.deltaX;

    // 检查是否滚动到最左端或最右端
    if ((newScrollLeft <= 0 && (event.deltaY + event.deltaX) < 0) || (newScrollLeft >= maxScrollLeft && (event.deltaY + event.deltaX) > 0)) {
        // 如果在最左端向左滚或在最右端向右滚，不阻止默认行为
        if(newScrollLeft <= 0 && (event.deltaY + event.deltaX) < 0){
          container.scrollLeft = 0; // 确保不超出左边界
        }
        if(newScrollLeft >= maxScrollLeft && (event.deltaY + event.deltaX) > 0){
          container.scrollLeft = maxScrollLeft; // 确保不超出右边界
        }
    } else {
        // 在其他情况下，阻止默认滚动行为
        event.preventDefault();
        container.scrollLeft = newScrollLeft; // 应用新的滚动位置
    }
}
