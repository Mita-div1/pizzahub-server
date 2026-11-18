const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyRole } = require("../middleware/auth");

module.exports = (ordersCollection, menuItemsCollection, usersCollection) => {
  const router = express.Router();

  router.use(verifyToken, verifyRole("customer"));

  router.get("/", async (req, res) => {
    try {
      const orders = await ordersCollection
        .aggregate([
          { $match: { customerId: req.user.id } },
          {
            $lookup: {
              from: "menuItems",
              localField: "itemId",
              foreignField: "_id",
              as: "item",
            },
          },
          { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
          { $sort: { createdAt: -1 } },
        ])
        .toArray();
      res.send(orders);
    } catch (error) {
      res.status(500).send({ message: "Failed to load orders" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const { itemId, deliveryDate, deliveryAddress, message } = req.body;

      if (!itemId || !deliveryDate || !deliveryAddress) {
        return res.status(400).send({ message: "Delivery date and address are required" });
      }
      if (!ObjectId.isValid(itemId)) {
        return res.status(400).send({ message: "Invalid item ID" });
      }
      if (isNaN(new Date(deliveryDate).getTime())) {
        return res.status(400).send({ message: "Invalid delivery date" });
      }

      const customer = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
      if (!customer || customer.isBlocked) {
        return res.status(403).send({ message: "Account is blocked" });
      }

      const item = await menuItemsCollection.findOne({
        _id: new ObjectId(itemId),
        status: "approved",
      });
      if (!item) {
        return res.status(404).send({ message: "Item not available" });
      }
      if (item.vendorId === req.user.id) {
        return res.status(403).send({ message: "You cannot order your own item" });
      }

      const duplicate = await ordersCollection.findOne({
        itemId: item._id,
        customerId: req.user.id,
        deliveryDate,
        status: { $in: ["pending", "accepted"] },
      });
      if (duplicate) {
        return res.status(409).send({
          message: "You already have an active order for this item on this date",
        });
      }

      const newOrder = {
        itemId: item._id,
        vendorId: item.vendorId,
        customerId: req.user.id,
        deliveryDate,
        deliveryAddress,
        message: message || "",
        status: "pending",
        createdAt: new Date(),
      };

      const result = await ordersCollection.insertOne(newOrder);
      res.status(201).send({ message: "Order placed", insertedId: result.insertedId });
    } catch (error) {
      res.status(500).send({ message: "Failed to place order" });
    }
  });

  router.patch("/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid order ID" });
      }

      const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
      if (!order) return res.status(404).send({ message: "Order not found" });
      if (order.customerId !== req.user.id) {
        return res.status(403).send({ message: "You can only cancel your own orders" });
      }
      if (order.status !== "pending") {
        return res.status(400).send({ message: "Only pending orders can be cancelled" });
      }

      await ordersCollection.updateOne(
        { _id: new ObjectId(id), status: "pending" },
        { $set: { status: "cancelled" } }
      );
      res.send({ message: "Order cancelled" });
    } catch (error) {
      res.status(500).send({ message: "Failed to cancel order" });
    }
  });

  return router;
};