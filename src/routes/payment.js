const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const bodyParser = require('body-parser');

const router = express.Router();

router.get("/success", (req, res) => {
    res.send("Successfully");
});
router.get("/cancel", (req, res) => {
    res.send("canceled");
});

router.post("/checkout", async (req, res) => {
  try {
    const { cartData } = req.body;
    let line_items = [];
    cartData.map((item) => {
        line_items.push({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name,
                    images: [item.image]
                },
                unit_amount: item.price
            },
            quantity: item.quantity,
            metadata: {
              vendorId: item.vendorId
            }
        });
    });
    const session = await stripe.checkout.sessions.create({
        line_items,
        mode: 'payment',
        success_url: 'https://payment-p5w9.onrender.com/success',
        cancel_url: 'https://payment-p5w9.onrender.com/cancel',
    });

    res.json({ sessionId: session.id });
    
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const event = request.body;

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Session completed: ', session);
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment Intent succeeded: ', paymentIntent);
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;

      console.log('Payment Method attached: ', paymentMethod);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  response.json({ received: true, webhookId: event.id });
});

module.exports = router;
