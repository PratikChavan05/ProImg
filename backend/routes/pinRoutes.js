import express from 'express';
import { isAuth } from '../middlewares/isAuth.js';
import uploadFile from '../middlewares/multer.js';
import { commentOnPin, countViews, createPin, deleteComment, deletePin, getAllPins, getLikes, getSinglePin, getViews, likeAndUnlike, myLikes, updatePin } from '../controllers/pinControllers.js';


const router=express.Router();

router.post("/new",isAuth,uploadFile,createPin);
router.get("/all",isAuth,getAllPins);
router.get("/:id",isAuth,getSinglePin);
router.put("/:id",isAuth,updatePin);
router.delete("/:id",isAuth,deletePin);
router.post("/comment/:id",isAuth,commentOnPin);
router.delete("/comment/:id",isAuth,deleteComment);
router.post("/like/:id",isAuth,likeAndUnlike);
router.get("/likes/:id",isAuth,getLikes);
router.get("/liked/:id",isAuth,myLikes);
router.post("/view",isAuth,countViews);
router.get("/getView/:id",isAuth,getViews);

export default router;