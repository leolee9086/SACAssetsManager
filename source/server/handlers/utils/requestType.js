import {Query} from '../../../../static/mingo.js'
export function parseQuery(ctx){
    const {req,stats}=ctx
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
        stats&&(stats.queryTester=tester);
        return tester
    }
    return null
}