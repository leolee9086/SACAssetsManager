/**
 * RSS导出选项
 * @typedef {Object} RSSExportOptions
 * @property {string} [feedTitle] - Feed标题
 * @property {string} [feedDescription] - Feed描述
 * @property {string} [feedUrl] - Feed URL
 * @property {string} [siteUrl] - 网站URL
 * @property {string} [language='zh-CN'] - 语言代码
 * @property {string} [ttl='60'] - 更新间隔
 * @property {string} [copyright] - 版权信息
 * @property {string} [category] - 分类
 */
/**
 * 将URT资源转换为RSS 2.0格式
 * @param {URTResource} resource - URT资源对象
 * @param {RSSExportOptions} [options={}] - 转换选项
 * @returns {string} RSS XML字符串
 * @throws {Error} 当资源类型不支持或必要属性缺失时抛出错误
 */
export const toRss = (resource, options = {}) => {
  // 优先使用资源中的 feed 配置
  const feedConfig = resource.extra?.feed || {};
  
  const {
    feedTitle = resource.name,
    feedDescription = feedConfig.description || '',
    feedUrl = feedConfig.url || '',
    siteUrl = feedConfig.siteUrl || '',
    language = feedConfig.language || 'zh-CN',
    ttl = feedConfig.ttl || '60',
    copyright = feedConfig.copyright || '',
    category = feedConfig.category || ''
  } = options;

  // 收集所有可转换的条目
  const items = [];
  
  // 递归处理资源
  const processResource = (res) => {
    if (res.type === 'bookmark') {
      items.push(res);
    }
    if (res.children?.length > 0) {
      res.children.forEach(processResource);
    }
  };
  
  processResource(resource);

  // 生成RSS XML
  const rssItems = items.map(item => {
    const pubDate = item.meta.created 
      ? new Date(parseInt(item.meta.created)).toUTCString()
      : new Date().toUTCString();
      
    return `
    <item>
      <title><![CDATA[${item.name}]]></title>
      <link>${item.url}</link>
      <guid>${item.url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${item.extra?.description || ''}]]></description>
      ${item.extra?.tags?.map(tag => `<category>${tag}</category>`).join('\n      ') || ''}
      ${item.extra?.reading?.progress ? `<urt:progress>${item.extra.reading.progress}</urt:progress>` : ''}
      ${item.provenance?.source ? `<urt:source>${item.provenance.source}</urt:source>` : ''}
    </item>`.trim();
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:urt="http://urt.dev/ns/1.0/">
  <channel>
    <title><![CDATA[${feedTitle}]]></title>
    <description><![CDATA[${feedDescription}]]></description>
    <link>${siteUrl}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <language>${language}</language>
    <ttl>${ttl}</ttl>
    ${copyright ? `<copyright>${copyright}</copyright>` : ''}
    ${category ? `<category>${category}</category>` : ''}
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>URT RSS Exporter</generator>
    ${rssItems}
  </channel>
</rss>`;

  return xml;
};