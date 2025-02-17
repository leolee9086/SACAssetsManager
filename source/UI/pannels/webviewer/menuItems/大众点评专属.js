import { showStreamingChatDialog } from "../../../dialogs/streamingChatDialog.js";
export const 提取店铺信息菜单项 ={
    label: '提取店铺信息',
    click: async (ctx) => {
        const webviewRef = ctx.webview
      try {
        const pageContent = await webviewRef.executeJavaScript(`
          document.body.innerText
        `);

        let csvContent = '';
        const messages = [
          {
            role: 'system',
            content: `请从以下大众点评店铺页面内容中提取关键信息，并以单行CSV格式输出。需要提取的信息包括：店铺名称,电话,人均消费,地址,营业时间,店铺特色。

输出格式示例：
店铺名称,电话,人均消费,地址,营业时间,店铺特色
聚丰园饺子馆,010-12345678,45元,北京市海淀区中关村大街1号,周一至周日 10:00-22:00,饺子品种多/包间宽敞/环境整洁

请严格按照上述格式输出，所有信息在同一行，使用逗号分隔各个字段。第一行为表头，第二行为数据。如果某字段信息未找到，请填写"未提供"。请注意：如果字段值中包含逗号，请用双引号将该字段值包裹。请不要输出其他任何内容。`
          },
          {
            role: 'user',
            content: pageContent
          }
        ];

        const emitter = await showStreamingChatDialog(messages, window.siyuan?.config?.ai?.openAI || {
          endpoint: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-3.5-turbo'
        });

        // 监听数据
        emitter.on('data', (text) => {
          csvContent += text;
        });

        // 监听结束事件
        emitter.on('end', () => {
          // 移除可能的 think 标签
          csvContent = csvContent.replace(/<think>.*?<\/think>/g, '').trim();

          // 解析CSV内容获取店铺名称
          const lines = csvContent.split('\n');
          if (lines.length >= 2) {
            const dataLine = lines[1];
            const shopName = dataLine.split(',')[0].replace(/"/g, '').trim();
            // 创建下载链接
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${shopName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        });
        // 开始流式处理
        emitter.emit('start');
      } catch (error) {
        console.error('店铺信息提取失败:', error);
      }
    }
  }

export const 查找五家推荐店铺菜单项 = {
    label: '查找五家推荐店铺',
    click: async (ctx) => {
        const webviewRef = ctx.webview
        try {
            const pageContent = await webviewRef.executeJavaScript(`
                document.body.innerText
            `);

            let csvContent = '';
            const messages = [
                {
                    role: 'system',
                    content: `请从以下大众点评页面内容中推荐五家最具实力的店铺，按推荐顺序输出CSV格式。需要包含字段：排名,店铺名称,推荐理由,人均消费,地址。
                    
输出格式示例：
排名,店铺名称,推荐理由,人均消费,地址
1,聚丰园饺子馆,"饺子品种多,食材新鲜",45元,北京市海淀区中关村大街1号
2,川渝人家,地道川菜/服务热情,80元,朝阳区建国路88号
...
                    
要求：
1. 推荐理由用斜杠分隔多个优点
2. 如果字段值包含逗号，请用双引号包裹
3. 第一行为表头，后续五行为推荐店铺
4. 人均消费统一用"元"结尾`
                },
                {
                    role: 'user',
                    content: pageContent
                }
            ];

            const emitter = await showStreamingChatDialog(messages, window.siyuan?.config?.ai?.openAI || {
                endpoint: 'https://api.openai.com/v1',
                apiKey: '',
                model: 'gpt-3.5-turbo'
            });

            emitter.on('data', (text) => {
                csvContent += text;
            });

            emitter.on('end', () => {
                csvContent = csvContent.replace(/<think>.*?<\/think>/g, '').trim();
                // 创建固定文件名的下载链接
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `五家推荐店铺.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            });
            
            emitter.emit('start');
        } catch (error) {
            console.error('推荐店铺查询失败:', error);
        }
    }
}