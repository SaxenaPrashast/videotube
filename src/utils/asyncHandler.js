// const asyncHandler = ()=>{

// }

const asyncHandler =(fn)=> async (req,res,next)=>{
    try {
        return await fn(req,res,next)
    } catch (error) {
        res.status(error.code || 500).json({
            sucess: false,
            message: error.message
        })
    }
}

export default asyncHandler;