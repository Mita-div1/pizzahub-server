
const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyRole } = require("../middleware/auth");

module.exports = (
  usersCollection,
  menuItemsCollection,
  ordersCollection,
  transactionsCollection
) => {
  const router = express.Router();

  router.use(verifyToken, verifyRole("admin"));

  router.get("/stats", async (req, res) => {
    try {
      const [totalUsers, totalVendors, totalCustomers, totalMenuItems, pendingMenuItems, totalTransactions] =
        await Promise.all([
          usersCollection.countDocuments({ role: { $ne: "admin" } }),
          usersCollection.countDocuments({ role: "vendor" }),
          usersCollection.countDocuments({ role: "customer" }),
          menuItemsCollection.countDocuments(),
          menuItemsCollection.countDocuments({ status: "pending" }),
          transactionsCollection.countDocuments(),
        ]);
      res.send({
        totalUsers,
        totalVendors,
        totalCustomers,
        totalMenuItems,
        pendingMenuItems,
        totalTransactions,
      });
    } catch (error) {
      res.status(500).send({ message: "Failed to load stats" });
    }
  });

  router.get("/users", async (req, res) => {
    try {
      const { search, role } = req.query;
      const query = {};
      if (role && ["vendor", "customer", "admin"].includes(role)) {
        query.role = role;
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
      const users = await usersCollection.find(query).sort({ createdAt: -1 }).toArray();
      res.send(users);
    } catch (error) {
      res.status(500).send({ message: "Failed to load users" });
    }
  });

  const setBlocked = (value) => async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid user ID" });
      }
      if (id === req.user.id) {
        return res.status(400).send({ message: "You cannot block yourself" });
      }
      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).send({ message: "User not found" });
      if (user.role === "admin") {
        return res.status(403).send({ message: "Admin accounts cannot be blocked" });
      }
      await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { isBlocked: value } });
      res.send({ message: value ? "User blocked" : "User unblocked" });
    } catch (error) {
      res.status(500).send({ message: "Failed to update user" });
    }
  };

  router.patch("/users/:id/block", setBlocked(true));
  router.patch("/users/:id/unblock", setBlocked(false));

  router.get("/menu-items", async (req, res) => {
    try {
      const { search, status, category } = req.query;
      const query = {};
      if (status) query.status = status;
      if (category) query.category = category;
      if (search) query.itemName = { $regex: search, $options: "i" };
      const items = await menuItemsCollection.find(query).sort({ createdAt: -1 }).toArray();
      res.send(items);
    } catch (error) {
      res.status(500).send({ message: "Failed to load menu items" });
    }
  });

  router.patch("/menu-items/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid item ID" });
      }
      if (!["pending", "approved", "rejected", "inactive"].includes(status)) {
        return res.status(400).send({ message: "Invalid status" });
      }
      const result = await menuItemsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Item not found" });
      }
      res.send({ message: `Item marked as ${status}` });
    } catch (error) {
      res.status(500).send({ message: "Failed to update item" });
    }
  });

  router.delete("/menu-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid item ID" });
      }
      const result = await menuItemsCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Item not found" });
      }
      res.send({ message: "Item deleted" });
    } catch (error) {
      res.status(500).send({ message: "Failed to delete item" });
    }
  });

  router.get("/transactions", async (req, res) => {
    try {
      const transactions = await transactionsCollection
        .aggregate([
          {
            $lookup: {
              from: "user",
              let: { vid: "$vendorId" },
              pipeline: [
                { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$vid"] } } },
                { $project: { name: 1, email: 1, businessName: 1 } },
              ],
              as: "vendor",
            },
          },
          { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
          { $sort: { createdAt: -1 } },
        ])
        .toArray();
      res.send(transactions);
    } catch (error) {
      res.status(500).send({ message: "Failed to load transactions" });
    }
  });

  return router;
};