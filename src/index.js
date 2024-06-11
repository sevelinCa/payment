const express = require('express')
const checkoutRoute = require('./routes/payment')
const app = express()

app.use(express.json())

app.use("/", checkoutRoute)



app.listen(8080,()=>{
    console.log("Server is running on port 8080")
})