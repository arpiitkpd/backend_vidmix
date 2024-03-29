import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessandRefreshToken = async(userId)=>{
    try {
       const user= await User.findById(userId)
       const accessToken= user.generateAccessToken()
       const refreshToken= user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    
    const {fullName, username, email, password} = req.body
    console.log(fullName, username)
    if(
        [fullName, email, username, password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400, " All the fileds are required")
    }

    const existedUser =  await User.findOne({
        $or: [{ email }, { username }]
    })

    if(existedUser){
        throw new ApiError(409, " User is alreday existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required" )
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required" )
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        email,
        coverImage: coverImage?.url || "",
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")

    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered succesfully")
    )

})

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
   

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})


const logoutUser = asyncHandler(async (req, res)=>{
     await User.findByIdAndUpdate(
        req.user._id,{
            $unset:{
                refreshToken: 1
            }
        },
        {
            new: true
        }
     )

     const options ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "user logged out")
    )
})

const refreshAccessToken = asyncHandler(async (req, res)=>{

   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request" )
    }

    try {
        const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
    
       const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(404, "Invalid refrresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "refresh is expired")
        }
    
         const {newrefreshToken, newaccessToken}=await generateAccessandRefreshToken(user._id)
    
         const options = {
            httpOnly: true,
            secure: true
         }
    
         return res
         .status(201)
         .cookie("accessToken",newaccessToken,options )
         .cookie("refreshToken", newrefreshToken, options)
         .json(
            new ApiResponse(200,
                {accessToken: newaccessToken, refreshToken: newrefreshToken},
                "access token renewed"
                )
         )
    
    } catch (error) {
        throw new ApiError(402, error?.message || " invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword}= req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, {}, "password change succesfully"))
})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res.status(200)
    .json(new ApiResponse(200, req.user, "User fetchced succesfully"))
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullName, email} = req.body
    console.log(fullName)

    if(!fullName || ! email){
        throw new ApiError(400, "All the fileds are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName : fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(
        200, user, "Account Updated" 
    ))

})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarlocalPath = req.file?.path

    if(!avatarlocalPath){
        throw new ApiError(400, "Avatar is missing")

    }

    const avatar =await uploadOnCloudinary(avatarlocalPath)

    if(!avatar.url){
        new ApiError(400, "error while uploading the avatar")
    }

    const user =await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select('-password')

    return res.status(200)
    .json(
        new ApiResponse(200,
            user,
            "Avatar Updated successfully")
    )


})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const CoverImagelocalPath = req.file?.path

    if(!CoverImagelocalPath){
        throw new ApiError(400, "CoverImage is missing")

    }

    const coverImage =await uploadOnCloudinary(CoverImagelocalPath)

    if(!coverImage.url){
        new ApiError(400, "error while uploading the coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select('-password')

    return res.status(200)
    .json(
        new ApiResponse(200,
            user,
            "CoverImage Updated successfully")
    )

})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username}= req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel= await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                email: 1,
                username: 1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                avatar:1, 
                coverImage:1,
                isSubscribed:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched succesfully")
    )

})

const getWatchHistory = asyncHandler(async(req, res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)

            }
        },
        {
            $lookup:{
                from:"videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json( new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched succesfully"
    ))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    
}