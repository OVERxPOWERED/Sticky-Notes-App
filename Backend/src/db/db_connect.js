import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

export default async function connect_DB(){
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("\nMONGO DB CONNECTED\nHOST: ", connectionInstance.connection.host);
    }
    catch(err){
        console.error("MONGO DB CONNECTION ERROR: ", err);
        throw err;
    }
}