import { User } from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import TryCatch from "../utils/TryCatch.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import validator from 'validator';


dotenv.config();



const TEMP_USERS = {}; 

export const registerWithOtp = TryCatch(async (req, res) => {
  const { name, email, password } = req.body;

   
   if (Array.isArray(email) || !validator.isEmail(email)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: "An account with this email already exists",
    });
  }

  const otp = crypto.randomInt(100000, 999999); // Generate OTP
  console.log(otp);
  TEMP_USERS[email] = {
    name,
    password,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // OTP valid for 5 minutes
  };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: process.env.MY_GMAIL,
      pass: process.env.MY_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.MY_GMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}`,
    });

    const token = jwt.sign({ email }, process.env.JWT_SEC, { expiresIn: "5m" });

    res.status(200).json({
      message: "OTP sent successfully. Please verify to complete registration.",
      token,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).send("Failed to send OTP");
  }
});

export const verifyOtpAndRegister = TryCatch(async (req, res) => {
  const { otp } = req.body;
  const { token}=req.params;

  if (!otp || !token) {
    return res.status(400).json({ message: "OTP and token are required" });
  }

  try {
    const { email } = jwt.verify(token, process.env.JWT_SEC);

    const tempUser = TEMP_USERS[email];
    if (!tempUser) {
      return res.status(400).json({ message: "No OTP request found for this email" });
    }

    if (tempUser.expiresAt < Date.now()) {
      delete TEMP_USERS[email];
      return res.status(400).json({ message: "OTP expired" });
    }

    if (parseInt(tempUser.otp) !== parseInt(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

   
    const hashPassword = await bcrypt.hash(tempUser.password, 10);
    const user = await User.create({
      name: tempUser.name,
      email,
      password: hashPassword,
    });

    delete TEMP_USERS[email]; //

    generateToken(user, res);

    res.status(201).json({
      user,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
});




export const loginUser=TryCatch(async(req,res)=>{
    const{email,password }=req.body;
    const user=await User.findOne({email});
    if(!user){
        return res.status(400).json({
            message:"Email or Password Incorrect.",
        });
    }
    const comaparePassword=await bcrypt.compare(password,user.password);


    if(!comaparePassword){
        return res.status(400).json({
            message:"Email or Password Incorrect.",
        });

    }
    generateToken(user,res);


    res.json({
        user,
        message:"Logged In",

    })

});
 
export const forgetPassword=TryCatch(async(req,res)=>{
  const {email} =req.body;

   
if (Array.isArray(email) || !validator.isEmail(email)) {
  return res.status(400).json({
    message: "Invalid email format",
  });
}
  const user= await User.findOne({email})
  if(!user)
      return res.status(400).json({
          message:"No user found",
  })

  const otp = crypto.randomInt(100000, 999999);
  TEMP_USERS[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, 
  };
  
  const transporter = nodemailer.createTransport({
      service:"gmail",
      secure:true,
      auth:{
          user:process.env.MY_GMAIL,
          pass:process.env.MY_PASS,
      }
  })
  console.log(otp);
  
  try {
    
    await transporter.sendMail({
      from: process.env.MY_GMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}`,
    });

   
    const token = jwt.sign({ email }, process.env.JWT_SEC, { expiresIn: "5m" });

    res.status(200).json({
      message: "OTP sent successfully.",
      token,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      message: "Failed to send OTP",
      error: error.message,
    });
  }
})

export const resetPassword = TryCatch(async (req, res) => {
const { token } = req.params;
const { otp, password } = req.body;

if (!password) {
  return res.status(400).json({ message: "Password is required" });
}

if (!otp || !token) {
  return res.status(400).json({ message: "OTP and token are required" });
}

let email;
try {
  ({ email } = jwt.verify(token, process.env.JWT_SEC));
} catch (error) {
  return res.status(400).json({ message: "Invalid or expired token" });
}

const tempUser = TEMP_USERS[email];
if (!tempUser) {
  console.log("TEMP_USERS:", TEMP_USERS);
  return res.status(400).json({ message: "No OTP request found for this email" });
}

console.log("Stored OTP:", tempUser.otp);
console.log("Provided OTP:", otp);

if (tempUser.expiresAt < Date.now()) {
  console.log("OTP expired. ExpiresAt:", tempUser.expiresAt, "Current time:", Date.now());
  delete TEMP_USERS[email];
  return res.status(400).json({ message: "OTP expired" });
}

if (tempUser.otp.toString() !== otp.toString()) {
  console.log("Invalid OTP. Stored:", tempUser.otp, "Provided:", otp);
  return res.status(400).json({ message: "Invalid OTP" });
}

const user = await User.findOne({ email });
if (!user) {
  return res.status(404).json({ message: "User not found" });
}

user.password = await bcrypt.hash(password, 10);
await user.save();

delete TEMP_USERS[email];
res.json({ message: "Password reset successful" });
});


export const myProfile=TryCatch(async(req,res)=>{
    const user=await User.findById(req.user._id)
    res.json(user);
})

export const userProfile= TryCatch(async(req,res)=>{
    const user= await User.findById(req.params.id).select("-password");
    res.json(user);

})


export const followAndUnfollow=TryCatch(async(req,res)=>{
    const user= await User.findById(req.params.id);
    const loggedInUser=await User.findById(req.user._id);
    if(!user)
        return res.status(400).json({
            message:"No user with this id",
    });

    if(user._id.toString()===loggedInUser._id)
        return res.status(400).json({
            message:"you can't follow yourself",
    });

    if(user.followers.includes(loggedInUser._id)){
        const indexFollowing=loggedInUser.following.indexOf(user._id);
        const indexFollower =user.followers.indexOf(loggedInUser._id);
        loggedInUser.following.splice(indexFollowing,1);
        user.followers.splice(indexFollower,1);

        await loggedInUser.save();
        await user.save();

        res.json({
            message:"user unfollowed",
        })
    }else{
        loggedInUser.following.push(user._id);
        user.followers.push(loggedInUser._id);

        await loggedInUser.save();
        await user.save();

        res.json({
            message:"user followed",
        })

    }
})

export const logOutUser=TryCatch(async(req,res)=>{
    res.cookie("token","",{
        maxAge:0,
        httpOnly:true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.json({
        message:"Logged out successfully",
    });
});




export const getUserFollowersAndFollowing = TryCatch(async (req, res) => {
  const userId = req.params.id;
  console.log(userId);


  const user = await User.findById(userId)
    .populate("followers", "name email")
    .populate("following", "name email");

  
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    followers: user.followers,
    following: user.following,
  });


});


export const getAllUsers=TryCatch(async(req,res)=>{
    const users=await User.find().select("-password");
    res.json(users);
});