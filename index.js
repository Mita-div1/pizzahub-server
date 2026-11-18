
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("pizzahub");

    const usersCollection = db.collection("user");
    const menuItemsCollection = db.collection("menuItems");
    const ordersCollection = db.collection("orders");
    const transactionsCollection = db.collection("transactions");

    app.use("/menu-items", require("./routes/menuItems")(menuItemsCollection));

    await db.command({ ping: 1 });
    console.log("Connected to MongoDB: pizzahub database");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}
run();

app.get("/", (req, res) => {
  res.send("PizzaHub server is running");
});

app.listen(port, () => {
  console.log(`PizzaHub server is running on port ${port}`);
});