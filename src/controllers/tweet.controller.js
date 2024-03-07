import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { ApiResponse } from "../utils/ApiResponse.js";
// import mongoose, { isValidObjectId } from "mongoose";
import {Tweet} from "../models/tweet.model.js"
// import { Video } from "../models/video.model.js";
import mongoose, { isValidObjectId, mongo } from "mongoose";

const createTweet = asyncHandler(async(req, res)=>{

    const {content} = req.body;
    const {userId} = req.user?._id;

    if(!content){
        throw new ApiError(400, "Content foe  the tweet is required")
    }

    const tweet = await Tweet.create({
        content: content,
        owner : userId
    })

    if(!tweet){
        throw new ApiError(500, "Error while creating your tweet")
    }

    res.status(200).json(
        new ApiResponse(201, tweet, "tweet created successfully")
    )


})

const getUserTweets = asyncHandler(async(req, res)=>{
    const {userId} = req.params;
    if(!userId){
        throw new ApiError(400, "UserID is required")
    }

    try {
        
        const tweet = await Tweet.aggregate([
            {
                $match:{
                owner : new mongoose.Types.ObjectId(userId)
                }
            },{
                $group :{
                    _id : "owner",
                    tweets:{$push:$content}
                }
            },{
                $project:{
                    _id:0,
                    tweets:1
                }
            }
        ])

        if(!tweet || tweet.length ===0){
            return res.status(200).json(
                new ApiResponse(200, [], "User have no tweets")
            )
        }

        return res.status(200).json(new ApiResponse(200, tweet, "Tweet for the user fethched successfully"))

    } catch (e) {
        throw new ApiError(500, e?.message || "UNable to fetch tweets")
    }

})

const updateTweet = asyncHandler(async(req, res)=>{

    const {contentToUpdate} = req.body;
    const {tweetId} = req.params;
    const {userId} = req.user?._id

    if(!contentToUpdate){
        throw new ApiError(400, "Enter the updated content");
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet")
    }

    const tweetToDelete = await Tweet.findById(tweetId)

    if(!tweetToDelete){
        throw new ApiError(400, "No Tweet found")
    }

    if(tweetToDelete.owner != userId){
        throw new ApiError(400, "Unauthorized user")
    }

    const tweet = await Tweet.findByIdAndUpdate(tweetId,{
        content: contentToUpdate
    },
    {
        new: true
    })

    if(!tweet){
        throw new ApiError(500, "Error while updating tweet")
    }

    res.status(200).json(
        new ApiResponse(201, tweet, "Tweet updated succesfully")
    )
    

})

const deleteTweet = asyncHandler(async(res, req)=>{
    const {tweetId} = req.params;
    const {userId} = req.user?._id

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet")
    }

    const tweetToDelete = await Tweet.findById(tweetId)

    if(!tweetToDelete){
        throw new ApiError(400, "No Tweet found")
    }

    if(tweetToDelete.owner != userId){
        throw new ApiError(400, "Unauthorized user")
    }

    await Tweet.deleteOne(tweetToDelete);

    res.status(200).json(
        new ApiResponse(201, {}, "Tweet deleted Succesfully")
    )

})

export{
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
}