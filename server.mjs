import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express';
import { MongoClient } from 'mongodb';
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
// import { BigNumber, ethers } from 'ethers';
// import { readFileSync } from 'fs';

// const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 8000;



async function main() {
    // CONNECT TO DB
    const uri = process.env.DATABASE_URI;
    const client = new MongoClient(uri);

    try {

        // Await connection to database
        await client.connect();
        console.log("Connected to Database");

        // Await to find seasons
        // await getSeasons(client, "controllerSeason");

        // POOL PARTICIPANTS AUTO UPDATER
        await totalPlayersUpdater(client);

        // Await to load data from blockchain
        // await getBlockchainData();

    } catch (e) {
        console.error(e);
    }
}

// // GET ACTIVE WEEK FROM SEASONS
    // async function getSeasons( client ) {
    //     const results = await client.db("cryptark").collection("controllerSeason").find({
    //         isActive : true,
    //         published_at: {$ne: null}
    //     })
    //     .project({
    //         "_id": 0,
    //         "slug": 1,
    //         "seasonNumber": 1,
    //         "gameName": 1,
    //         "seasonWeek": 1,
    //         "entryDeadline": 1,
    //         "startingDate": 1,
    //         "endingDate": 1
    //     }).toArray();

    //     // console.log(results)
    // }

// POOL PLAYERS UPDATER
async function totalPlayersUpdater( client ) {

// GET ALL SPACEFARER ACTIVE POOLS
    const spacefarerPools = await client.db("cryptark").collection("poolsSpacefarer").find({
        isActive : true,
        published_at: {$ne: null}
    })
    .project({
        "_id": 0,
        "fantomAddress": 1,
        "mumbaiAddress": 1,
        "tokenID": 1,
        "totalPlayers": 1,
    }).toArray();
    


// LIVE BLOCKCHAIN DATA

    // SET RPCS
    const fantomRPC = "https://rpc.ankr.com/fantom";
    const polygonRPC = "https://rpc.ankr.com/polygon_mumbai";

    // INSTANTIATE SDKS
    const fantomSdk = new ThirdwebSDK(fantomRPC);
    const polygonSdk = new ThirdwebSDK(polygonRPC);


    // UPDATE DOCUMENT
    for (const pool of spacefarerPools) {

        // FANTOM
        const fantomContract = await fantomSdk.getContract(pool.fantomAddress, "edition-drop");
        const fantomSupply = await fantomContract.totalSupply(pool.tokenID);

        // MUMBAI
        const polygonContract = await polygonSdk.getContract(pool.mumbaiAddress, "edition-drop");
        const polygonSupply = await polygonContract.totalSupply(pool.tokenID);

        const totalCount = parseInt(fantomSupply) + parseInt(polygonSupply);

        // WATCH CHAIN & UPDATE TOTAL PLAYERS
        fantomContract?.events.listenToAllEvents((event) => {
            if (event.eventName === "TokensClaimed" ) {

                const filter = {totalPlayers: pool.totalPlayers};
                const updateDoc = {
                    $set: {
                        totalPlayers: totalCount
                    },
                };

                const spacefarerPools = client.db("cryptark").collection("poolsSpacefarer").updateOne(filter, updateDoc);

            }
        });

        polygonContract?.events.listenToAllEvents((event) => {
            if (event.eventName === "TokensClaimed" ) {

                const filter = {totalPlayers: pool.totalPlayers};
                const updateDoc = {
                    $set: {
                        totalPlayers: totalCount
                    },
                };

                const spacefarerPools = client.db("cryptark").collection("poolsSpacefarer").updateOne(filter, updateDoc);

            }
        });

    } //for

    // console.log(spacefarerPools);
}


main().catch(console.error);



app.listen(port, () => {
    console.log("Server started on port 8000")
})