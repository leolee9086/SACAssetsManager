export const buildExportContent=(getComponentStyles,handleBehavior,htmlContent)=>{  
return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导出页面</title>
    <!-- 添加 petite-vue 依赖 -->
    <script src="https://unpkg.com/petite-vue" defer init></script>
    <style>
        /* 基础样式 */
        body { 
            margin: 0; 
            padding: 0; 
        }
        #app {
            width: 100%;
            min-height: 100vh;
            padding: 24px;
            box-sizing: border-box;
            max-width: 1200px;
            margin: 0 auto;
        }
        .component-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        /* 添加组件基础样式 */
        ${getComponentStyles()}
    </style>
</head>
<body>
    <!-- 添加基础行为定义 -->
    <script>
        window.behaviors = ${JSON.stringify(getComponentStyles)};
        
        // 添加行为处理函数
        window.handleBehavior = ${handleBehavior.toString()};
    </script>
    ${htmlContent}
</body>
</html>`;
}