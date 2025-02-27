
export const loadGeneratorFromFile =async (generatorName)=>{
    const url = import.meta.resolve(`./${generatorName}.js`)
    const module = await import(url)
    return module.generateUtils
}
const P3M1=await loadGeneratorFromFile('textureUtils') 
export {P3M1 as defaultGenerator}