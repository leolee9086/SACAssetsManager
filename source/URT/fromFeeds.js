import { createResource } from './builder.js';
import { parseRSSToJSON } from './feeds/rss/parser.js';

/**
 * 将RSS源转换为URT资源
 * @param {string} xml RSS XML内容
 * @param {Object} options 配置选项
 * @returns {URTResource} URT资源对象
 */
function fromRSS(xml, options = {}) {
  // 解析RSS内容
  const rssChannel = parseRSSToJSON(xml);
  
  // 转换RSS条目为子资源
  const children = rssChannel.items.map(item => createResource({
    type: 'feed',
    driver: 'rss',
    name: item.title,
    url: item.link,
    meta: {
      created: new Date(item.pubDate || Date.now()).getTime().toString(),
      isVirtual: true
    },
    extra: {
      feed: {
        description: item.description,
        author: item.author,
        categories: item.categories,
        guid: item.guid
      }
    }
  }));

  // 创建RSS源资源
  return createResource({
    type: 'feed',
    driver: 'rss',
    name: rssChannel.title,
    url: rssChannel.link,
    meta: {
      isDirectory: true,
      isVirtual: true,
      created: new Date(rssChannel.lastBuildDate || Date.now()).getTime().toString()
    },
    extra: {
      feed: {
        description: rssChannel.description,
        language: rssChannel.language,
        copyright: rssChannel.copyright,
        generator: rssChannel.generator
      },
      icon: options.icon || 'rss'
    },
    children
  });
}

export {
  fromRSS
};
