import { artTemplate } from '../../base/useDeps/useArtTemplate/fromArt.js'
const 以artTemplate渲染模板=(templateStr, data  ) => {
    const renderFunc = artTemplate.compile(templateStr);
    return renderFunc(data);
}
export { 
    artTemplate,
    以artTemplate渲染模板
}
