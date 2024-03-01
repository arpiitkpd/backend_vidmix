import { Router } from "express";
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { toogleVideoLike } from "../controllers/like.controller.js";

const router = Router()

router.route("/video/:videoId").post(verifyJWT, toogleVideoLike)