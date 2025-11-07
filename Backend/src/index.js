import connect_DB from "./db/db_connect.js";
import dotenv from "dotenv";
import {app} from "./app.js";

dotenv.config({
    path: "./.env"
});

connect_DB()
.then(()=>{
    app.on('error', (err)=>{
        console.error("SERVER ERROR: ", err);
        throw err;
    });
    app.listen(process.env.PORT, ()=>{
        console.log(`SERVER RUNNING ON PORT: ${process.env.PORT}`);
    });
});