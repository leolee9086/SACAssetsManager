import { Query } from "../../../../static/mingo.js";
 const parseQuery = (req, res, next) => {
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
        const tester = new Query(scheme.query)   
        req.queryTester = tester     
    }
    next&&next()
}
export const parseQueryCtx = (ctx, next) => {
    const {req,res,stats}=ctx
    parseQuery(req, res, next)
    stats&&(stats.queryTester=req.queryTester)
    next&&next()
}