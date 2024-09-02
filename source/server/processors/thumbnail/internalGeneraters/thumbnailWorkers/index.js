import('../../../../utils/CSharpLoader.js').then(({ loadCsharpFunc }) => {
    const { generateThumbnail } = loadCsharpFunc('systermThumbnailWin64.dll')
    console.log(generateThumbnail)
})