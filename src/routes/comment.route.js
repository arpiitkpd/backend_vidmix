import { Router } from "express";
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { createComment, deleteComment, updateComment } from "../controllers/comment.controller.js";


const router = new Router();

router.use(verifyJWT)

router.route("/:videoId").post(createComment)
router.route("/:commentId").patch(updateComment).delete(deleteComment)