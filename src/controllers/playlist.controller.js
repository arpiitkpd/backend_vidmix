import mongoose, {isValidObjectId} from "mongoose"
import {PlayList,} from "../models/playlist.model.js"
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"

const createPlayList = asyncHandler(async(req, res)=>{
    const {name, description} = req.body

    if(!name){
        throw new ApiError(400, "Name is required to create playlist")
    }
    let playlistDescription = description || "";

    const playlist = await PlayList.create({
        name,
        description: playlistDescription,
        owner: req.user?._id,
        videos:[]
    })

    if(!playlist){
        throw new ApiError(500, "Something went wrong while creating playlist")
    }
    return res
    .status(201)
    .json(new ApiResponse(200,playlist,"Playlist Created Successfully"))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId =  req.user?._id

    if(!playlistId && !videoId){
        throw new ApiError(404, "No video or playlist found")
    }

    if(userId != playlistId.owner){
        throw new ApiError(400, "User is not alowed ")
    }

    const video = await Video.findById({_id:videoId})

    if(!video){
        throw new ApiError(404, "video not found")
    }
    const playlist = await PlayList.findById({_id:playlistId})

    if(!playlist){
        throw new ApiError(404, "playlist not found")
    }

    if(playlist.videos.includes(videoId)){
        return res
            .status(200)
            .json(new ApiResponse(200,{},"Video Is  already present In Playlist"))
    }

    const addedPlaylist = await PlayList.updateOne({
        _id : new mongoose.Types.ObjectId(playlistId)
    },
    {
        $push:{videos: videoId}
    })
    if(!addedPlaylist){
        throw new ApiError(500,"Unable to add the video to the playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,addedPlaylist,"Video Successfully Added To Playlist"))
    

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId =  req.user?._id

    if(!playlistId && !videoId){
        throw new ApiError(404, "No video or playlist found")
    }

    if(userId != playlistId.owner){
        throw new ApiError(400, "User is not alowed ")
    }

    const video = await Video.findById({_id:videoId})

    if(!video){
        throw new ApiError(404, "video not found")
    }
    const playlist = await PlayList.findById({_id:playlistId})
   
    if(!playlist.videos.includes(videoId)){
        throw new ApiError(404,"No Video Found in Playlist");
    }

    const removedPlaylist = await PlayList.updateOne({
        id : new mongoose.Types.ObjectId(playlistId)
    },{
        $pull:{videos:videoId}
    })
    if(!removedPlaylist){
        throw new ApiError(500,"Unable to remove the video from the playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,removedPlaylist,"Video Successfully Removed From Playlist"))


})

const deletePlayList= asyncHandler(async(req, res)=>{
    const{playlistId} = req.params
    if(!playlistId){
        throw new ApiError(400, "playlist id is required")
    }

    const playlistOwner = await PlayList.findById(playlistId)

    if(playlistOwner !== req.user?._id){
        throw new ApiError(400, "user has not access")
    }
    const deletedPlaylist = await PlayList.findByIdAndDelete(playlistId);
    if(!deletedPlaylist){
        throw new ApiError(500,"Unable to delete the Playlist")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Playlist Deleted Successfully"))

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!playlistId){
        throw new ApiError(400,"playlistId is required!!!")
    }
     const userOwner = await isUserOwnerofPlaylist(playlistId,req?.user?._id)
     if(!userOwner){
         throw new ApiError(300,"Unauthorized Access")
     }
     if(!name || !description){
         throw new ApiError(404,"Name and Description Both are required!!!!")
     }
     const updatedPlaylist = await PlayList.findByIdAndUpdate(playlistId,{
         $set:{
             name:name,
             description:description
         }
     })
     
     if(!updatedPlaylist){
         throw new ApiError(500,"Unable to update the Playlist")
     }
     return res
     .status(200)
     .json(new ApiResponse(200,updatedPlaylist,"Playlist Updated Successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
        const {userId} = req.params
        
        if(!userId){
            throw new ApiError(400,"userId is required !!!");
        }

        const user = await User.findById(userId);
        if(!user){
            throw new ApiError(404,"User not found ")
        }

        const playList = await playList.aggregate([
            {
                $match:{
                    owner: user?._id
                }
            },{
                $project:{
                    _id:1,
                    name:1,
                    description:1,
                    owner:1,
                    createdAt:1,
                    updatedAt:1,
                    videos:{
                        $cond:{
                            if:{$eq:["$owner",new mongoose.Types.ObjectId(req?.user?._id)]},
                            then: "$videos",
                            else:{
                                $filter:{
                                    input: "$videos",
                                    as:"video",
                                    cond:{
                                        $eq:["$video.isPublished",true ]
                                    }
                                }
                            }
                        }
                    }

                }
            }
        ])

        if(!playList ){
            throw new ApiError(404,"There is no Playlist made by this user")
        }
    
        return res
        .status(200)
        .json(new ApiResponse(200,playList,"Playlist Fetched Successfully"))
  

}) 

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!playlistId){
        throw new ApiError(400, "playlist Id is not found")
    }

    const playList = await PlayList.aggregate([
       { $match:{
            _id:new mongoose.Types.ObjectId(playlistId)

         }},
         {
            $project:{
                name:1,
                description:1,
                owner:1,
                videos:{
                    $cond:{
                        if:{
                            $eq:["$owner",new mongoose.Types.ObjectId(req?.user?._id)]
                        },
                        then: "$videos",
                        else:{
                            $filter:{
                                input: "$videos",
                                as: "video",
                                cond:{
                                    $eq:["$video.isPublished" , true]
                                }

                            }
                        }
                    }
                },
                createdAt:1,
                updatedAt:1
            }     
         }
    ])
    if(!playList){
        throw new ApiError(404,"Playlist Not Found")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,playList,"Playlist Fetched Successfully"))

})

export {
    addVideoToPlaylist,
    createPlayList,
    getPlaylistById,
    getUserPlaylists,
    updatePlaylist,
    deletePlayList,
    removeVideoFromPlaylist
}