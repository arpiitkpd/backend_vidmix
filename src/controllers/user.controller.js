import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessandRefreshToken = async(userId)=>{
    try {
       const user= await User.findById(userId)
       const accessToken= user.generateAccessToken()
       const refreshTokoen= user.generateRefreshToken()

        user.refreshTokoen = refreshTokoen
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshTokoen}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    
    const {fullName, username, email, password} = req.body
    
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

} )

const loginUser = asyncHandler(async (req, res)=>{
    // req bosy - data
    // username or email
    // find the user
    // password check
    // access and refresh token renegration
    // send cookies

    const {email, username, password}= req.body;

    if(!(username || email)){
        throw new ApiError(404, "username and pasword is required")
    }

    const user = await User.findOne({
        $or:[{email}, {username}]
    })
    if(!user){
        throw new ApiError(404, "User not exist")

    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User credentials")
    }

    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id)

    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,{
            user: loggedInUser, accessToken, refreshToken
        }, "User logged in Succesfully")
    )
})

const logoutUser = asyncHandler(async (req, res)=>{
     await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken: undefined
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
    .clearCookie(refreshToken, options)
    .clearCookie(accessToken, options)
    .json(
        new ApiResponse(200, {}, "user logged out")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser
}