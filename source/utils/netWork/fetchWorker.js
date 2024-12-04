// 定义支持的响应类型
const RESPONSE_TYPES = {
  TEXT: 'text',
  JSON: 'json',
  BLOB: 'blob',
  ARRAY_BUFFER: 'arrayBuffer',
  FORM_DATA: 'formData'
};

const workerCode = `
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
      if (responseType && RESPONSE_TYPES[responseType.toUpperCase()]) {
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

const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

const poolSize = 4;
const workers = Array.from({ length: poolSize }, () => new Worker(workerUrl));
let requestId = 0;
const pendingRequests = new Map();
const availableWorkers = [...workers];

workers.forEach(worker => {
  worker.onmessage = function(e) {
    const { id, error, ...response } = e.data;
    const { resolve, reject, controller } = pendingRequests.get(id);
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

export function fetchWorker(url, options = {}) {
  const controller = new AbortController();
  
  const promise = new Promise((resolve, reject) => {
    const id = requestId++;
    const responseType = options.responseType;
    
    // 存储请求信息
    pendingRequests.set(id, { resolve, reject, controller });

    function assignWorker() {
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
        setTimeout(assignWorker, 100);
      }
    }

    assignWorker();
  });

  // 添加 abort 方法
  promise.abort = () => {
    controller.abort();
  };

  return promise;
}

// 清理函数
export function terminateWorkers() {
  workers.forEach(worker => worker.terminate());
  URL.revokeObjectURL(workerUrl);
}
