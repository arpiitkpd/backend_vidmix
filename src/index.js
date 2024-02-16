import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.on("error", (error)=>{
        console.log("ERROR: ", error);
        throw error;
    })
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`server is runing at port: ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGODB CONNECTION FAILED: ", err);
})

