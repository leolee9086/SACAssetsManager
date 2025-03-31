import('../../../../../../src/toolBox/base/useElectron/forCSharp/useCSharpLoader.js').then(({ loadCsharpFunc }) => {
    const { generateThumbnail } = loadCsharpFunc('systermThumbnailWin64.dll')
    console.log(generateThumbnail)
})