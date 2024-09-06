import { Query } from "../../../../static/mingo.js";
export const parseQueryFromReq = (req, res, next) => {
    req.queryTester = parseQuery(req)
    next&&next()
}
export const parseQueryCtx = (ctx, next) => {
    const {req,res,stats}=ctx
    parseQueryFromReq(req, res, next)
    stats&&(stats.queryTester=req.queryTester)
    next&&next()
}
export const parseQuery =(req)=>{
    let queryTester = null
    let scheme 
    if(req.query&&req.query.setting){
        try{
            scheme = JSON.parse(req.query.setting)
        }catch(e){
            console.error(e)
            throw(e)
        }
    }else if(req.body){
        scheme = req.body
    }
    if(JSON.stringify(scheme) !== '{}'){
        const tester = new Query(scheme.query||{})   
        queryTester = tester     
    }
    return queryTester
}
