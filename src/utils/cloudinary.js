import {v2 as cloudinary} from 'cloudinary'

import fs from 'fs'
import { ApiError } from './ApiError.js';

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary=async(localFilePath)=>{
    try {
        if(!localFilePath) return null
        // upload the file on cloudinary
        const response=await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })        
        // file has been uploaded sucesfully
        // console.log("file has been uploaded succesfully" , response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the localy saved temporary files as the upload operation is failed
        return null;
    }
}

const deleteFromCloudinary = async(cloudinaryId)=>{
    try {
        
        if(!cloudinaryId){
            throw new ApiError(401, "unable to reach file url")
        }
        await cloudinary.uploader.destroy(cloudinaryId)

    
    } catch (error) {
        throw new ApiError(404, "Can't delete file")
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}