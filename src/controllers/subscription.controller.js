import mongoose from "mongoose"

import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId){
        throw new ApiError(400,"channelId is Requitred!!")
    }
    const userId = req.user?._id;
    const credential = {subscriber:userId,channel:channelId};

    const suscribed = await Subscription.findOne(credential)

    if(!suscribed){
        const newSubscription = await Subscription.create(credential);
        if(!newSubscription){
            throw new ApiError(500,"Unable to Subscribe channel")
        }
        return res
        .status(200)
        .json(new ApiResponse(200,newSubscription,"Channel Subscribed Successfully!!"))
    }

    const deletedSubscription = await Subscription.deleteOne(credential);
         if(!deletedSubscription){
             throw new ApiError(500,"Unable to Unsubscribe channel")
         }
         return res
         .status(200)
         .json(new ApiResponse(200,deletedSubscription,"Channel Unsubscribed Successfully!!"))
     

})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params
    if(!subscriberId){
        throw new ApiError(400,"channelId is Requitred!!")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $group:{
                _id: "channel",
                subscribers: {$push: "$subscriber"}
            }
        },
        {
            $project:{
                _id:0,
                subscribers:1
            }
        }
        
    ])
    if(!subscribers || subscribers.length === 0 ){
        return res
        .status(200)
        .json(new ApiResponse(200, [], "No subscribers found for the channel"));

    }
    return res
    .status(200)
    .json(new ApiResponse(200,subscribers,"All Subscribers fetched Successfully!!"))
    
})

const getSubscribedChannels = asyncHandler(async(req, res)=>{
    const{channelId}= req.params

    if(!channelId){
        throw new ApiError(400,"subscriberId is Requitred!!")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group:{
                _id: "subscriber",
                subscribedChannels: {$push:"$channel"}
            }
        },
        {
            $project:{
                _id:0,
                subscribedChannels:1
            }
        }
    ])
    if(!subscribedChannels || subscribedChannels.length === 0 ){
        return res
        .status(200)
        .json(new ApiResponse(200, [], "No subscribedChannel found for the user"));

    }
    return res
    .status(200)
    .json(new ApiResponse(200,subscribedChannels,"All SubscribedChannels fetched Successfully!!"))

})

export{
    toggleSubscription,getUserChannelSubscribers,getSubscribedChannels
}