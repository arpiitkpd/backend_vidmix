import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { ApiResponse } from "../utils/ApiResponse.js";
// import mongoose, { isValidObjectId } from "mongoose";
import {Like} from '../models/like.model.js'
import { Video } from "../models/video.model.js";
import mongoose, { isValidObjectId } from "mongoose";


const toogleVideoLike = asyncHandler(async(req, res)=>{

    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(404, "invalid video id")
    }

    const video = await Video.findById(videoId)
    const {userid} = req.user?._id

    if(!video){
        throw new ApiError(404, "Video couldn't found")
    }
    
    const alreadyLiked = await Like.findOne(
        {
            $and: [{video:videoId} , {likedBy:userid}]
        }
    )

    if(!alreadyLiked){
        // create the like on video including user id
        const like = await Like.create({
            video: videoId,
            likedBy: req.user?.id
        })

        if(!like){
            throw new ApiError(501, "Error while liking")
        }

        return res.status(201).json(
            new ApiResponse(200, like, "Liked the video succesfully")
        )

    }

    await Like.deleteOne(alreadyLiked)

    return res.status(201).json(
        new ApiResponse(200, {}, "Video was liked succesfully toggled to unlike ")
    )
    


})

const toogleCommentLike = asyncHandler(async(req, res)=>{

    const {commentId} = req.params;
    const userId = req.user._id

    if(!isValidObjectId(commentId)){
        throw new ApiError(404, "invalid video id")
    }

    commentAlreadyLiked = await Like.findOne(
        {
            $and: [{comment: commentId} , {likedBy: userId}]
        }
    )

    if(!commentAlreadyLiked){

        const like = await Like.create({
            comment: commentId,
            likedBy: req.user?.id
        })

        if (!like) {
            throw new ApiError(410, "Error while liking");
        }

        return res.status(200).json(
            new ApiResponse(201, like, "comment is liked now")
        )
    }

    await Like.deleteOne(commentAlreadyLiked)

    return res.status(200).json(
        new ApiResponse(201, {}, "comment is unliked and was previously liked")
    )

})

const toogleTweetLike = asyncHandler(async(req, res)=>{

    const{tweetId} = req.params;

    const{userId} = req.user?.id;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "tweet not found")
    }

    const Likedtweet = await Like.findOne({
        $and:[{likedBy:userId}, {tweet: tweetId}]
    }) 

    if(!Likedtweet){

        const like = await Like.create({
            likedBy: userId,
            tweet: tweetId
        })

        if(!like){
            throw new ApiError(500, "Error while liking")
        }

        res.status(200).json(
            new ApiResponse(201, like, "liked the tweet")
        )

    }

    await Like.deleteOne(Likedtweet)

    res.status(200).json(
        new ApiResponse(200, {}, "Unlike the already liked tweet")
    )

})

const getLikedVideos = asyncHandler(async(req, res)=>{

    const {userId} = req.user?._id;
    try {
        
        const likedVideos = await Like.aggregate([
            {
                $match:{
                    likedBy : new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "likedVideos"
                }
            },{
                $unwind: "$likedVideos"
            },{
                $match:{
                    "likedVideos.isPublished" : true
                }
            },
            {
                $lookup:{
                    from: "users",
                    let:{owner_id : "$likedVideos.owner"},
                    pipeline:[
                        {
                            $match:{
                                $expr: {$eq: ["$_id", "$$owner_id"]}
                            }
                        },{
                            $project:{
                                _id:0,
                                username: 1,
                                avatar:1,
                                fullname:1
                            }
                        }
                    ],
                    as: "owner"
                }
            },
            {
                $unwind: {
                    path: "$owner", preserveNullAndEmptyArrays
                }
            },
            {
                $project:{
                    _id: "$likedVideos._id",
                    title: "$likedVideos.title",
                    thumbnail: '$likedVideos.thumbnail',
                    owner:{
                        username : "$owner.username",
                        avatar:"$owner.avatar",
                        fullName: "$owner.fullName"
                    }
                }
            },
            {
                $group:{
                    _id: null,
                    likedVideos: {$push: "$$ROOT"}
                }
            },
            {
                $project:{
                    _id :0,
                    likedVideos:1
                }
            }
        ]);
        if(likedVideos.length ===0){
            return res.status(400).json(
                new ApiResponse(404, [], "no liked video found")
            )
        }

        return res.status(200).json(
            new ApiResponse(200,likedVideos, "Liked videos fetched successfully")
        )


    } catch (error) {
        throw new ApiError(500, error?.message || "Unable to fetched videos")
    }

})

export {
    toogleVideoLike,
    toogleCommentLike,
    toogleTweetLike,
    getLikedVideos
}