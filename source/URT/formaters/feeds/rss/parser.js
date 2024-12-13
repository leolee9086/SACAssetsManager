/**
 * @typedef {Object} RSSItem
 * @property {string} title - 标题
 * @property {string} link - 链接URL
 * @property {string} [description] - 描述
 * @property {string} [pubDate] - 发布日期
 * @property {string} [author] - 作者
 * @property {string} [guid] - 全局唯一标识符
 * @property {string[]} [categories] - 分类标签数组
 */

/**
 * @typedef {Object} RSSChannel
 * @property {string} title - 频道标题
 * @property {string} link - 频道链接
 * @property {string} [description] - 频道描述
 * @property {string} [language] - 语言
 * @property {string} [copyright] - 版权信息
 * @property {string} [lastBuildDate] - 最后构建日期
 * @property {string} [generator] - 生成器信息
 * @property {RSSItem[]} items - RSS条目数组
 */

/**
 * 解析RSS条目
 * @param {Element} item RSS条目元素
 * @returns {RSSItem} RSS条目对象
 */
function parseRSSItem(item) {
  const getElementText = (element, tagName) => 
    element.querySelector(tagName)?.textContent?.trim() || '';

  const categories = Array.from(item.querySelectorAll('category'))
    .map(cat => cat.textContent?.trim() || '');

  return {
    title: getElementText(item, 'title'),
    link: getElementText(item, 'link'),
    description: getElementText(item, 'description'),
    pubDate: getElementText(item, 'pubDate'),
    author: getElementText(item, 'author') || getElementText(item, 'dc:creator'),
    guid: getElementText(item, 'guid'),
    categories: categories.length > 0 ? categories : undefined
  };
}

/**
 * 解析RSS频道
 * @param {Element} channel RSS频道元素
 * @returns {RSSChannel} RSS频道对象
 */
function parseRSSChannel(channel) {
  const getElementText = (element, tagName) => 
    element.querySelector(tagName)?.textContent?.trim() || '';

  const items = Array.from(channel.querySelectorAll('item'))
    .map(item => parseRSSItem(item));

  return {
    title: getElementText(channel, 'title'),
    link: getElementText(channel, 'link'),
    description: getElementText(channel, 'description'),
    language: getElementText(channel, 'language'),
    copyright: getElementText(channel, 'copyright'),
    lastBuildDate: getElementText(channel, 'lastBuildDate'),
    generator: getElementText(channel, 'generator'),
    items
  };
}

/**
 * 将RSS XML解析为JSON结构
 * @param {string} xml RSS XML字符串
 * @returns {RSSChannel} RSS频道对象
 * @throws {Error} 解析错误时抛出异常
 */
function parseRSSToJSON(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // 检查解析错误
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('RSS解析错误: ' + parseError.textContent);
  }

  const channel = doc.querySelector('channel');
  if (!channel) {
    throw new Error('无效的RSS格式：缺少channel元素');
  }

  return parseRSSChannel(channel);
}

/**
 * 将JSON转换为RSS XML
 * @param {RSSChannel} channel RSS频道对象
 * @returns {string} RSS XML字符串
 */
function buildRSSFromJSON(channel) {
  const createTextElement = (name, content) => 
    content ? `    <${name}>${escapeXml(content)}</${name}>` : '';

  const itemToXml = (item) => {
    const elements = [
      createTextElement('title', item.title),
      createTextElement('link', item.link),
      createTextElement('description', item.description),
      createTextElement('pubDate', item.pubDate),
      createTextElement('author', item.author),
      createTextElement('guid', item.guid),
      ...(item.categories || []).map(cat => createTextElement('category', cat))
    ].filter(Boolean);

    return `  <item>
${elements.join('\n')}
  </item>`;
  };

  const channelElements = [
    createTextElement('title', channel.title),
    createTextElement('link', channel.link),
    createTextElement('description', channel.description),
    createTextElement('language', channel.language),
    createTextElement('copyright', channel.copyright),
    createTextElement('lastBuildDate', channel.lastBuildDate),
    createTextElement('generator', channel.generator),
    ...(channel.items || []).map(item => itemToXml(item))
  ].filter(Boolean);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
${channelElements.join('\n')}
</channel>
</rss>`;
}

/**
 * 转义XML特殊字符
 * @param {string} str 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export {
  parseRSSToJSON,
  buildRSSFromJSON
};
