import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {deleteFromCloudinary, uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import {Video} from "../models/video.model.js"

const publishAVideo = asyncHandler(async(req, res)=>{

        const{title, description} = req.body;
    
        if(
            [title, description ].some((field)=> field?.trim() === "")
        ){
            throw new ApiError(400, " All the fileds are required")
        }
        
        // thumbnail and video
        const thumbnailLocalPath = req.files?.video[0]?.path
        const videoLocalPath = req.files?.video[0]?.path

        if(!thumbnailLocalPath){
            throw new ApiError(400, "thumbnail file is required")
        }

        if(!videoLocalPath){
            throw new ApiError(400, "Video file is required")
        }

        const publishThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        const publishVideo = await uploadOnCloudinary(videoLocalPath)

        if(!publishThumbnail){
            throw new ApiError(400, " Thumbnail is not found")
        }
        if(!publishVideo){
            throw new ApiError(400, " Video is not found")
        }

        const video = await Video.create({
            title: title,
            description: description,
            thumbnail: publishThumbnail.url,
            videoFile: publishVideo.url,
            duration: 5,
            views: 0,
            isPublished: true,
            owner: req.user._id

        })

        return res.status(201).json(
            new ApiResponse(200, video, "video is published")
        )


})

const updatevideo = asyncHandler(async(req, res)=>{
    
    const { videoId } = req.params
    const {title, description} = req.body
    const thumbnailLocalPath  = req.file?.path

    const videoDetails = await Video.findById(videoId)

    if(videoDetails.owner != req.user._id){
        throw new ApiError("Unauthorized access to edit the video")
    }

    if(!title || ! description){
        throw new ApiError(400, "All the fileds are required")
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is missing")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail.url){
        new ApiError(400, "error while uploading the thumbnail")
    }
    


    const updatedVideo = Video.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                title: title,
                description: description,
                thumbnail: thumbnail.url
            }
        },
        {new : true}
    )

    return res.status(201).json(
        new ApiResponse(200, updatedVideo, " video is updated")
    )

})

const deleteVideo = asyncHandler(async(req, res)=>{
    const {videoId} = req.params;

    const video = await Video.findById({_id :videoId})

    const videoUrl = video.videoFile
    const thumbnail = video.thumbnail

    if(!video){
        throw new ApiError(400, "video is not found")
    }

    if(!(video?.owner?.equals(req.user?._id))){
        throw new ApiError(400, "user is unauthorized to delete the user")
    }

    
    

    const response = await Video.deleteOne(video)
    await deleteFromCloudinary(videoUrl)
    await deleteFromCloudinary(thumbnail)


    return res.status(200).json(
        new ApiResponse(200, response, "video deleted succesfully")
    )

})

const getVideoById= asyncHandler(async(req, res)=>{

    const{videoId} = req.params;

    const video = await Video.findById({_id: videoId})

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(201, video, "video fetched succedfully")
    )



})

const tooglePublishStatus = asyncHandler(async(req, res)=>{
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(404, "invalid video Id")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished: !isPublished
            }
        },
        {
            new  : true
        }
        )

        return res.status(200)
            .json(
                new ApiResponse(
                    201,
                    video,
                    "isPublished status is toggle"
                )
            )

})

const getAllVideos = asyncHandler(async(req, res)=>{
    const {page=1, limit=2, query="", sortBy="title", sortType="ascending", userId} = req.query

    if(query==""){
        const videos = await Video.find({owner: userId})
        return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"))
    }
    else{
        const videos = await Video.aggregate([
            {
                $match:{
                    title:{$regex: query, $options: 'i' },
                    description:{$regex: query, $options: "i"},
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $sort:{
                    [sortBy]: sortType=='ascending'?1:-1
                }
            },
            {
                $skip:(page-1)*10
            },
            {
                $limit: parseInt(limit)
            }
        ])
        if(!videos){
            throw new ApiError(404, "no videos found")

        }
        return res.status(200)
        .json(
            new ApiResponse(201,
                {
                  videos,
                  length: videos.length,
                  nextPage: parseInt(page)+1  
                },
                "videos fetched successfully"
                )
        )

    }

})

export {
    publishAVideo,
    updatevideo,
    deleteVideo,
    getVideoById,
    tooglePublishStatus,
    getAllVideos
}