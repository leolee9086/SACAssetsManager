export const createBrushModeHandlers = (params) => {
    // 接收配置参数:
    // - isBrushMode: 画笔模式状态
    // - currentHoverElement: 当前悬停的元素
    // - onHover: 悬停回调
    // - onClick: 点击回调
    // - findTarget: 查找目标元素的方法
    // - cursor: 自定义光标配置
    const {
        isBrushMode,
        currentHoverElement,
        onHover,
        onClick,
        findTarget = findDefaultTarget,
        cursor = {
            type: 'default',
            value: 'pointer',
            offsetX: 0,
            offsetY: 0
        }
    } = params

    let cursorElement;

    const CURSOR_ID = 'global-brush-cursor';

    const createCursor = () => {
        if (cursor.type === 'default') {
            document.body.style.cursor = cursor.value;
            return;
        }

        cursorElement = cursor.type === 'element' 
            ? cursor.value.cloneNode(true)
            : document.createElement('img');
        
        cursorElement.id = CURSOR_ID;

        if (cursor.type === 'image') {
            cursorElement.src = cursor.value;
        }

        Object.assign(cursorElement.style, {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 10000,
            transform: `translate(${cursor.offsetX}px, ${cursor.offsetY}px)`
        });

        document.body.appendChild(cursorElement);
        document.body.style.cursor = 'none';
    }

    const updateCursorPosition = (e) => {
        if (cursorElement) {
            cursorElement.style.left = `${e.clientX}px`;
            cursorElement.style.top = `${e.clientY}px`;
        }
    }

    const removeCursor = () => {
        const existingCursor = document.getElementById(CURSOR_ID);
        if (existingCursor) {
            existingCursor.remove();
        }
        cursorElement = null;
        document.body.style.cursor = 'default';
    }

    const debounce = (fn, delay) => {
        let timer = null;
        return function (...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const handleMouseMove = (e) => {
        if (!isBrushMode.value) return;
        updateCursorPosition(e);
        
        // 使用防抖处理悬停逻辑
        debouncedHoverHandler(e);
    }

    const debouncedHoverHandler = debounce((e) => {
        if (currentHoverElement.value) {
            onHover?.cleanup?.(currentHoverElement.value);
        }
        const element = findTarget(e.target);
        if (element) {
            currentHoverElement.value = element;
            onHover?.apply?.(element);
        }
    }, 16); // 约60fps的刷新率

    const handleMouseClick = (e) => {
        if (!isBrushMode.value || !currentHoverElement.value) return;
        if (e.button === 0) {
            e.preventDefault();
            e.stopPropagation();
            const element = currentHoverElement.value;
            onClick?.(element);
            exitBrushMode();
        }
    }

    const handleKeyDown = (e) => {
        if (isBrushMode.value && e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            exitBrushMode();
        }
    }

    const handleContextMenu = (e) => {
        if (isBrushMode.value) {
            e.preventDefault();
            exitBrushMode();
        }
    }

    const exitBrushMode = () => {
        if (currentHoverElement.value) {
            onHover?.cleanup?.(currentHoverElement.value);
            currentHoverElement.value = null;
        }
        isBrushMode.value = false;
        removeCursor();
        removeBrushListeners();
    }

    const addBrushListeners = () => {
        createCursor();
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleMouseClick);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu, true);
    }

    const removeBrushListeners = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mousedown', handleMouseClick);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('contextmenu', handleContextMenu, true);
    }

    return {
        addBrushListeners,
        removeBrushListeners
    }
}

const findDefaultTarget = (element) => {
    while (element && !element.hasAttribute('data-node-id')) {
        element = element.parentElement;
    }
    return element;
}
