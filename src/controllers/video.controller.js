import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {deleteFromCloudinary, uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import {Video} from "../models/video.model.js"

const publishAVideo = asyncHandler(async(req, res)=>{

        const{title, description} = req.body;
    
        if( [title, description ].some((field)=> field?.trim() === "")){
            throw new ApiError(400, " All the fileds are required")
        }
        
        // thumbnail and video
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path
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
            duration: publishVideo.duration,
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
    let {page=1, limit=10, query, sortBy, sortType, userId} = req.query;

    page =  parseInt(page, 10)
    limit = parseInt(limit, 10)

    // Validate and adjust page and limit values

    page = Math.max(1, page); // ensure that the lesat page is 1
    limit = Math.min(20, MAth.max(1, limit));

    const pipeline =[];

    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400, "userId is invalid")
        }
    }

    pipeline.push({
        $match:{
            owner: mongoose.Types.ObjectId(userId)
        }
    });

    // Matching videos based in the searched query
    if(query){
        pipeline.push({
            $match:{
                $text:{
                    $search: query
                }
            }
        });
    }

    // Sort Type and Sort By
    const sortCriteria = {};
    if(sortBy && sortType){
        sortCriteria[sortBy] = sortType ==="asc"?1:-1
        pipeline.push({
            $sort: sortCriteria
        })
    }else{
        // Default sorting by createdAt
        sortCriteria["createdAt"]==-1;
        pipeline.push({
            $sort : sortCriteria
        });
    }

    // Apply Pagination using skip and limit
    pipeline.push({
        $skip: (page-1)*limit
    });
    pipeline.push({
        $limit: limit
    });

    const videos = await Video.aggregate(pipeline);

    if(!videos || videos.length ===0){
        throw new ApiError(404, "Videos not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, videos, "Videos fetched Successfully")
    )

});

export {
    publishAVideo,
    updatevideo,
    deleteVideo,
    getVideoById,
    tooglePublishStatus,
    getAllVideos
}