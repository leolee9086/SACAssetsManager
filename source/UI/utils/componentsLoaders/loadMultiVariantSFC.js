/**
 * 解析多变体SFC文件
 * @param {string} content - SFC文件内容
 * @returns {Object} 解析后的变体配置
 */
function parseMultiVariantSFC(content) {
    const variants = {};
    const wrappedContent = `<div>${content}</div>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(wrappedContent, 'text/html');
    const sharedSetup = parseSetupScript(doc);
    const sharedStyles = parseSharedStyles(doc);
    parseVariantTemplates(doc, variants);
    parseVariantStyles(doc, variants);
    parseVariantScripts(doc, variants);
    return { variants, sharedSetup, sharedStyles };
}

/**
 * 构建变体组件内容
 * @param {Object} variant - 变体配置
 * @param {string} sharedSetup - 共享的setup代码
 * @param {string} sharedStyles - 共享的样式代码
 * @param {string} variantName - 变体名称
 * @param {Document} doc - DOM文档对象
 */
function buildVariantContent(variant, sharedSetup, sharedStyles, variantName, doc) {
    const { template, style, script } = variant;
    
    // 获取原始style标签的属性
    const styleAttrs = doc.querySelector(`style[variant="${variantName}"]`)?.attributes || [];
    const sharedStyleAttrs = doc.querySelector('style:not([variant])')?.attributes || [];
    
    // 获取所有script标签的属性
    const setupScriptAttrs = doc.querySelector('script[setup]')?.attributes || [];
    const variantScriptAttrs = doc.querySelector(`script[variant="${variantName}"]`)?.attributes || [];
    
    // 构建属性字符串的辅助函数
    const buildAttrsString = (attrs) => {
        return Array.from(attrs)
            .filter(attr => !['variant', 'setup'].includes(attr.name)) // 排除variant和setup属性
            .map(attr => `${attr.name}${attr.value ? `="${attr.value}"` : ''}`)
            .join(' ');
    };

    // 构建标签
    const sharedStyleTag = sharedStyles ? 
        `<style ${buildAttrsString(sharedStyleAttrs)}>${sharedStyles}</style>` : '';
    const styleTag = style ? 
        `<style ${buildAttrsString(styleAttrs)}>${style}</style>` : '';
    
    // 构建script标签
    // 共享的setup script
    const setupScriptTag = `<script ${buildAttrsString(setupScriptAttrs)} setup>
        ${sharedSetup}
    </script>`;
    
    // 变体特定的script（如果存在）
    const variantScriptTag = script ? 
        `<script ${buildAttrsString(variantScriptAttrs)}>
            ${script}
        </script>` : '';
    
    return `
        <template>${template}</template>
        ${setupScriptTag}
        ${variantScriptTag}
        ${sharedStyleTag}
        ${styleTag}
    `.trim();
}

/**
 * 从URL加载组件内容
 * @param {string} url - 组件文件的URL
 * @param {string} [variantName] - 可选的变体名称
 * @returns {Promise<string>} 处理后的组件内容
 * @throws {Error} 当加载失败或变体不存在时抛出错误
 */
async function loadComponentFromURL(url, variantName = null) {
    try {
        // 获取组件内容
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`加载组件失败: ${response.statusText}`);
        }
        const content = await response.text();

        // 如果没有指定变体名称，直接返回原始内容
        if (!variantName) {
            return content;
        }

        // 解析多变体组件
        const parser = new DOMParser();
        const wrappedContent = `<div>${content}</div>`;
        const doc = parser.parseFromString(wrappedContent, 'text/html');
        
        // 检查是否包含变体标记
        const hasVariants = doc.querySelector('[variant]');
        if (!hasVariants) {
            // 如果请求了变体但组件不是多变体组件，抛出错误
            throw new Error('请求的组件不是多变体组件');
        }

        // 解析并构建变体内容
        const { variants, sharedSetup, sharedStyles } = parseMultiVariantSFC(content);
        
        // 检查请求的变体是否存在
        if (!variants[variantName]) {
            throw new Error(`变体 "${variantName}" 不存在`);
        }

        // 构建并返回指定变体的内容
        return buildVariantContent(
            variants[variantName],
            sharedSetup,
            sharedStyles,
            variantName,
            doc
        );
    } catch (error) {
        throw new Error(`加载组件失败: ${error.message}`);
    }
}

