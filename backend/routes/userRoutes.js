import  express from 'express';
import { followAndUnfollow, forgetPassword, getAllUsers, getUserFollowersAndFollowing, loginUser, logOutUser, myProfile, registerWithOtp, resetPassword, userProfile, verifyOtpAndRegister } from '../controllers/userControllers.js';
import { isAuth } from '../middlewares/isAuth.js';
import passport from 'passport';
import generateToken from '../utils/generateToken.js';

const router=express.Router();

router.post("/register",registerWithOtp);
router.post("/verifyOtp/:token",verifyOtpAndRegister);
router.post("/login",loginUser);
router.post("/forget",forgetPassword);
router.post("/reset-password/:token",resetPassword);
router.get("/logout",isAuth,logOutUser);
router.get("/me",isAuth,myProfile);
router.get("/all",isAuth,getAllUsers);
router.get("/:id",isAuth,userProfile);
router.post("/follow/:id",isAuth,followAndUnfollow);
router.get("/get/:id",isAuth,getUserFollowersAndFollowing);



router.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      generateToken(req.user, res);
      res.redirect(process.env.CLIENT_URL);
    }
  );
  

  



export default router;