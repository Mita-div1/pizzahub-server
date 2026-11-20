
const express = require("express");
const { ObjectId } = require("mongodb");

module.exports = (menuItemsCollection, usersCollection) => {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const { search, category, location, sort, limit } = req.query;

      const query = { status: "approved", available: { $ne: false } };

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

  router.get("/", async (req, res) => {
    try {
      const { search, category, location, sort, limit, featured } = req.query;

      const query = { status: "approved", available: { $ne: false } };

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

      const lim = limit ? parseInt(limit) : 0;

      let cursor = menuItemsCollection.find(query).sort(sortOption);
      if (lim && featured !== "true") cursor = cursor.limit(lim);

      let items = await cursor.toArray();

      // Premium vendor check
      const vendorIds = [...new Set(items.map((i) => i.vendorId))]
        .filter((v) => ObjectId.isValid(v))
        .map((v) => new ObjectId(v));

      const vendors = await usersCollection
        .find(
          { _id: { $in: vendorIds } },
          { projection: { subscriptionPlan: 1, subscriptionExpiresAt: 1 } }
        )
        .toArray();

      const premiumSet = new Set(
        vendors
          .filter(
            (v) =>
              v.subscriptionPlan === "premium" &&
              v.subscriptionExpiresAt &&
              new Date(v.subscriptionExpiresAt) > new Date()
          )
          .map((v) => v._id.toString())
      );

      items = items.map((i) => ({
        ...i,
        isPremiumVendor: premiumSet.has(i.vendorId),
      }));

      // Featured: premium vendors first
      if (featured === "true") {
        items.sort((a, b) => Number(b.isPremiumVendor) - Number(a.isPremiumVendor));
        if (lim) items = items.slice(0, lim);
      }

      res.send(items);
    } catch (error) {
      res.status(500).send({ message: "Failed to load menu items" });
    }
  });
  
  return router;
};