const DECORATOR_IDS = {
    HALF_HEIGHT: 'half-height-decorator',
    HANDWRITTEN: 'handwritten-decorator',
    WAVE: 'wave-decorator',
    PARTICLE: 'particle-decorator'
};

let state = { totalStyles:13, styleElement: null }; // 添加对 state 的定义和初始化
let markerWidth = 8; // 新增：初始化 markerWidth 变量

const 创建半高装饰器 = () => {
    const styleElement = document.createElement('style');
    let styles = '';
    
    for (let i = 1; i <= state.totalStyles; i++) {
        styles += `
        .protyle-wysiwyg [data-node-id] [spellcheck] span[style*='background${i}'] {
            background-color: transparent !important;
            background: 
                radial-gradient(circle at 0.25rem 50%, var(--b3-font-background${i}) 50%, transparent 51%) left bottom / 0.5rem 0.5rem no-repeat,
                radial-gradient(circle at 0.25rem 50%, var(--b3-font-background${i}) 50%, transparent 51%) right bottom / 0.5rem 0.5rem no-repeat,
                linear-gradient(var(--b3-font-background${i}), var(--b3-font-background${i})) center bottom / calc(100% - 0.5rem) 0.5rem no-repeat;
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
        }`;
    }
    
    styleElement.textContent = styles;
    return styleElement;
};

const 生成随机路径 = () => {
    const baseY = 90;
    const variance = 15;
    const points = [];

    for (let i = 0; i <= 100; i += 20) {
        const y = baseY + (Math.random() - 0.5) * variance;
        points.push([i, y]);
    }

    return `M0,${baseY} ` + points.map((point, i) => {
        if (i === 0) return '';
        const prevPoint = points[i - 1];
        const cp1x = prevPoint[0] + 10;
        const cp1y = prevPoint[1];
        const cp2x = point[0] - 10;
        const cp2y = point[1];
        return `C${cp1x},${cp1y} ${cp2x},${cp2y} ${point[0]},${point[1]}`;
    }).join(' ');
};

const 获取颜色值 = (变量名) => {
    const styles = getComputedStyle(document.body);
    const colorValue = styles.getPropertyValue(变量名).trim(); // 获取body的样式表中的颜色值
    return colorValue.startsWith('rgb') ? rgbToHex(colorValue) : colorValue; // 转换为合法的SVG颜色值
};

const rgbToHex = (rgb) => {
    const result = rgb.match(/\d+/g);
    if (result) {
        const hex = `#${((1 << 24) + (result[0] << 16) + (result[1] << 8) + +result[2]).toString(16).slice(1)}`;
        return hex.length === 7 ? hex : '#000000'; // 确保返回的颜色值是有效的HEX格式
    }
    return rgb; // 如果无法转换，返回原始值
};

const 创建手写样式 = () => {
    const handwrittenElement = document.createElement('style');
    let styles = '';
    
    for (let i = 1; i <= state.totalStyles; i++) {
        const path = 生成随机路径();
        const svg = `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path}" stroke="${encodeURIComponent(获取颜色值(`--b3-font-background${i}`))}" fill="none" stroke-width="8" stroke-linecap="round" /></svg>`;
        
        styles += `
        .protyle-wysiwyg [data-node-id] [spellcheck] span[style*='background${i}'] {
            background-color: transparent !important;
            background-image: url('${svg}');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center bottom;
            padding-bottom: 0.2em;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
        }
        
       `;
    }
    
    handwrittenElement.textContent = styles;
    return handwrittenElement;
};

const 创建波浪装饰器 = () => {
    const styleElement = document.createElement('style');
    let styles = '';
    
    for (let i = 1; i <= state.totalStyles; i++) {
        const path = 生成波浪路径();
        const svg = `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path}" stroke="${encodeURIComponent(获取颜色值(`--b3-font-background${i}`))}" fill="none" stroke-width="8" stroke-linecap="round" /></svg>`;
        
        styles += `
        .protyle-wysiwyg [data-node-id] [spellcheck] span[style*='background${i}'] {
            background-color: transparent !important;
            background-image: url('${svg}');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center bottom;
            padding-bottom: 0.2em;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
        }
        `;
    }
    
    styleElement.textContent = styles;
    return styleElement;
};

const 生成波浪路径 = () => {
    const points = [];
    for (let i = 0; i <= 100; i += 10) {
        const y = 50 + 20 * Math.sin((i / 100) * 2 * Math.PI);
        points.push([i, y]);
    }

    return `M${points.map(point => point.join(',')).join(' ')}`;
};

const 创建粒子装饰器 = () => {
    const particleContainer = document.createElement('div');
    particleContainer.style.position = 'absolute';
    particleContainer.style.top = '0';
    particleContainer.style.left = '0';
    particleContainer.style.width = '100%';
    particleContainer.style.height = '100%';
    particleContainer.style.pointerEvents = 'none'; // 使粒子层不干扰其他元素

    for (let i = 0; i < 100; i++) { // 创建100个粒子
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '5px';
        particle.style.height = '5px';
        particle.style.backgroundColor = 获取颜色值(`--b3-font-background${(i % state.totalStyles) + 1}`); // 使用不同颜色
        particle.style.borderRadius = '50%';
        particle.style.opacity = Math.random(); // 随机透明度
        particle.style.transition = 'transform 0.5s ease, opacity 0.5s ease'; // 添加过渡效果

        // 随机位置
        particle.style.top = `${Math.random() * 100}vh`;
        particle.style.left = `${Math.random() * 100}vw`;

        // 动画效果
        setInterval(() => {
            particle.style.transform = `translate(${(Math.random() - 0.5) * 100}px, ${(Math.random() - 0.5) * 100}px)`;
            particle.style.opacity = Math.random(); // 随机改变透明度
        }, 1000);

        particleContainer.appendChild(particle);
    }

    document.body.appendChild(particleContainer);
    return particleContainer; // 返回粒子容器
};

let 当前装饰器 = '半高'; // 默认装饰器

const 切换装饰器 = (新装饰器) => {
    if (![DECORATOR_IDS.HALF_HEIGHT, DECORATOR_IDS.HANDWRITTEN, DECORATOR_IDS.WAVE, DECORATOR_IDS.PARTICLE].includes(新装饰器)) {
        console.error('无效的装饰器类型');
        return;
    }

    const existingStyle = document.head.querySelector(`#${DECORATOR_IDS.HALF_HEIGHT}`);
    const existingHandwritten = document.head.querySelector(`#${DECORATOR_IDS.HANDWRITTEN}`);
    
    if (existingStyle) {
        existingStyle.remove();
    }
    if (existingHandwritten) {
        existingHandwritten.remove();
    }

    state.styleElement = 新装饰器 === DECORATOR_IDS.HALF_HEIGHT ? 创建半高装饰器() :
                         新装饰器 === DECORATOR_IDS.HANDWRITTEN ? 创建手写样式() :
                         新装饰器 === DECORATOR_IDS.WAVE ? 创建波浪装饰器() :
                         创建粒子装饰器();
    state.styleElement.id = 新装饰器;
    document.head.appendChild(state.styleElement);

    // 更新当前装饰器
    当前装饰器 = 新装饰器;
};

const 创建浮动按钮 = () => {
    const button = document.createElement('button');
    button.textContent = '切换装饰器';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#007BFF';
    button.style.color = '#FFFFFF';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';

    button.addEventListener('click', () => {
        const newDecorator = 当前装饰器 === DECORATOR_IDS.HALF_HEIGHT ? DECORATOR_IDS.HANDWRITTEN :
                             当前装饰器 === DECORATOR_IDS.HANDWRITTEN ? DECORATOR_IDS.WAVE :
                             当前装饰器 === DECORATOR_IDS.WAVE ? DECORATOR_IDS.PARTICLE :
                             DECORATOR_IDS.HALF_HEIGHT;
        切换装饰器(newDecorator);
    });

    document.body.appendChild(button);
};

const 创建马克笔样式 = () => {
    const markerElement = document.createElement('style');
    let styles = '';
    
    for (let i = 1; i <= state.totalStyles; i++) {
        const path = 生成随机路径();
        const svg = `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path}" stroke="${encodeURIComponent(获取颜色值(`--b3-font-background${i}`))}" fill="none" stroke-width="${markerWidth}" stroke-linecap="round" /></svg>`;
        
        styles += `
        .protyle-wysiwyg [data-node-id] [spellcheck] span[style*='background${i}'] {
            background-color: transparent !important;
            background-image: url('${svg}');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center bottom;
            padding-bottom: 0.2em;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
        }
        
       `;
    }
    
    markerElement.textContent = styles;
    return markerElement;
};

const 创建宽度调节器 = () => {
    const widthInput = document.createElement('input');
    widthInput.type = 'range';
    widthInput.min = '1';
    widthInput.max = '20';
    widthInput.value = markerWidth; // 使用初始化的 markerWidth
    widthInput.style.position = 'fixed';
    widthInput.style.bottom = '60px';
    widthInput.style.right = '20px';
    widthInput.style.zIndex = '1000';

    widthInput.addEventListener('input', (event) => {
        markerWidth = event.target.value; // 更新马克笔宽度
        切换装饰器(当前装饰器); // 重新应用当前装饰器以更新样式
    });

    document.body.appendChild(widthInput);
};

// 在页面加载时创建浮动按钮和宽度调节器
创建浮动按钮();
创建宽度调节器();