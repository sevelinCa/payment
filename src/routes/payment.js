const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const stripe = require('stripe')(process.env.STRIPE_SECRET);

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
        cartData.forEach((item) => {
            line_items.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: item.name,
                        images: [item.image],
                    },
                    unit_amount: item.price * 100, // Ensure the price is in cents
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
            const session = event.data.object

            try {
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
                const vendorIds = JSON.parse(session.metadata.vendorIds);

                await Promise.all(lineItems.data.map(async (item, index) => {
                    const vendorId = vendorIds[index];
                    const vendor = await getVendorById(vendorId); // Function to retrieve vendor from database
                    
                    if (!vendor) {
                        throw new Error(`Vendor not found: ${vendorId}`);
                    }
                    
                    const amount = item.amount_subtotal;
                    const stripeAccountId = vendor.stripeAccountId;

                    // Validate Stripe Account ID
                    const account = await stripe.accounts.retrieve(stripeAccountId);
                    if (!account || account.error) {
                        throw new Error(`Invalid Stripe account ID: ${stripeAccountId}`);
                    }

                    // Log Stripe account details
                    console.log(`Stripe account details for ${vendorId}:`, account);

                    // Transfer funds to vendor's Stripe account
                    const transfer = await stripe.transfers.create({
                        amount: amount,
                        currency: 'usd',
                        destination: stripeAccountId,
                    });

                    console.log(`Transfer successful for vendor ${vendorId}:`, transfer);
                }));

            } catch (err) {
                console.error('Error processing session completed event:', err);
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

// Function to retrieve vendor from database (mock implementation)
async function getVendorById(vendorId) {
    // Replace this with actual database retrieval logic
    const vendorTable = {
        "vendor1": { stripeAccountId: "acct_1PQErBGpB2eokSXX" },
        "vendor2": { stripeAccountId: "acct_1Hh3gF2eZvKYlo2D" },
        // Add more vendors as needed
    };

    return vendorTable[vendorId];
}
