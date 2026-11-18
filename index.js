const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
 

app.use(cors());
app.use(express.json());



const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB! 🚀");
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