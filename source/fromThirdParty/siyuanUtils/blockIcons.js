const TYPE_ICON_MAP = {
  NodeDocument: 'iconFile',
  NodeThematicBreak: 'iconLine',
  NodeParagraph: 'iconParagraph',
  NodeBlockquote: 'iconQuote',
  NodeListItem: 'iconListItem',
  NodeCodeBlock: 'iconCode',
  NodeYamlFrontMatter: 'iconCode',
  NodeTable: 'iconTable',
  NodeBlockQueryEmbed: 'iconSQL',
  NodeSuperBlock: 'iconSuper',
  NodeMathBlock: 'iconMath',
  NodeHTMLBlock: 'iconHTML5',
  NodeWidget: 'iconBoth',
  NodeIFrame: 'iconLanguage',
  NodeVideo: 'iconVideo',
  NodeAudio: 'iconRecord',
  NodeAttributeView: 'iconDatabase'
};

const LIST_ICON_MAP = {
  t: 'iconCheck',
  o: 'iconOrderedList',
  default: 'iconList'
};

const getIconByType = (type, sub) => {
  // 处理特殊情况
  if (type === 'NodeHeading') {
    return sub ? `icon${sub.toUpperCase()}` : 'iconHeadings';
  }
  
  if (type === 'NodeList') {
    return LIST_ICON_MAP[sub] || LIST_ICON_MAP.default;
  }

  // 处理常规情况
  return TYPE_ICON_MAP[type] || '';
};
  