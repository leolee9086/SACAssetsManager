//使用fetch实现POST请求下的SSE
export function postSSE(uri, data) {
  const eventSource = new EventSource(uri)
  eventSource.onmessage = function (event) {
    console.log(event.data)
  }
}



/**
 * 这里存储的json对象不是标准的json形式,而是json字符串,每一行一个json对象
 * @param {*} uri 
 * @param {*} target 
 * @param {*} callback 
 * @param {*} step 
 * @param {*} signal 
 * @param {*} options 
 */
export async function applyURIStreamJson(uri, target, callback, step, signal, options = {}) {
  let _step = 0;
  fetch(uri, { signal, ...options })
    .then(response => {
      if (response.ok) {
        // 获取响应的可读流
        const reader = response.body.getReader();
        return new ReadableStream({
          start(controller) {
            function push() {
              reader.read().then(({ value, done }) => {
                if (done) {
                  controller.close();
                  return;
                }
                // 将每个文件信息推送到流中
                controller.enqueue(new TextDecoder('utf-8').decode(value));
                push(); // 继续读取下一部分
              });
            }
            push();
          }
        });
      } else {
        throw new Error('Network response was not ok.');
      }
    })
    .then(stream => {
      // 使用流式处理读取数据
      const reader = stream.getReader();
      read()
      let splitedChunk
      let total = 0
      function read() {
        reader.read().then(({ value, done }) => {
          if (done) {
            callback && callback()
            console.log('Stream complete');
            return;
          }
          value.split('\n').forEach(chunk => {
            //去掉data:
            try {
              if (splitedChunk) {
                chunk = splitedChunk + chunk
                splitedChunk = ''; // 清除已处理的部分

              }

              if (chunk.startsWith('data:')) {
                let _chunk = chunk.substring(5)
                try {
                  let json = JSON.parse(_chunk)
                  if (json.walkCount || json.walkCount === 0) {
                    if (json.walkCount !== total) {
                      total = json.walkCount
                      callback && callback(total)

                    }
                  } else {
                    target.push(JSON.parse(_chunk))
                    _step += 1

                  }
                  if (_step >= step) {
                    callback && callback()
                    _step = 0
                  }
                  splitedChunk = ''

                } catch (e) {
                  chunk && (splitedChunk += chunk)
                }
              } else {
                chunk && (splitedChunk += chunk)
              }
            } catch (e) {
              chunk && (splitedChunk += chunk)
            }


          });
          // 处理文件信息
          // 继续读取
          read();
        })
      }
    }).catch(error => { console.warn(error) })
}

