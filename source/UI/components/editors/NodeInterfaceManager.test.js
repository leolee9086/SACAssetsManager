// 测试用例配置文件
async function verifyFileContent(inputPath, outputPath) {
  try {
    // 检查文件是否存在
    const inputExists = await fs.promises.access(inputPath)
      .then(() => true)
      .catch(() => false);
    
    const outputExists = await fs.promises.access(outputPath)
      .then(() => true)
      .catch(() => false);

    if (!inputExists || !outputExists) {
      return false;
    }

    // 读取并比较文件内容
    const inputContent = await fs.promises.readFile(inputPath, 'utf-8');
    const outputContent = await fs.promises.readFile(outputPath, 'utf-8');

    // 验证输出文件内容是否为有效的转换结果
    const inputData = JSON.parse(inputContent);
    const outputData = JSON.parse(outputContent);

    // 这里可以添加具体的内容验证逻辑
    return typeof inputData === 'object' && typeof outputData === 'object';
  } catch (error) {
    console.error('文件验证错误:', error);
    return false;
  }
}
async function createTestFiles() {
  const testData = {
    name: "测试数据",
    value: Math.random() * 100,
    timestamp: new Date().toISOString(),
    items: ["项目1", "项目2", "项目3"]
  };

  const inputPath = 'D:/test-input.json';
  
  try {
    // 写入测试输入文件
    await fs.promises.writeFile(
      inputPath, 
      JSON.stringify(testData, null, 2),
      'utf-8'
    );
    return true;
  } catch (error) {
    console.error('创建测试文件失败:', error);
    return false;
  }
}
export const testCases = {
    // 基础测试组
    basic: {
      // 基本节点和接口操作
      interfaceCreation: {
        name: "接口创建测试",
        setup: (manager) => {
          const Card1 = manager.createCard('Card1', '数字生成器');
          manager.addInterface('Card1', 'output1', {
            type: 'output',
            dataType: 'number',
            position: 0
          });
          return { Card1 };
        },
        verify: ({ Card1 }) => {
          const $interface = Card1.getInterface('output1');
          return $interface.type === 'output' && $interface.dataType === 'number';
        }
      },
  
      // 连接和数据传输
      dataTransfer: {
        name: "数据传输测试",
        setup: async (manager) => {
          const Card1 = manager.createCard('Card1', '源节点');
          const Card2 = manager.createCard('Card2', '目标节点');
          
          manager.addInterface('Card1', 'output1', {
            type: 'output',
            dataType: 'number',
            position: 0
          });
          
          manager.addInterface('Card2', 'input1', {
            type: 'input',
            dataType: 'number',
            position: 0
          });
          
          await manager.connect('Card1', 'output1', 'Card2', 'input1');
          Card1.setValue('output1', 42);
          await manager.propagateValue('Card1', 'output1');
          
          return { Card1, Card2 };
        },
        verify: ({ Card2 }) => Card2.getValue('input1') === 42
      }
    },
  
    // 复杂功能测试组
    complex: {
      // 数学计算流程
      mathCalculation: {
        name: "数学计算测试",
        setup: async (manager) => {
          const Cards = {
            input: manager.createCard('input', '数字输入'),
            multiply: manager.createCard('multiply', '乘法器'),
            add: manager.createCard('add', '加法器'),
            result: manager.createCard('result', '结果输出')
          };
          
          const interfaces = {
            input: {
              output: { type: 'output', dataType: 'number', position: 0 }
            },
            multiply: {
              input1: { type: 'input', dataType: 'number', position: 0 },
              input2: { type: 'input', dataType: 'number', position: 1, value: 2 },
              output: { type: 'output', dataType: 'number', position: 2 }
            },
            add: {
              input1: { type: 'input', dataType: 'number', position: 0 },
              input2: { type: 'input', dataType: 'number', position: 1, value: 10 },
              output: { type: 'output', dataType: 'number', position: 2 }
            },
            result: {
              input: { type: 'input', dataType: 'number', position: 0 }
            }
          };
  
          // 添加接口
          for (const [CardId, CardInterfaces] of Object.entries(interfaces)) {
            for (const [id, def] of Object.entries(CardInterfaces)) {
              manager.addInterface(CardId, id, def);
            }
          }
  
          // 添加处理逻辑
          Cards.multiply.onProcess = () => {
            const input1 = Cards.multiply.getValue('input1');
            const input2 = Cards.multiply.getValue('input2');
            if (input1 !== null && input2 !== null) {
              const result = input1 * input2;
              Cards.multiply.setValue('output', result);
            }
          };

          Cards.add.onProcess = () => {
            const input1 = Cards.add.getValue('input1');
            const input2 = Cards.add.getValue('input2');
            if (input1 !== null && input2 !== null) {
              const result = input1 + input2;
              Cards.add.setValue('output', result);
            }
          };

          // 设置初始值
          Cards.multiply.setValue('input2', 2); // 乘数固定为2
          Cards.add.setValue('input2', 10);     // 加数固定为10

          // 建立连接
          await manager.connect('input', 'output', 'multiply', 'input1');
          await manager.connect('multiply', 'output', 'add', 'input1');
          await manager.connect('add', 'output', 'result', 'input');

          // 设置输入值并触发传播
          Cards.input.setValue('output', 5);
          await manager.propagateValue('input', 'output');

          return Cards;
        },
        verify: ({ result }) => result.getValue('input') === 20,
        debug: (Cards) => ({
          input: Cards.input.getValue('output'),
          multiply: Cards.multiply.getValue('output'),
          add: Cards.add.getValue('output'),
          result: Cards.result.getValue('input')
        })
      }
    },
  
    // IO 操作测试组
    io: {
      // 文件读写测试
      fileOperation: {
        name: "文件读写测试",
        setup: async (manager) => {
          // 首先创建测试文件

          await createTestFiles();
          
          const Cards = {
            fileReader: manager.createCard('fileReader', '文件读取器'),
            parser: manager.createCard('parser', 'JSON解析器'),
            transformer: manager.createCard('transformer', '数据转换器'),
            fileWriter: manager.createCard('fileWriter', '文件写入器')
          };

          // 修改接口定义，确保类型正确
          const interfaces = {
            fileReader: {
              path: { type: 'input', dataType: 'string', position: 0 },
              content: { type: 'output', dataType: 'string', position: 1 } // 文件内容是字符串
            },
            parser: {
              input: { type: 'input', dataType: 'string', position: 0 }, // 接收字符串
              output: { type: 'output', dataType: 'object', position: 1 } // 输出解析后的对象
            },
            transformer: {
              input: { type: 'input', dataType: 'object', position: 0 }, // 接收对象
              output: { type: 'output', dataType: 'string', position: 1 } // 输出字符串化的JSON
            },
            fileWriter: {
              path: { type: 'input', dataType: 'string', position: 0 },
              content: { type: 'input', dataType: 'string', position: 1 } // 接收�����串
            }
          };

          // 添加接口
          for (const [CardId, CardInterfaces] of Object.entries(interfaces)) {
            for (const [id, def] of Object.entries(CardInterfaces)) {
              manager.addInterface(CardId, id, def);
            }
          }

          // 建立连接
          await manager.connect('fileReader', 'content', 'parser', 'input');
          await manager.connect('parser', 'output', 'transformer', 'input');
          await manager.connect('transformer', 'output', 'fileWriter', 'content');

          // 设置文件路径
          Cards.fileReader.setValue('path', 'D:/test-input.json');
          Cards.fileWriter.setValue('path', 'D:/test-output.json');

          // 添加处理逻辑
          Cards.fileReader.onProcess = async () => {
            try {
              const content = await fs.promises.readFile(Cards.fileReader.getValue('path'), 'utf-8');
              Cards.fileReader.setValue('content', content); // 设置为字符串
            } catch (error) {
              console.error('读取文件失败:', error);
            }
          };

          Cards.parser.onProcess = () => {
            const input = Cards.parser.getValue('input');
            try {
              const parsed = JSON.parse(input); // 字符串转对象
              Cards.parser.setValue('output', parsed);
            } catch (error) {
              console.error('解析JSON失败:', error);
            }
          };

          Cards.transformer.onProcess = () => {
            const input = Cards.transformer.getValue('input');
            const transformed = JSON.stringify(input, null, 2); // 对象转字符串
            Cards.transformer.setValue('output', transformed);
          };

          Cards.fileWriter.onProcess = async () => {
            try {
              await fs.promises.writeFile(
                Cards.fileWriter.getValue('path'),
                Cards.fileWriter.getValue('content'),
                'utf-8'
              );
            } catch (error) {
              console.error('写入文件失败:', error);
            }
          };

          // 发处理流程
          await Cards.fileReader.onProcess();
          await manager.propagateValue('fileReader', 'content');

          return Cards;
        },
        verify: async ({ fileReader, fileWriter }) => {
          const inputPath = fileReader.getValue('path');
          const outputPath = fileWriter.getValue('path');
          // 验证文件是否被正确处理
          return await verifyFileContent(inputPath, outputPath);
        },
        debug: (Cards) => ({
          readerPath: Cards.fileReader.getValue('path'),
          writerPath: Cards.fileWriter.getValue('path'),
          parserOutput: Cards.parser.getValue('output'),
          transformerOutput: Cards.transformer.getValue('output')
        })
      },

      // 网络请求测试
      networkOperation: {
        name: "网络请求测试",
        setup: async (manager) => {
          // 首先添加自定义类型验证器
          console.log(manager)
          const customTypes = {
            'http-method': value => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(value),
            'http-status': value => typeof value === 'number' && value >= 0 && value < 600,
            'http-headers': value => value === null || (typeof value === 'object' && !Array.isArray(value)),
            'http-response': value => value === null || typeof value === 'object',
            'error-type': value => typeof value === 'string' && ['NOT_FOUND', 'UNAUTHORIZED', 'UNKNOWN'].includes(value)
          };

          const Cards = {
            requestMaker: manager.createCard('requestMaker', 'HTTP请求器'),
            statusHandler: manager.createCard('statusHandler', '状态处理器'),
            successHandler: manager.createCard('successHandler', '成功处理器'),
            errorHandler: manager.createCard('errorHandler', '错误处理器'),
            retryHandler: manager.createCard('retryHandler', '重试处理器'),
            cache: manager.createCard('cache', '缓存节点')
          };

          // 为每个卡片添加自定义类型验证器
          for (const [_, card] of Object.entries(Cards)) {
            for (const [typeName, validator] of Object.entries(customTypes)) {
              card.addTypeValidator(typeName, validator);
            }
          }

          // 配置接口
          const interfaces = {
            requestMaker: {
              url: { type: 'input', dataType: 'string', position: 0 },
              method: { type: 'input', dataType: 'http-method', position: 1 },
              headers: { type: 'input', dataType: 'http-headers', position: 2 },
              body: { type: 'input', dataType: 'object', position: 3 },
              status: { type: 'output', dataType: 'http-status', position: 4 },
              response: { type: 'output', dataType: 'http-response', position: 5 }
            },
            statusHandler: {
              status: { type: 'input', dataType: 'http-status', position: 0 },
              response: { type: 'input', dataType: 'http-response', position: 1 },
              success: { type: 'output', dataType: 'object', position: 2 },
              error: { type: 'output', dataType: 'object', position: 3 },
              retry: { type: 'output', dataType: 'object', position: 4 }
            },
            successHandler: {
              input: { type: 'input', dataType: 'object', position: 0 },
              output: { type: 'output', dataType: 'object', position: 1 }
            },
            errorHandler: {
              input: { type: 'input', dataType: 'object', position: 0 },
              errorType: { type: 'output', dataType: 'error-type', position: 1 },
              message: { type: 'output', dataType: 'string', position: 2 }
            },
            retryHandler: {
              input: { type: 'input', dataType: 'object', position: 0 },
              retryCount: { type: 'input', dataType: 'number', position: 1 },
              maxRetries: { type: 'input', dataType: 'number', position: 2 },
              shouldRetry: { type: 'output', dataType: 'boolean', position: 3 }
            },
            cache: {
              key: { type: 'input', dataType: 'string', position: 0 },
              value: { type: 'input', dataType: 'object', position: 1 },
              ttl: { type: 'input', dataType: 'number', position: 2 }
            }
          };

          // 添加接口
          for (const [cardId, cardInterfaces] of Object.entries(interfaces)) {
            console.log(cardId, cardInterfaces)

            for (const [id, def] of Object.entries(cardInterfaces)) {
              console.log(id, def)
              manager.addInterface(cardId, id, def);
            }
          }

          // 修改连接设置部分
          // 建立所有必要的连接
          await manager.connect('requestMaker', 'status', 'statusHandler', 'status');
          await manager.connect('requestMaker', 'response', 'statusHandler', 'response');
          
          // 成功路径
          await manager.connect('statusHandler', 'success', 'successHandler', 'input');
          await manager.connect('successHandler', 'output', 'cache', 'value');
          
          // 错误路径
          await manager.connect('statusHandler', 'error', 'errorHandler', 'input');
          
          // 重试路径 - 添加完整的重试循环连接
          await manager.connect('statusHandler', 'retry', 'retryHandler', 'input');
          await manager.connect('retryHandler', 'shouldRetry', 'requestMaker', 'retry');  // 添加重试触发连接

          // 设置重试处理器的初始值
          Cards.retryHandler.setValue('maxRetries', 3);
          Cards.retryHandler.setValue('retryCount', 0);

          // 修改 retryHandler 的处理逻辑
          Cards.retryHandler.onProcess = function() {
            const retryCount = this.getValue('retryCount') || 0;
            const maxRetries = this.getValue('maxRetries') || 3;
            const shouldRetry = retryCount < maxRetries;
            
            if (shouldRetry) {
              this.setValue('retryCount', retryCount + 1);
            }
            
            this.setValue('shouldRetry', shouldRetry);
          };

          // 修改 requestMaker 以处理重试
          const originalOnProcess = Cards.requestMaker.onProcess;
          Cards.requestMaker.onProcess = async function() {
            if (this.getValue('retry')) {
              // 重置重试标志
              this.setValue('retry', false);
              // 执行原始处理逻辑
              await originalOnProcess.call(this);
            } else {
              await originalOnProcess.call(this);
            }
          };

          // 设置测试场景
          const testScenarios = [
            {
              name: '成功请求',
              url: 'https://jsonplaceholder.typicode.com/users/1',
              expectedStatus: 200
            },
            {
              name: '资源未找到',
              url: 'https://jsonplaceholder.typicode.com/users/999',
              expectedStatus: 404
            },
            {
              name: '服务器错误',
              url: 'https://httpstat.us/500',
              expectedStatus: 500
            }
          ];

          // 运行测试场景
          const results = [];
          for (const scenario of testScenarios) {
            Cards.requestMaker.setValue('url', scenario.url);
            Cards.requestMaker.setValue('method', 'GET');
            Cards.requestMaker.setValue('headers', { 'Accept': 'application/json' });
            
            await Cards.requestMaker.onProcess();
            await manager.propagateValue('requestMaker', 'status');
            await manager.propagateValue('requestMaker', 'response');
            
            // 等待处理完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            results.push({
              scenario: scenario.name,
              status: Cards.requestMaker.getValue('status'),
              success: Cards.successHandler.getValue('output'),
              error: Cards.errorHandler.getValue('message'),
              shouldRetry: Cards.retryHandler.getValue('shouldRetry')
            });
          }

          return { Cards, results };
        },
        verify: async ({ Cards, results }) => {
          // 修改验证逻辑以考虑重试情况
          return results.every(result => {
            console.log(`场景: ${result.scenario}`, result);
            return (
              (result.status >= 200 && result.status < 300 && result.success) ||
              (result.status >= 400 && result.status < 500 && result.error) ||
              (result.status >= 500 && result.shouldRetry) ||
              (result.status === 0 && result.shouldRetry)  // 添加网络错误的情况
            );
          });
        },
        debug: ({ Cards, results }) => ({
          testResults: results
        })
      },

      // 并发操作测试
      concurrentOperations: {
        name: "并发操作测试",
        setup: async (manager) => {
          const Cards = {
            scheduler: manager.createCard('scheduler', '任务调度器'),
            worker1: manager.createCard('worker1', '工作节点1'),
            worker2: manager.createCard('worker2', '工作节点2'),
            merger: manager.createCard('merger', '结果合并器')
          };

          // 配置接口
          const interfaces = {
            scheduler: {
              tasks: { type: 'input', dataType: 'array', position: 0 },
              worker1Tasks: { type: 'output', dataType: 'array', position: 1 },
              worker2Tasks: { type: 'output', dataType: 'array', position: 2 }
            },
            worker1: {
              input: { type: 'input', dataType: 'array', position: 0 },
              output: { type: 'output', dataType: 'array', position: 1 }
            },
            worker2: {
              input: { type: 'input', dataType: 'array', position: 0 },
              output: { type: 'output', dataType: 'array', position: 1 }
            },
            merger: {
              input1: { type: 'input', dataType: 'array', position: 0 },
              input2: { type: 'input', dataType: 'array', position: 1 },
              output: { type: 'output', dataType: 'array', position: 2 }
            }
          };

          // 添加接口
          for (const [CardId, CardInterfaces] of Object.entries(interfaces)) {
            for (const [id, def] of Object.entries(CardInterfaces)) {
              manager.addInterface(CardId, id, def);
            }
          }

          // 建立连接
          await manager.connect('scheduler', 'worker1Tasks', 'worker1', 'input');
          await manager.connect('scheduler', 'worker2Tasks', 'worker2', 'input');
          await manager.connect('worker1', 'output', 'merger', 'input1');
          await manager.connect('worker2', 'output', 'merger', 'input2');

          // 设置任务数据
          const tasks = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            type: i % 2 === 0 ? 'even' : 'odd',
            value: i * 10
          }));

          Cards.scheduler.setValue('tasks', tasks);

          return Cards;
        },
        verify: async ({ scheduler, merger }) => {
          const inputTasks = scheduler.getValue('tasks');
          const outputResults = merger.getValue('output');
          
          // 验证所有任务都被处理
          return inputTasks && 
                 outputResults && 
                 inputTasks.length === outputResults.length;
        },
        debug: (Cards) => ({
          inputTasks: Cards.scheduler.getValue('tasks'),
          worker1Results: Cards.worker1.getValue('output'),
          worker2Results: Cards.worker2.getValue('output'),
          mergedResults: Cards.merger.getValue('output')
        })
      }
    }
  };