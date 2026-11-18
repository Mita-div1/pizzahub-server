
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());


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

        app.use(
      "/webhook",
      require("./routes/webhook")(usersCollection, transactionsCollection)
    );

    app.use(express.json());

    app.use("/menu-items", require("./routes/menuItems")(menuItemsCollection));

        app.use(
      "/vendor/menu-items",
      require("./routes/vendorMenuItems")(menuItemsCollection, usersCollection)
    );

        app.use(
      "/customer/orders",
      require("./routes/customerOrders")(ordersCollection, menuItemsCollection, usersCollection)
    );

        app.use(
      "/vendor/orders",
      require("./routes/vendorOrders")(ordersCollection, usersCollection)
    );


        app.use(
      "/admin",
      require("./routes/admin")(
        usersCollection,
        menuItemsCollection,
        ordersCollection,
        transactionsCollection
      )
    );

        app.use(
      "/payments",
      require("./routes/payments")(usersCollection, transactionsCollection)
    );


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


if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(port, () => {
    console.log(`PizzaHub server is running on port ${port}`);
  });
}