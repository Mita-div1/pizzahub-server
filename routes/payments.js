const express = require("express");
const Stripe = require("stripe");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyRole } = require("../middleware/auth");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = (usersCollection, transactionsCollection) => {
  const router = express.Router();

  router.post(
    "/create-checkout-session",
    verifyToken,
    verifyRole("vendor"),
    async (req, res) => {
      try {
        const vendor = await usersCollection.findOne({
          _id: new ObjectId(req.user.id),
        });
        if (!vendor || vendor.isBlocked) {
          return res.status(403).send({ message: "Account is blocked" });
        }

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: "PizzaHub Premium (30 days)" },
                unit_amount: 1000,
              },
              quantity: 1,
            },
          ],
          metadata: { vendorId: req.user.id },
          success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
        });

        res.send({ url: session.url });
      } catch (error) {
        res.status(500).send({ message: "Failed to create checkout session" });
      }
    }
  );

  return router;
};