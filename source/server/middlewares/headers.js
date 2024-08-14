export const types = {
    textPlain:(req,res,next)=>{
        res.setHeader('Content-Type', 'text/plain');
        next();
    },
    json:(req,res,next)=>{
        res.setHeader('Content-Type', 'application/json');
        next();
    }
}