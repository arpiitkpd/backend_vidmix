import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware';
import { addVideoToPlaylist, createPlayList, deletePlayList, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from '../controllers/playlist.controller';


const router = Router();

router.use(verifyJWT)

router.route("/").post(createPlayList)

router.route("/:playlistId")
.get(getPlaylistById)
.patch(updatePlaylist)
.delete(deletePlayList)

router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist)
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist)

router.route("/user/:userId").get(getUserPlaylists)

export default router