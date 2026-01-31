import jwt from 'jsonwebtoken';

const generateToken=(user,res)=>{
    const token=jwt.sign({id:user._id,email:user.email},process.env.JWT_SEC,{
        expiresIn : "15d",
    });

    res.cookie("token",token,{
        path: "/",
        maxAge : 15*24*60*60*1000,
        httpOnly:true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
};

export default generateToken;