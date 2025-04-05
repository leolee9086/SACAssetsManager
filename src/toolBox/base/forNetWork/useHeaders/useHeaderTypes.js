export const headerTypes = {
    textPlain:(req,res,next)=>{
        res.setHeader('Content-Type', 'text/plain;charset=utf-8');
        next();
    },
    json:(req,res,next)=>{
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        next();
    }
}