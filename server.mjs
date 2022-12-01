import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express';
import { MongoClient } from 'mongodb';
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
// const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 8000;

// console.log("hellos")

// // CONNECT TO DB
//     async function main() {
//         const uri = process.env.DATABASE_URI;
//         const client = new MongoClient(uri);

//         try {
//             await client.connect();
//             console.log("Connected to Database");

//             // Await to find seasons
//             await getSeasons(client, "controllerSeason");

//             // Await to find active pools
//             await getActivePools(client, "poolsSpacefarer");

//             // Await to load data from blockchain
//             await getBlockchainData();

//         } catch (e) {
//             console.error(e);
//         } finally {
//             await client.close();
//         }
//     }

// // GET ACTIVE WEEK FROM SEASONS
//     async function getSeasons( client ) {
//         const results = await client.db("cryptark").collection("controllerSeason").find({
//             isActive : true,
//             published_at: {$ne: null}
//         })
//         .project({
//             "_id": 0,
//             "slug": 1,
//             "seasonNumber": 1,
//             "gameName": 1,
//             "seasonWeek": 1,
//             "entryDeadline": 1,
//             "startingDate": 1,
//             "endingDate": 1
//         }).toArray();

//         // console.log(results)
//     }

// // GET ACTIVE POOLS
//     async function getActivePools( client ) {
//         const results = await client.db("cryptark").collection("poolsSpacefarer").find({
//             isActive : true,
//             published_at: {$ne: null}
//         })
//         .project({
//             "_id": 0,
//             "slug": 1,
//             "published_at": 1,
//             "isActive": 1,
//             "isPaused": 1,
//             "fantomAddress": 1,
//             "mumbaiAddress": 1,
//             "tokenID": 1,
//             "ticketPrice": 1,
//             "currency": 1,
//             "blockchain": 1,
//             "totalPlayers": 1,
//             "prizePoolSharePercentage": 1,
//             "totalParticipantsPaidPercentage": 1
//         }).toArray();

//         // const resultArray = await results.toArray();
//         // console.log(results)
//     }


// GET BLOCKCHAIN DATA
async function getBlockchainData() {

}

(async () => {
    const mumbaiRPC = "https://rpc.ankr.com/polygon_mumbai";

	const polygonSdk = new ThirdwebSDK(mumbaiRPC);
	const polygonContract = await polygonSdk.getContract("0x391b7790F0C9AcB634b5f7d66F9D5eBC6C9a26D1", "edition-drop");
	const token = await polygonContract.totalSupply(0);

    console.log(token.toNumber())
})();


















// main().catch(console.error);

// CONNECT TO MONGODB MONGOOSE

// async function connectDB() {
//     try {
//         await mongoose.connect(process.env.DATABASE_URI);
//         console.log("Connected to Database")
//     } catch (error) {
//         console.error(error);
//     }
// }

// connectDB();






// mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true});
// const db = mongoose.connection;

// db.on('error', (error) => console.error(error));
// db.on('open', () => console.log('Connected to Database'));





app.listen(port, () => {
    console.log("Server started on port 8000")
})