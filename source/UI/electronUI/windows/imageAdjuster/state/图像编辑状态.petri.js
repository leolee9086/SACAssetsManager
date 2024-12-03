const {env,dp,λ,f,p} = require("petriNet")
env({
    编辑器模式:"空闲",
    系统:{
        忙碌:false,
        图像编辑中:false,
    },
    贴图:{
        当前画笔贴图:null
    }
})

const 编辑器模式 = {
    target:{
        mode:env.编辑模式,
        buffer:env.贴图.当前画笔贴图
    }
}

const 点击触发器 =(触发器ID)=>{
    return {
        type: 'input',
        initial: 1,
        capacity: 1,
        //它仅仅就是个空库所,什么状态都没有声明
        tokenBox:{
            click:[]
        },
        click:(e,net)=>{
            this.tokenBox.click.push(e)
            net.checkPlace(this)
        },
        id:触发器ID
    }
}

dp(编辑器模式).画笔状态={
    capacity: infinity,
    mode: merge,
    state:{
        mode: "马克笔",
        buffer:{
            set:(tokens,target)=>{
                target.value=tokens[0]
                this.count({buffer:1})
            },
            get:(target,tokens)=>{
                return target.value
            }
        }
    },
    alias:"选中马克笔",
}
const 加载贴图 = async(clickEvent)=>{
    const url = clickEvent.target.dataSet.URL
    const res = await fetch(url) 
    return {buffer:await res.buffer()}
}
const 加载画笔贴图 =dλ(
    加载贴图,
    {click:1},
    {buffer:1},
    'longest'
)
dp(点击触发器).马克笔按钮.init({click:[]})
f(
    p.马克笔按钮,
    λ(加载画笔贴图),
    p.选中马克笔
)
