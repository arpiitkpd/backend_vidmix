import { Router } from "express";
import {upload} from '../middlewares/multer.middleware.js'
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { deleteVideo, getAllVideos, getVideoById, publishAVideo, tooglePublishStatus, updatevideo } from "../controllers/video.controller.js";

const router = Router()

router.route("/publish-video").post(verifyJWT,upload.fields([
    {
        name: "thumbnail",
        maxCount:1
    },
    {
        name: "videoFile",
        maxCount:1
    }
]), 
 publishAVideo
)

router.route("/update-video/:videoId").post(verifyJWT, upload.single("thumbnail"),updatevideo )
router.route("/delete-video/:videoId").patch(verifyJWT, deleteVideo)
router.route("/videosId/:videoId").get(getVideoById )
router.route("/getVideos").get(verifyJWT, getAllVideos)
router.route("/publishStatus/:videoId").patch(verifyJWT, tooglePublishStatus)

export default router