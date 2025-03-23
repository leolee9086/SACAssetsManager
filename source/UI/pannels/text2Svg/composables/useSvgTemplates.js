import { ref } from '../../../../../static/vue.esm-browser.js';

export function useSvgTemplates() {
  // SVG模板库
  const svgTemplates = ref([
    {
      name: '简单图形',
      template: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="50" width="100" height="100" fill="{{color}}" stroke="{{strokeColor}}" stroke-width="{{strokeWidth}}" />
        <text x="100" y="30" text-anchor="middle" font-size="{{fontSize}}">{{text}}</text>
      </svg>`,
      customizableFields: {
        color: { type: 'color', label: '填充颜色', default: '#ff5722' },
        strokeColor: { type: 'color', label: '描边颜色', default: '#000000' },
        strokeWidth: { type: 'number', label: '描边宽度', default: 2, min: 0, max: 10 },
        text: { type: 'text', label: '文本内容', default: '标题文本' },
        fontSize: { type: 'number', label: '字体大小', default: 16, min: 8, max: 36 }
      }
    },
    {
      name: '图标模板',
      template: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="{{backgroundColor}}" />
        <path d="M70,80 L130,80 L130,120 L70,120 Z" fill="{{iconColor}}" transform="rotate({{rotation}}, 100, 100)" />
        <text x="100" y="170" text-anchor="middle" font-size="{{fontSize}}" fill="{{textColor}}">{{text}}</text>
      </svg>`,
      customizableFields: {
        backgroundColor: { type: 'color', label: '背景颜色', default: '#4caf50' },
        iconColor: { type: 'color', label: '图标颜色', default: '#ffffff' },
        rotation: { type: 'number', label: '旋转角度', default: 0, min: 0, max: 360 },
        text: { type: 'text', label: '标签文本', default: '图标名称' },
        textColor: { type: 'color', label: '文本颜色', default: '#333333' },
        fontSize: { type: 'number', label: '字体大小', default: 16, min: 8, max: 36 }
      }
    },
    {
      name: '波浪背景',
      template: `<svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="{{gradientStart}}" />
            <stop offset="100%" stop-color="{{gradientEnd}}" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="300" height="200" fill="url(#grad)" />
        <path d="M0,100 Q75,{{wave1Height}} 150,100 T300,100 V200 H0 Z" fill="{{waveColor}}" opacity="{{waveOpacity}}" />
        <path d="M0,130 Q75,{{wave2Height}} 150,130 T300,130 V200 H0 Z" fill="{{wave2Color}}" opacity="{{wave2Opacity}}" />
        <text x="150" y="80" text-anchor="middle" font-size="{{fontSize}}" fill="{{textColor}}">{{text}}</text>
      </svg>`,
      customizableFields: {
        gradientStart: { type: 'color', label: '渐变起始色', default: '#2196f3' },
        gradientEnd: { type: 'color', label: '渐变结束色', default: '#03a9f4' },
        waveColor: { type: 'color', label: '波浪1颜色', default: '#ffffff' },
        waveOpacity: { type: 'number', label: '波浪1透明度', default: 0.3, min: 0, max: 1, step: 0.1 },
        wave1Height: { type: 'number', label: '波浪1高度', default: 50, min: 0, max: 200 },
        wave2Color: { type: 'color', label: '波浪2颜色', default: '#ffffff' },
        wave2Opacity: { type: 'number', label: '波浪2透明度', default: 0.5, min: 0, max: 1, step: 0.1 },
        wave2Height: { type: 'number', label: '波浪2高度', default: 100, min: 0, max: 200 },
        text: { type: 'text', label: '文本内容', default: '波浪背景' },
        textColor: { type: 'color', label: '文本颜色', default: '#ffffff' },
        fontSize: { type: 'number', label: '字体大小', default: 24, min: 8, max: 48 }
      }
    }
  ]);

  // 替换模板中的变量
  const replacePlaceholders = (template, values) => {
    let svgCode = template.template;
    
    Object.entries(template.customizableFields).forEach(([key, field]) => {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      svgCode = svgCode.replace(pattern, values?.[key] || field.default);
    });
    
    return svgCode;
  };

  // 生成预览SVG
  const generatePreview = (template) => {
    if (!template) return '';
    
    const defaultValues = {};
    Object.entries(template.customizableFields).forEach(([key, field]) => {
      defaultValues[key] = field.default;
    });
    
    return replacePlaceholders(template, defaultValues);
  };

  // 生成最终SVG
  const generateFinal = (template, customValues) => {
    if (!template) return '';
    return replacePlaceholders(template, customValues);
  };

  return {
    svgTemplates,
    generatePreview,
    generateFinal
  };
} 