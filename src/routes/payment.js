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

    res.json({ sessionId: session.id, url: session.url });
    
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.post('/webhook', bodyParser.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  const webhookSecret = "we_1PQQIVCVDF5HLoSR3iUhs9Wj";

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Log the session data to console
      console.log('Session completed: ', session);
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Log the payment intent data to console
      console.log('Payment Intent succeeded: ', paymentIntent);
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      // Log the payment method data to console
      console.log('Payment Method attached: ', paymentMethod);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({ received: true, webhookId: event.id });
});

module.exports = router;
