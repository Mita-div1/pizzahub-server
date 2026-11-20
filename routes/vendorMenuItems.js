
const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyRole } = require("../middleware/auth");

module.exports = (menuItemsCollection, usersCollection) => {
  const router = express.Router();

  router.use(verifyToken, verifyRole("vendor"));

  router.get("/", async (req, res) => {
    try {
      const items = await menuItemsCollection
        .find({ vendorId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(items);
    } catch (error) {
      res.status(500).send({ message: "Failed to load your menu items" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const { itemName, category, description, price, location, images } = req.body;

      if (!itemName || !category || !description || !price || !location) {
        return res.status(400).send({ message: "All fields are required" });
      }
      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).send({ message: "Item image is required" });
      }
      if (isNaN(price) || Number(price) <= 0) {
        return res.status(400).send({ message: "Price must be a positive number" });
      }

      const vendor = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
      if (!vendor || vendor.isBlocked) {
        return res.status(403).send({ message: "Account is blocked" });
      }

      const isPremium =
        vendor.subscriptionPlan === "premium" &&
        vendor.subscriptionExpiresAt &&
        new Date(vendor.subscriptionExpiresAt) > new Date();

      if (!isPremium) {
        const activeCount = await menuItemsCollection.countDocuments({
          vendorId: req.user.id,
          status: { $in: ["pending", "approved"] },
        });
        if (activeCount >= 3) {
          return res.status(403).send({
            message: "Free plan limit reached. Upgrade to Premium to add more items.",
          });
        }
      }

      const newItem = {
        vendorId: req.user.id,
        itemName,
        category,
        description,
        price: Number(price),
        location,
        images,
        status: "pending",
        createdAt: new Date(),
      };

      const result = await menuItemsCollection.insertOne(newItem);
      res.status(201).send({ message: "Item submitted for approval", insertedId: result.insertedId });
    } catch (error) {
      res.status(500).send({ message: "Failed to add item" });
    }
  });

  router.patch("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid item ID" });
      }

      const item = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
      if (!item) return res.status(404).send({ message: "Item not found" });
      if (item.vendorId !== req.user.id) {
        return res.status(403).send({ message: "You can only edit your own items" });
      }

      const { itemName, category, description, price, location, images } = req.body;
      const updates = {};
      if (itemName) updates.itemName = itemName;
      if (category) updates.category = category;
      if (description) updates.description = description;
      if (location) updates.location = location;
      if (images && images.length) updates.images = images;
            if (typeof req.body.available === "boolean") {
        updates.available = req.body.available;
      }
      if (price) {
        if (isNaN(price) || Number(price) <= 0) {
          return res.status(400).send({ message: "Price must be a positive number" });
        }
        updates.price = Number(price);
      }

      await menuItemsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updates });
      res.send({ message: "Item updated" });
    } catch (error) {
      res.status(500).send({ message: "Failed to update item" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid item ID" });
      }

      const item = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
      if (!item) return res.status(404).send({ message: "Item not found" });
      if (item.vendorId !== req.user.id) {
        return res.status(403).send({ message: "You can only delete your own items" });
      }

      await menuItemsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send({ message: "Item deleted" });
    } catch (error) {
      res.status(500).send({ message: "Failed to delete item" });
    }
  });

  return router;
};