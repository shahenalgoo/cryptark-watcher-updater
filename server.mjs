import * as dotenv from 'dotenv'
dotenv.config()

import pkg from 'express-response-helper';
const {responseHelper} = pkg;


import express from 'express';
import { MongoClient } from 'mongodb';
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { BigNumber, ethers } from 'ethers';


const app = express();

// app.use(responseHelper); 

const port = process.env.PORT || 8000;


// MAIN
//
async function main() {

    // CONNECT TO DB
    const uri = process.env.DATABASE_URI;
    const client = new MongoClient(uri);

    try {

        // Await connection to database
        await client.connect();
        console.log("Connected to Database");

        // POOL PARTICIPANTS AUTO UPDATER
        await watcherUpdater(client);

    } catch (e) {
        console.error(e);
    }
}


// POOL PLAYERS UPDATER
//
async function watcherUpdater( client ) {

    // LIVE BLOCKCHAIN DATA
    //
    // RPCS
    const fantomRPCs = ["https://rpc.ankr.com/fantom"]
    const polygonRPCs = ["https://rpc.ankr.com/polygon_mumbai"]

    // SEASON CONTRACT ADDRESSES
    const fantomAddress = "0x48379C046da82D6087b6EdD453aF177cD910bbE9";
    const polygonAddress = "0x391b7790F0C9AcB634b5f7d66F9D5eBC6C9a26D1";

    //SDKS
    var fantomSdk = null;
    var polygonSdk = null;
    
    //TRY INIT SDK
    tryInitSDK("polygon", 0);
    tryInitSDK("fantom", 0);

    //TRY CATCH INIT SDK FUNCTION
    function tryInitSDK(chain, index) {
        try {
            //try init sdk with first element of RPC arrays
            InitSdk(chain, index);
        } catch (exception) {
            //if error caught, try rpc in next index
            console.log(exception);
            index++;
            InitSdk(chain, index)
        }
    }

    //INIK SDK FUNCTION
    function InitSdk(chain, index) {
        //init chosen sdk with chosen RPC array index
        switch (chain) {
            case "fantom":
            fantomSdk = new ThirdwebSDK(fantomRPCs[index]);      
            break;
            case "polygon":
            polygonSdk = new ThirdwebSDK(polygonRPCs[index]);
            break;
        }
    }

    // SET CONTRACTS
    const fantomContract = await fantomSdk.getContract(fantomAddress, "edition-drop");
    const polygonContract = await polygonSdk.getContract(polygonAddress, "edition-drop");

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
                
                // Update database with new total
                updateTotalPlayers(getTokenID, polygonSupply, fantomSupply);

                // Find current pool
                const isAddressInAllowList = await client.db("cryptark").collection("poolsSpacefarer").findOne({
                    isActive : true,
                    published_at: {$ne: null},
                    tokenID : getTokenID,
                    allowList : getClaimer
                });

                // Check if player is not in allowlist
                if (isAddressInAllowList == undefined) {

                    // Insert new player in allowlist
                    insertInAllowList(getTokenID, getClaimer);
                }

                // Output event data for debugging
                console.log(
                    getClaimer, "claimed a",
                    chain, "ticket",
                    "- for pool with tokenID:", getTokenID
                );

            })();
        }
    }

    // UPDATE TOTAL PLAYERS
    function updateTotalPlayers(getTokenID, polygonSupply, fantomSupply) {

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


    // INSET NEW PLAYER TO ALLOWLIST
    function insertInAllowList(getTokenID, playerAddress) {

        // Find unique document
        const filter = {tokenID : getTokenID}

        // Add player to allowlist
        const updateDoc = {
            $addToSet: {
                allowList : playerAddress 
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