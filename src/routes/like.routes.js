import { Router } from "express";
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { toogleCommentLike, toogleTweetLike, toogleVideoLike } from "../controllers/like.controller.js";

const router = Router()

router.route("/toogle/v/:videoId").post(verifyJWT, toogleVideoLike)

router.route("/toogle/c/:commentId").post(verifyJWT, toogleCommentLike)

router.route("/toogle/t/:tweetId").post(verifyJWT, toogleTweetLike)

export default router