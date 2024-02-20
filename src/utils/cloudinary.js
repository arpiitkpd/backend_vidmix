import {v2 as cloudinary} from 'cloudinary'
import { log } from 'console';
import fs from 'fs'

          
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
        console.log("file has been uploaded succesfully" , response.url);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the localy saved temporary files as the upload operation is failed
        return null;
    }
}

export {uploadOnCloudinary}