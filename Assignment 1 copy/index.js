import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import Axios from "axios";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
const url = process.env.MONGODB_URI; 
const client = new MongoClient(url);
const dbName = "sample_mflix"; 
let db, moviesCollection;

async function connectToDB() {
    try {
    await client.connect();
    console.log("MongoDB connection string:", process.env.MONGO_DB_SERVER);

    db = client.db(dbName);
    moviesCollection = db.collection("movies"); 
} catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

// Connect to the database when the app starts
connectToDB();

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

