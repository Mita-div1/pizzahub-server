
const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyRole } = require("../middleware/auth");

module.exports = (ordersCollection, usersCollection) => {
  const router = express.Router();

  router.use(verifyToken, verifyRole("vendor"));

  router.get("/", async (req, res) => {
    try {
      const orders = await ordersCollection
        .aggregate([
          { $match: { vendorId: req.user.id } },
          {
            $lookup: {
              from: "menuItems",
              localField: "itemId",
              foreignField: "_id",
              as: "item",
            },
          },
          { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "user",
              let: { cid: "$customerId" },
              pipeline: [
                { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$cid"] } } },
                { $project: { name: 1, email: 1, image: 1 } },
              ],
              as: "customer",
            },
          },
          { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
          { $sort: { createdAt: -1 } },
        ])
        .toArray();
      res.send(orders);
    } catch (error) {
      res.status(500).send({ message: "Failed to load orders" });
    }
  });

  const changeStatus = (newStatus) => async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid order ID" });
      }

      const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
      if (!order) return res.status(404).send({ message: "Order not found" });
      if (order.vendorId !== req.user.id) {
        return res.status(403).send({ message: "This order does not belong to you" });
      }
      if (order.status !== "pending") {
        return res.status(400).send({ message: "Only pending orders can be updated" });
      }

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id), status: "pending" },
        { $set: { status: newStatus } }
      );
      if (result.modifiedCount === 0) {
        return res.status(409).send({ message: "Order was already updated" });
      }
      res.send({ message: `Order ${newStatus}` });
    } catch (error) {
      res.status(500).send({ message: "Failed to update order" });
    }
  };

  router.patch("/:id/accept", changeStatus("accepted"));
  router.patch("/:id/reject", changeStatus("rejected"));

  return router;
};