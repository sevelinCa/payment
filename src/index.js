const express = require('express')
const checkoutRoute = require('./routes/payment')
const app = express()
const bodyParser = require("body-parser")

app.use(bodyParser.raw())
app.use(express.raw())
app.use(express.json())

app.use("/", checkoutRoute)



app.listen(8080,()=>{
    console.log("Server is running on port 8080")
})