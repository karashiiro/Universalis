// Dependencies
import Router from "@koa/router";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import serve from "koa-static";
import views from "koa-views";
import { MongoClient } from "mongodb";
import sha from "sha.js";

import remoteDataManager from "./remoteDataManager";

// Scripts
// import createGarbageData from "../scripts/createGarbageData";
// createGarbageData();

// Load models
import { Collection } from "mongodb";

import { MarketBoardHistoryEntry } from "./models/MarketBoardHistoryEntry";
import { MarketBoardItemListing } from "./models/MarketBoardItemListing";
import { MarketBoardListingsUpload } from "./models/MarketBoardListingsUpload";
import { MarketBoardSaleHistoryUpload } from "./models/MarketBoardSaleHistoryUpload";

import { HistoryTracker } from "./trackers/HistoryTracker";
import { PriceTracker } from "./trackers/PriceTracker";

// Define application and its resources
const db = MongoClient.connect(`mongodb://localhost:27017/`, { useNewUrlParser: true, useUnifiedTopology: true });
var recentData: Collection;
var extendedHistory: Collection;

var historyTracker: HistoryTracker;
var priceTracker: PriceTracker;
const init = (async () => {
    const universalisDB = (await db).db("universalis");

    recentData = universalisDB.collection("recentData");
    extendedHistory = universalisDB.collection("extendedHistory");

    historyTracker = new HistoryTracker(
        recentData,
        extendedHistory
    );
    priceTracker = new PriceTracker(
        recentData
    );
})();

const universalis = new Koa();
universalis.use(bodyParser({
    enableTypes: ["json"],
    jsonLimit: "1mb"
}));

remoteDataManager.fetchAll(); // Fetch remote files asynchronously

// Logger TODO
universalis.use(async (ctx, next) => {
    await next();
    console.log(`${ctx.method} ${ctx.url}`);
});

// Set up renderer
universalis.use(views("./views", {
    extension: "pug"
}));

// Publish public resources
universalis.use(serve("./public"));

// Routing
const router = new Router();

router.get("/", async (ctx) => {
    await ctx.render("index.pug", {
        name: "Universalis - Crowdsourced Market Board Aggregator",
        version: require("../package.json").version
    });
});

router.get("/api/:world/:item", async (ctx) => { // Normal data
    await init;

    let query = { itemID: ctx.params.item };
    if (!parseInt(ctx.params.world)) {
        query["dcName"] = ctx.params.world;
    } else {
        query["worldID"] = ctx.params.world;
    }

    let data = await recentData.findOne(query);

    if (!data) {
        ctx.body = {
            itemID: ctx.params.item,
            listings: [],
            recentHistory: [],
            worldID: ctx.params.world
        };
        return;
    } else {
        delete data["_id"];
    }

    ctx.body = data;
});

router.get("/api/history/:world/:item", async (ctx) => { // Extended history
    await init;

    let query = { itemID: ctx.params.item };
    if (!parseInt(ctx.params.world)) {
        query["dcName"] = ctx.params.world;
    } else {
        query["worldID"] = ctx.params.world;
    }

    let data = await extendedHistory.findOne(query);

    if (!data) {
        ctx.body = {
            entries: [],
            itemID: ctx.params.item,
            worldID: ctx.params.world
        };
        return;
    } else {
        delete data["_id"];
    }

    ctx.body = data;
});

router.post("/upload/:apiKey", async (ctx) => {
    if (!ctx.params.apiKey) {
        return ctx.throw(401);
    }

    if (!ctx.is("json")) {
        return ctx.throw(415);
    }

    await init;

    // Accept identity via API key.
    const dbo = (await db).db("universalis");
    const trustedSource = await dbo.collection("trustedSources").findOne({
        apiKey: sha("sha512").update(ctx.params.apiKey).digest("hex")
    });
    if (!trustedSource) return ctx.throw(401);

    const sourceName = trustedSource.sourceName;

    // Data processing
    let marketBoardData: MarketBoardListingsUpload & MarketBoardSaleHistoryUpload = ctx.request.body;

    // You can't upload data for these worlds because you can't scrape it.
    // This does include Chinese and Korean worlds for the time being.
    if (!marketBoardData.worldID || !marketBoardData.itemID) return ctx.throw(415);
    if (marketBoardData.worldID <= 16 || marketBoardData.worldID >= 100) return ctx.throw(415);

    // TODO sanitation
    if (marketBoardData.listings) {
        let dataArray: MarketBoardItemListing[] = [];
        marketBoardData.listings.map((listing) => {
            return {
                creatorID: listing.creatorID,
                creatorName: listing.creatorName,
                hq: listing.hq,
                lastReviewTime: listing.lastReviewTime,
                materia: listing.materia ? listing.materia : [],
                pricePerUnit: listing.pricePerUnit,
                quantity: listing.quantity,
                retainerCity: listing.retainerCity,
                retainerName: listing.retainerName,
                sellerID: listing.sellerID,
                dyeID: listing.dyeID,
                uploaderID: sha("sha512").update(listing.uploaderID).digest("hex")
            };
        });

        for (let listing of marketBoardData.listings) {
            listing.total = listing.pricePerUnit * listing.quantity;
            dataArray.push(listing);
        }

        await priceTracker.set(
            marketBoardData.itemID,
            marketBoardData.worldID,
            dataArray as MarketBoardItemListing[]
        );
    }

    if (marketBoardData.entries) {
        let dataArray: MarketBoardHistoryEntry[] = [];
        marketBoardData.entries.map((entry) => {
            return {
                buyerID: entry.buyerID,
                buyerName: entry.buyerName,
                hq: entry.hq,
                pricePerUnit: entry.pricePerUnit,
                quantity: entry.quantity,
                sellerID: entry.sellerID,
                timestamp: entry.timestamp
            };
        });

        for (let entry of marketBoardData.entries) {
            entry.total = entry.pricePerUnit * entry.quantity;
            dataArray.push(entry);
        }

        await historyTracker.set(
            marketBoardData.itemID,
            marketBoardData.worldID,
            dataArray as MarketBoardHistoryEntry[]
        );
    }
    if (!marketBoardData.listings && !marketBoardData.entries) ctx.throw(418);
});

universalis.use(router.routes());

// Start server
universalis.listen(3000);
