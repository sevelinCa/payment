const express = require('express')
const dotenv = require('dotenv')
dotenv.config()
const stripe = require('stripe')(process.env.STRIPE_SECRET)

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
            quantity: item.quantity
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



module.exports = router