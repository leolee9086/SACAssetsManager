/**
 * fetchWorker工具
 * 提供基于Web Worker的并行fetch请求功能，支持多个worker并发执行
 */

// 定义支持的响应类型
const 响应类型 = {
  文本: 'text',
  JSON: 'json',
  二进制对象: 'blob',
  数组缓冲区: 'arrayBuffer',
  表单数据: 'formData'
};

/**
 * 创建Worker代码
 */
const 创建Worker代码 = () => `
  self.onmessage = async function(e) {
    const { url, options, id, responseType, signal } = e.data;
    
    try {
      // 创建 AbortController 用于请求中断
      const controller = new AbortController();
      
      // 合并原始 signal 和新的 controller.signal
      if (signal) {
        options.signal = controller.signal;
      }
      
      // 监听中断消息
      const abortHandler = () => {
        controller.abort();
        self.postMessage({ 
          id,
          error: 'AbortError: The user aborted a request.'
        });
      };
      self.addEventListener('abort', abortHandler);

      const response = await fetch(url, options);
      
      // 获取完整的响应头
      const headers = {};
      for (const [key, value] of response.headers) {
        headers[key] = value;
      }
      
      // 根据指定的类型处理响应数据
      let data;
      if (responseType) {
        data = await response[responseType]();
      } else {
        // 默认尝试 JSON，失败则返回文本
        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }
      }

      self.postMessage({ 
        id,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        data,
        type: response.type,
        url: response.url,
        redirected: response.redirected,
      }, data instanceof ArrayBuffer ? [data] : undefined);
      
    } catch (error) {
      self.postMessage({ 
        id,
        error: error.message 
      });
    } finally {
      self.removeEventListener('abort', abortHandler);
    }
  };
`;

/**
 * 创建Worker池
 * @param {number} 池大小 - Worker池的大小
 * @returns {Object} Worker池对象
 */
export const 创建Worker池 = (池大小 = 4) => {
  // 创建Worker脚本
  const workerBlob = new Blob([创建Worker代码()], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(workerBlob);

  // 初始化Worker池
  const workers = Array.from({ length: 池大小 }, () => new Worker(workerUrl));
  const availableWorkers = [...workers];
  const pendingRequests = new Map();
  let requestId = 0;

  // 为每个Worker设置消息处理器
  workers.forEach(worker => {
    worker.onmessage = function(e) {
      const { id, error, ...response } = e.data;
      const { resolve, reject } = pendingRequests.get(id) || {};
      
      if (!pendingRequests.has(id)) {
        return;
      }
      
      pendingRequests.delete(id);
      availableWorkers.push(worker);

      if (error) {
        reject(new Error(error));
      } else {
        // 创建类似 fetch Response 的对象
        const responseObj = {
          ...response,
          headers: new Headers(response.headers),
          // 实现标准 Response 接口的方法
          json: () => Promise.resolve(response.data),
          text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data)),
          blob: () => Promise.resolve(new Blob([response.data])),
          arrayBuffer: () => Promise.resolve(response.data instanceof ArrayBuffer ? response.data : new TextEncoder().encode(JSON.stringify(response.data)).buffer),
          formData: () => {
            throw new Error('FormData responses are not supported yet');
          },
          clone: () => {
            // 克隆响应对象
            const clonedData = response.data instanceof ArrayBuffer ? response.data.slice(0) : response.data;
            return {
              ...responseObj,
              data: clonedData
            };
          }
        };
        resolve(responseObj);
      }
    };
  });

  /**
   * 分配Worker执行请求
   * @param {Object} 请求参数 - 请求参数
   * @returns {Promise} 请求Promise
   */
  const 分配Worker = ({ id, url, options, responseType }) => {
    return new Promise((resolve, reject) => {
      if (availableWorkers.length > 0) {
        const worker = availableWorkers.pop();
        worker.postMessage({ 
          url, 
          options: {
            ...options,
            signal: options.signal ? true : undefined // 只传递是否需要 signal
          }, 
          id,
          responseType
        });
      } else {
        // 没有可用的Worker，等待一段时间后重试
        setTimeout(() => {
          分配Worker({ id, url, options, responseType }).then(resolve).catch(reject);
        }, 100);
      }
    });
  };

  /**
   * 发起基于Worker的请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求Promise
   */
  const 发起请求 = (url, options = {}) => {
    const controller = new AbortController();
    const id = requestId++;
    const responseType = options.responseType;
    
    // 创建请求Promise
    const promise = new Promise((resolve, reject) => {
      // 存储请求信息
      pendingRequests.set(id, { resolve, reject, controller });
      
      // 分配Worker执行请求
      分配Worker({ id, url, options, responseType })
        .catch(error => {
          pendingRequests.delete(id);
          reject(error);
        });
    });

    // 添加 abort 方法
    promise.abort = () => {
      controller.abort();
      return promise;
    };

    return promise;
  };

  /**
   * 终止所有Worker
   */
  const 终止所有Worker = () => {
    workers.forEach(worker => worker.terminate());
    URL.revokeObjectURL(workerUrl);
    // 清空请求队列
    pendingRequests.forEach(({ reject }) => {
      reject(new Error('Workers terminated'));
    });
    pendingRequests.clear();
  };

  return {
    发起请求,
    终止所有Worker
  };
};

// 创建默认Worker池
const 默认Worker池 = typeof Worker !== 'undefined' ? 创建Worker池() : null;

/**
 * 使用Worker进行fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} 请求Promise
 */
export const 使用Worker发起请求 = (url, options = {}) => {
  if (!默认Worker池) {
    throw new Error('当前环境不支持Web Worker');
  }
  return 默认Worker池.发起请求(url, options);
};

/**
 * 终止所有Worker
 */
export const 终止所有Worker = () => {
  if (默认Worker池) {
    默认Worker池.终止所有Worker();
  }
};

// 导出常量
export { 响应类型 };

// 英文名称API (为了国际化)
export const RESPONSE_TYPES = 响应类型;
export const createWorkerCode = 创建Worker代码;
export const createWorkerPool = 创建Worker池;
export const fetchWorker = 使用Worker发起请求;
export const terminateWorkers = 终止所有Worker; 