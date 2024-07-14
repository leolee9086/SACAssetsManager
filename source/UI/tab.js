import { initVueApp } from './utils/componentsLoader.js';
import {智能防抖} from '../utils/functionTools.js'

const size = { value: 100 }
export function 创建图库界面(tab) {
  console.log(tab)
  const app = initVueApp(import.meta.resolve('./components/assetsGrids.vue'), 'assetsGrids', {}, '', {
    tab
  })

  app.mount(tab.element)
  return
  fetchAssets(tab).then(
    assets => {
      tab.element.innerHTML=''
      const iframes = createIframes(assets)
      
      const container = createContainer(iframes)
      tab.element.insertAdjacentHTML('beforeend', container)
      setupScrollListener(tab.element, assets)
    }
  )
}

function fetchAssets(tab) {
  let query = "select * from assets  limit 102400"
  /* if(tab.data&&tab.data.block_id){
   query = `select * from assets where docpath like '%${tab.data.block_id}%' limit 102400` 
   }*/
  return fetch('/api/query/sql', {
    method: "POST",
    body: JSON.stringify({
      stmt: query// 获取前300个
    })
  })
    .then(data => data.json())
    .then(json => json.data);
}

function createIframes(assets) {
  return assets.map((asset,i) => {
    const htmlContent = `
    <style>*{margin:0;padding:0;height:100%;}</style>
    <div style='position:relative;width:100%;height:100%;'>
      <div style='position:absolute;top:0;left:0;background:rgba(0,0,0,0.5);color:white;padding:2px;font-size:10px;height:1em'>
        ${i}${asset.path.split('.').pop()}
      </div>
      <img src='http://127.0.0.1/thumbnail/?path=${asset.path}' 
           style='width:100%;height:100%;object-fit:cover;'/>
    </div>
  `;
    const encodedHtmlContent = encodeURIComponent(htmlContent);

    return `<iframe id="frame-${asset.path}" data-asset='${asset.path}' style="width: ${100}px; height: ${size.value}px; border: none;" src="data:text/html;charset=utf-8,${encodedHtmlContent}"></iframe>`;
  }).join('');
}

function createContainer(iframes) {
  return `<div class="container" style="width: 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); grid-gap: 10px;">${iframes}</div>`;
}

function setupIntersectionObserver(element) {
  let observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        let iframe = entry.target;
        observer.unobserve(iframe); // 加载后取消观察
      }
    });
  }, {
    rootMargin: '0px',
    threshold: 0.1 // 触发条件为10%可见时
  });

  element.querySelectorAll('iframe').forEach(iframe => {
    observer.observe(iframe);
  });
}

function setupScrollListener(element, assets) {
  let loadedCount = 150; // 已加载的数量
  let removedAssets = []; // 存储移除的资产
  element.addEventListener('scroll', 智能防抖(async() => {
    const { scrollTop, scrollHeight, clientHeight } = element;
    const container = element.querySelector(".container");
    const rows = Math.floor(container.clientHeight / 110); // 计算行数，假设每个iframe高度为100px，间隔为10px
    const columns = Math.floor(container.clientWidth / 110); // 计算列数

    if (scrollTop + clientHeight >= scrollHeight - 200 && loadedCount < assets.length) { // 检查是否滚动到底部
      const newIframes = createIframes(assets.slice(loadedCount, loadedCount + columns)); // 每次加载一行
      loadedCount += columns;
      container.insertAdjacentHTML('beforeend', newIframes);
      setupIntersectionObserver(element); // 重新观察新位置的iframe

      // 移除一行
      if (container.children.length > rows * columns) {
        const removed = Array.from(container.children).slice(0, columns);
        removed.forEach(child => {
          removedAssets.push(child);
          container.removeChild(child);
        });
      }
    } else if (scrollTop <= 200 && removedAssets.length > 0) { // 检查是否滚动到顶部
      const reinserted = removedAssets.splice(-columns, columns);
      reinserted.reverse().forEach(child => {
        container.insertAdjacentElement('afterbegin', child);
      });
      loadedCount -= columns;
    }
  }));
}