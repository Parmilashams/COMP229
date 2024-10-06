const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// MongoDB connection
const url = process.env.MONGO_DB_SERVER;
const client = new MongoClient(url);
const dbName = "comp229week3";
let db, concertsCollection;

async function connectToDB() {
  await client.connect();
  console.log("Connected to MongoDB");
  db = client.db(dbName);
  concertsCollection = db.collection("concerts");
}

// Connect to the database when the app starts
connectToDB();

// Routes

// GET all concerts with soft delete check
app.get("/concerts", async (req, res) => {
  const { location, start, end } = req.query;

  try {
    let query = { deleted: { $ne: true } }; // Exclude deleted items

    // Add location filter if provided
    if (location) {
      query.Venue = location;
    }

    // Add date filter if start and end are provided
    if (start && end) {
      query.Date = { $gte: new Date(start), $lte: new Date(end) };
    } else if (start) {
      query.Date = new Date(start);
    }

    const filteredConcerts = await concertsCollection
      .find(query)
      .sort({ Date: 1 }) // Sort by date from oldest to newest
      .toArray();

    res.json(filteredConcerts);
  } catch (error) {
    console.error("Error fetching concerts:", error);
    res.status(500).send("Error fetching concerts");
  }
});

// GET all concerts at a certain location
app.get("/concerts/location/:venue", async (req, res) => {
  const { venue } = req.params;
  try {
    const concertsAtVenue = await concertsCollection
      .find({ Venue: venue, deleted: { $ne: true } })
      .toArray();
    res.json(concertsAtVenue);
  } catch (error) {
    console.error("Error fetching concerts at location:", error);
    res.status(500).send("Error fetching concerts at location");
  }
});

// GET all concerts between two dates OR on a single date
app.get("/concerts/date", async (req, res) => {
  const { start, end } = req.query;

  try {
    let query = { deleted: { $ne: true } }; // Exclude deleted items
    if (start && end) {
      query.Date = { $gte: new Date(start), $lte: new Date(end) };
    } else if (start) {
      query.Date = new Date(start);
    }

    const concertsByDate = await concertsCollection
      .find(query)
      .sort({ Date: 1 })
      .toArray();
    res.json(concertsByDate);
  } catch (error) {
    console.error("Error fetching concerts by date:", error);
    res.status(500).send("Error fetching concerts by date");
  }
});

// POST: Add a new concert
app.post("/concerts", async (req, res) => {
  const { eventName, venue, date } = req.body;
  if (!eventName || !venue || !date) {
    return res.status(400).json({
      error:
        "Missing required fields: Event Name, Venue, and Date are required.",
    });
  }

  // Validate date format
  if (isNaN(Date.parse(date))) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Please use YYYY-MM-DD." });
  }

  try {
    const newConcert = { eventName, venue, date, deleted: false };
    await concertsCollection.insertOne(newConcert);
    res.status(201).json(newConcert);
  } catch (error) {
    console.error("Error adding concert:", error);
    res.status(500).json({ error: "Error adding concert" });
  }
});

// PUT: Update concert details
app.put("/concerts/:id", async (req, res) => {
  const { id } = req.params;
  const { eventName, venue, date } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid concert ID format." });
  }

  const updateData = {};
  if (eventName) updateData.eventName = eventName;
  if (venue) updateData.venue = venue;
  if (date) {
    if (isNaN(Date.parse(date))) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Please use YYYY-MM-DD." });
    }
    updateData.date = date;
  }

  try {
    const result = await concertsCollection.updateOne(
      { _id: new ObjectId(id), deleted: { $ne: true } },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: "Concert not found or already marked as deleted." });
    }

    res.json({ message: "Concert updated successfully" });
  } catch (error) {
    console.error("Error updating concert:", error);
    res.status(500).json({ error: "Error updating concert" });
  }
});

// DELETE: Soft delete concert
app.delete("/concerts/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid concert ID format." });
  }

  try {
    const result = await concertsCollection.updateOne(
      { _id: new ObjectId(id), deleted: { $ne: true } },
      { $set: { deleted: true } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: "Concert not found or already marked as deleted." });
    }

    res.json({ message: "Concert marked as deleted" });
  } catch (error) {
    console.error("Error deleting concert:", error);
    res.status(500).json({ error: "Error deleting concert" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
