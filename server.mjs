import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express';
import { MongoClient } from 'mongodb';
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { BigNumber, ethers } from 'ethers';


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

        // POOL PARTICIPANTS AUTO UPDATER
        await totalPlayersUpdater(client);

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
//

async function totalPlayersUpdater( client ) {

    // GET ACTIVE POOLS
    //

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
    //

    // RPCS
    const fantomRPC = "https://rpc.ankr.com/fantom";
    const polygonRPC = "https://rpc.ankr.com/polygon_mumbai";

    // SEASON CONTRACT ADDRESSES
    const fantomAddress = "0x48379C046da82D6087b6EdD453aF177cD910bbE9";
    const mumbaiAddress = "0x391b7790F0C9AcB634b5f7d66F9D5eBC6C9a26D1";
    
    // INSTANTIATE SDKS
    const fantomSdk = new ThirdwebSDK(fantomRPC);
    const polygonSdk = new ThirdwebSDK(polygonRPC);

    // SET CONTRACTS
    const fantomContract = await fantomSdk.getContract(fantomAddress, "edition-drop");
    const polygonContract = await polygonSdk.getContract(mumbaiAddress, "edition-drop");

    // LISTEN TO FANTOM BLOCKCHAIN EVENTS
    fantomContract?.events.listenToAllEvents((event) => {
        getClaimedTokens(event, "fantom");
    });

    // LISTEN TO POLYGON BLOCKCHAIN EVENTS
    polygonContract?.events.listenToAllEvents((event) => {
        getClaimedTokens(event, "polygon");
    });


    // GET CLAIMED TOKENS FROM EVENT
    function getClaimedTokens(event, chain) {
        if (event.eventName === "TokensClaimed" ) {

            // Get buyer
            const getClaimer = ethers.utils.getAddress(event.data.claimer);

            // Get pool tokenID
            const getTokenID = ethers.BigNumber.from(event.data.tokenId).toNumber();

            // Get total players on each chain, and call database updater function
            (async function() {
            
                // Get total players from each chain
                const polygonSupply = await polygonContract.totalSupply(getTokenID);
                const fantomSupply = await fantomContract.totalSupply(getTokenID);
                
                // UPDATE DATASE
                updateDatabase(getTokenID, polygonSupply, fantomSupply);
                
                // Output event data for debugging
                console.log(
                    getClaimer, " claimed a ",
                    chain, " ticket ",
                    "- for pool with tokenID", getTokenID
                );

            })();
        }
    }

    // DATABASE UPDATER
    function updateDatabase(getTokenID, polygonSupply, fantomSupply) {

        // Find unique document
        const filter = {tokenID: getTokenID};

        // Set new total
        const updateDoc = {
            $set: {
                totalPlayers: parseInt(polygonSupply) + parseInt(fantomSupply) 
            },
        };

        // Update document
        const spacefarerPools = client.db("cryptark").collection("poolsSpacefarer").updateOne(filter, updateDoc);
    }

}


// INVOKE MAIN
main().catch(console.error);


// PORT LISTENER
app.listen(port, () => {
    console.log("Server started on port:", port)
})