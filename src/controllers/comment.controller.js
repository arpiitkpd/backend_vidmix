import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { ApiResponse } from "../utils/ApiResponse.js";
// import mongoose, { isValidObjectId } from "mongoose";
import {Comment} from '../models/comment.model.js'
import { Video } from "../models/video.model.js";
import { isValidObjectId } from "mongoose";

const createComment = asyncHandler(async(req,res)=>{
    const{content} = req.body;
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400, "Not found video")
    }

    if(!content){
        throw new ApiError(400, "Enter the content of the content")
    }

    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: req.user?._id
    })
    
    if(!comment){
        throw new ApiError(500, "Error while creating comment")
    }

    res.status(200).json(
        new ApiResponse(200, comment, "comment is successfully created")
    )
})

const updateComment = asyncHandler(async(req, res)=>{

    const {content} = req.body;
    const {commentId} = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"comment is invalid")
    }

    if(!content){
        throw new ApiError(400, "content to update is required")
    }

    const comment = await Comment.findByIdAndUpdate(commentId,{
        $set:{
            content: content
        }
    },
    {
            new: true
    })

    if(!comment){
        throw new ApiError(500, "error while updating the error")
    }

    res.status(200).json(
        new ApiResponse(200,  comment, "Comment updated succesfully")
    )
    

})

const deleteComment = asyncHandler(async(req, res)=>{

    const {commentId} = req.params
    const userId = req.user?._id

    if(!isValidObjectId(commentId)){
        throw new ApiError(200, "Invalid Comment ID")
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(400, "Comment not found")
    }

    if(comment.owner != userId){
        throw new ApiError(400, "Invalid user")
    }

    await Comment.deleteOne(comment);

    res.status(200).json(
        new ApiResponse(201, {}, "Comment deleted succesfully")
    )

})


export {
    createComment,
    updateComment,
    deleteComment
}