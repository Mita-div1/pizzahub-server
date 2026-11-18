
const express = require("express");
const Stripe = require("stripe");
const { ObjectId } = require("mongodb");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = (usersCollection, transactionsCollection) => {
  const router = express.Router();

  router.post(
    "/",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.headers["stripe-signature"],
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (error) {
        return res.status(400).send({ message: "Invalid webhook signature" });
      }

      try {
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;

          if (session.payment_status === "paid") {
            const vendorId = session.metadata.vendorId;

            const existing = await transactionsCollection.findOne({
              stripeSessionId: session.id,
            });

            if (!existing) {
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 30);

              await transactionsCollection.insertOne({
                vendorId,
                plan: "premium",
                amount: session.amount_total / 100,
                currency: session.currency,
                stripeSessionId: session.id,
                stripeSubscriptionId: session.subscription || null,
                status: "paid",
                createdAt: new Date(),
              });

              await usersCollection.updateOne(
                { _id: new ObjectId(vendorId) },
                {
                  $set: {
                    subscriptionPlan: "premium",
                    subscriptionExpiresAt: expiresAt,
                  },
                }
              );
            }
          }
        }

        res.send({ received: true });
      } catch (error) {
        res.status(500).send({ message: "Webhook handling failed" });
      }
    }
  );

  return router;
};