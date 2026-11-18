
const express = require("express");
const { ObjectId } = require("mongodb");

module.exports = (menuItemsCollection) => {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const { search, category, location, sort, limit } = req.query;

      const query = { status: "approved" };

      if (search) {
        query.itemName = { $regex: search, $options: "i" };
      }
      if (category) {
        query.category = category;
      }
      if (location) {
        query.location = { $regex: location, $options: "i" };
      }

      let sortOption = { createdAt: -1 };
      if (sort === "price_asc") sortOption = { price: 1 };
      if (sort === "price_desc") sortOption = { price: -1 };

      let cursor = menuItemsCollection.find(query).sort(sortOption);
      if (limit) cursor = cursor.limit(parseInt(limit));

      const items = await cursor.toArray();
      res.send(items);
    } catch (error) {
      res.status(500).send({ message: "Failed to load menu items" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid item ID" });
      }

      const item = await menuItemsCollection.findOne({
        _id: new ObjectId(id),
        status: "approved",
      });

      if (!item) {
        return res.status(404).send({ message: "Item not found" });
      }

      res.send(item);
    } catch (error) {
      res.status(500).send({ message: "Failed to load item" });
    }
  });

  return router;
};