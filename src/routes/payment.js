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
    let vendorIds = [];
    let line_items = [];
    cartData.map((item) => {
        line_items.push({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name,
                    images: [item.image],
                },
                unit_amount: item.price,
            },
            quantity: item.quantity,
        });
        vendorIds.push(item.vendorId);
    });
    const session = await stripe.checkout.sessions.create({
        line_items,
        mode: 'payment',
        success_url: 'https://payment-p5w9.onrender.com/success',
        cancel_url: 'https://payment-p5w9.onrender.com/cancel',
        metadata: {
          vendorIds: JSON.stringify(vendorIds),
        },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Use express.raw() for the /webhook route to handle the raw body
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = "whsec_KUYyC7TzJgrNT3nAAk1SBFBTp1ALt1AX";

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Session completed: ', session);

      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const vendorIds = JSON.parse(session.metadata.vendorIds);
        
        lineItems.data.forEach((item, index) => {
          console.log(`Vendor ID: ${vendorIds[index]}`);
        });
      } catch (err) {
        console.error('Error retrieving line items:', err);
      }
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

  res.json({ received: true });
});

module.exports = router;
