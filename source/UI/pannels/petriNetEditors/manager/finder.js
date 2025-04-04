export const 查找卡片 = (卡片组,属性名,属性值)=>{
    return 卡片组.find(卡片=>卡片[属性名]===属性值)
}