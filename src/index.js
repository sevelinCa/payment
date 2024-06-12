const express = require('express');
const checkoutRoute = require('./routes/payment');
const app = express();
const bodyParser = require("body-parser");

app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use("/", checkoutRoute);

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
