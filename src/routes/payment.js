const express = require('express')
const dotenv = require('dotenv')
dotenv.config()
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const bodyParser = require('body-parser');

const router = express.Router()


router.get("/success", (req,res)=>{
    res.send("Successfully")
})
router.get("/cancel", (req,res)=>{
    res.send("canceled")
})

router.post("/checkout", async(req,res)=>{
  try {
    const {cartData} = req.body
    let line_items = []
    cartData.map((item)=>{
        line_items.push({
            price_data: {
                currency: "usd",
                product_data:{
                    name: item.name,
                    images:[item.image]
                },
                unit_amount: item.price
            },
            quantity: item.quantity,
            metadata: {
              vendorId: item.vendorId
            }
        })
    })
    const session = await stripe.checkout.sessions.create({
    line_items,
    mode: 'payment',
    success_url: 'http://localhost:8080/success',
    cancel_url: 'http://localhost:8080/cancel',
    })

    console.log(session)
    
  } catch (error) {
    res.json({error: error.message})
  }
})

router.post('/webhook',  bodyParser.raw({ type: 'application/json' }),async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await handleCheckoutSession(session);
  }

  res.status(200).end();
});

async function handleCheckoutSession(session) {
  const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items']
  });

  const lineItems = sessionWithLineItems.line_items.data;

  for (const lineItem of lineItems) {
    const vendorId = lineItem.metadata.vendorId;
    const amount = lineItem.amount_total;

    const vendorStripeAccountId = 'acct_1PPXCFBHjclwg5ou';

    if (!vendorStripeAccountId) {
      console.error(`No Stripe account ID found for vendor: ${vendorId}`);
      continue;
    }

    const adminFee = Math.round(amount * 0.05);
    const vendorAmount = amount - adminFee;

    try {
      await stripe.transfers.create({
        amount: vendorAmount,
        currency: 'usd',
        destination: vendorStripeAccountId,
        transfer_group: session.payment_intent,
      });

      console.log(`Transferred ${vendorAmount} to vendor ${vendorId} (${vendorStripeAccountId})`);
    } catch (error) {
      console.error(`Failed to transfer funds to vendor ${vendorId}:`, error);
    }
  }
}


module.exports = router