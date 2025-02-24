const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { uuid } = require("uuidv4");
const { Client, Config, CheckoutAPI, hmacValidator } = require("@adyen/api-library");
// init app
const app = express();
// setup request logging
app.use(morgan("dev"));
// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
// Serve client from build folder
app.use(express.static(path.join(__dirname, "build")));

// enables environment variables by
// parsing the .env file and assigning it to process.env
dotenv.config({
  path: "./.env",
});

// Adyen Node.js API library boilerplate (configuration, etc.)
const config = new Config();
config.apiKey = process.env.ADYEN_API_KEY;
const client = new Client({ config });
client.setEnvironment("TEST");
const checkout = new CheckoutAPI(client);
const validator = new hmacValidator();

// in memory store for transaction
const paymentStore = {};

const determineHostUrl = (req) => {
  let {
    "x-forwarded-proto": forwardedProto,
    "x-forwarded-host": forwardedHost,
  } = req.headers

  if (forwardedProto && forwardedHost) {
    if (forwardedProto.includes(",")) {
      [forwardedProto,] = forwardedProto.split(",")
    }

    return `${forwardedProto}://${forwardedHost}`
  }

  return "http://localhost:8080"
}

/* ################# API ENDPOINTS ###################### */

// Receive webhook notifications
app.post("/api/webhooks/notifications", async (req, res) => {

  // get notificationItems from body
  const notificationRequestItems = req.body.notificationItems;

  // fetch first (and only) NotificationRequestItem
  const notificationRequestItem = notificationRequestItems[0].NotificationRequestItem;
  console.log(notificationRequestItem);

  if (!validator.validateHMAC(notificationRequestItem, process.env.ADYEN_HMAC_KEY)) {
    // invalid hmac: webhook cannot be accepted
    res.status(401).send('Invalid HMAC signature');
    return;
  }

  // valid hmac: process event
  if (notificationRequestItem.success === "true") {
    // Process the webhook based on the eventCode
    if (notificationRequestItem.eventCode === "AUTHORISATION") {
      const payment = paymentStore[notificationRequestItem.merchantReference];
      if(payment){
        payment.status = "Authorised";
        payment.paymentRef = notificationRequestItem.pspReference;
      }
    }
    else if (notificationRequestItem.eventCode === "CANCEL_OR_REFUND") {
      const payment = findPayment(notificationRequestItem.pspReference);
      if(payment) {
        console.log("Payment found: ", JSON.stringify(payment));
        // update with additionalData.modification.action
        if (
          "modification.action" in notificationRequestItem.additionalData &&
          "refund" === notificationRequestItem.additionalData["modification.action"]
        ) {
          payment.status = "Refunded";
        } else {
          payment.status = "Cancelled";
        }
      }
    }
    else {
      console.info("skipping non actionable webhook");
    }
  }

  // acknowledge event has been consumed
  res.status(202).send(); // Send a 202 response with an empty body

});

// Get payment methods
app.post("/api/paymentMethods", async (req, res) => {
  try {
    const response = await checkout.PaymentsApi.paymentMethods({
      channel: "Web",
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      shopperReference: 'pocShopper' // HARD CODED USER FOR TESTING
    });
    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

app.post("/api/savePaymentData", async (req, res) => {
  console.log('Saved payment data!');
  res.json({result: 'success'});
});

// submitting a payment
app.post("/api/payments", async (req, res) => {
  console.log('req body: ', req.body)
  const currency = findCurrency(req.body.paymentMethod.type);
  // find shopper IP from request
  const shopperIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  try {
    // unique ref for the transaction
    const orderRef = uuid();
    // allows for gitpod support
    const localhost = req.get('host');
    // const isHttps = req.connection.encrypted;
    const protocol = req.socket.encrypted? 'https' : 'http';
    // ideally the data passed here should be computed based on business logic
    const response = await checkout.PaymentsApi.payments({
      amount: { currency, value: req.body.amount ? req.body.amount :  1000 },
      reference: orderRef, // required
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, // required
      channel: "Web", // required
      origin: `${protocol}://${localhost}`, // required for 3ds2 native flow
      browserInfo: req.body.browserInfo, // required for 3ds2
      shopperIP, // required by some issuers for 3ds2
      authenticationData: {
        attemptAuthentication: "always",
        // add the following line for Native 3DS2 > see also 3ds2-example folder
        //threeDSRequestData: {
        //  nativeThreeDS: "preferred"
        //}
      },
      returnUrl: `${protocol}://${localhost}/redirect?orderRef=${orderRef}`, // required for 3ds2 redirect flow
      paymentMethod : req.body.paymentMethod,
      // we strongly recommend that you the billingAddress in your request.
      // card schemes require this for channel web, iOS, and Android implementations.
      billingAddress:
        typeof req.body.billingAddress === "undefined" || Object.keys(req.body.billingAddress).length === 0
          ? null
          : req.body.billingAddress,
      deliveryDate: new Date("2017-07-17T13:42:40.428+01:00"),
      shopperStatement: "Aceitar o pagamento até 15 dias após o vencimento.Não cobrar juros. Não aceitar o pagamento com cheque",
      // below fields are required for Klarna, line items included
      countryCode: req.body.paymentMethod.type.includes("klarna") ? "DE" : null,
      shopperReference: "12345",
      shopperEmail: "youremail@email.com",
      shopperLocale: "en_US",
      lineItems: [
        {quantity: 1, amountIncludingTax: 5000 , description: "Sunglasses"},
        {quantity: 1, amountIncludingTax: 5000 , description: "Headphones"}
      ],
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

app.post("/api/placeorder", async (req, res) => {
  const currency = 'USD';
  // find shopper IP from request
  const shopperIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  try {
    // unique ref for the transaction
    const orderRef = uuid();
    // allows for gitpod support
    const localhost = req.get('host');
    // const isHttps = req.connection.encrypted;
    const protocol = req.socket.encrypted? 'https' : 'http';
    // ideally the data passed here should be computed based on business logic
    const response = await checkout.PaymentsApi.payments({
      amount: { currency, value: req.body.amount ? req.body.amount :  1000 },
      reference: orderRef, // required
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, // required
      channel: "Web", // required
      origin: `${protocol}://${localhost}`, // required for 3ds2 native flow
      browserInfo: req.body.browserInfo, // required for 3ds2
      shopperIP, // required by some issuers for 3ds2
      authenticationData: {
        attemptAuthentication: "always",
        // add the following line for Native 3DS2 > see also 3ds2-example folder
        //threeDSRequestData: {
        //  nativeThreeDS: "preferred"
        //}
      },
      returnUrl: `${protocol}://${localhost}/redirect?orderRef=${orderRef}`, // required for 3ds2 redirect flow
      paymentMethod: req.body.paymentMethod,
      storePaymentMethod: req.body.storePaymentMethod,
      recurringProcessingModel: req.body.recurringProcessingModel,
      // we strongly recommend that you the billingAddress in your request.
      // card schemes require this for channel web, iOS, and Android implementations.
      // billingAddress:
      //   typeof req.body.billingAddress === "undefined" || Object.keys(req.body.billingAddress).length === 0
      //     ? null
      //     : req.body.billingAddress,
      deliveryDate: new Date("2017-07-17T13:42:40.428+01:00"),
      shopperStatement: "Aceitar o pagamento até 15 dias após o vencimento.Não cobrar juros. Não aceitar o pagamento com cheque",
      // below fields are required for Klarna, line items included
      countryCode: null,
      shopperInteraction: req.body.shopperInteraction,
      shopperReference: req.body.shopperReference ? req.body.shopperReference : '12345',
      shopperEmail: "youremail@email.com",
      shopperLocale: "en_US",
      lineItems: [
        {quantity: 1, amountIncludingTax: 5000 , description: "Sunglasses"},
        {quantity: 1, amountIncludingTax: 5000 , description: "Headphones"}
      ],
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

// Check gift card balance
app.post("/api/paymentMethods/balance", async (req, res) => {
  try {
    // unique ref for the transaction
    const orderRef = uuid();

    const response = await checkout.OrdersApi.getBalanceOfGiftCard({
      amount: { currency: 'USD', value: 135 },
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, // required
      paymentMethod : req.body.paymentMethod,
      reference: orderRef, // required
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

app.post("/api/payments/details", async (req, res) => {
  // Create the payload for submitting payment details
  const payload = {
    details: req.body.details,
    paymentData: req.body.paymentData,
  };

  try {
    // Return the response back to client
    // (for further action handling or presenting result to shopper)
    const response = await checkout.PaymentsApi.paymentsDetails(payload);

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

/* ################# end API ENDPOINTS ###################### */

/* ################# CLIENT ENDPOINTS ###################### */

// Handles any requests that doesn't match the above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

/* ################# end CLIENT ENDPOINTS ###################### */

/* ################# UTILS ###################### */

function findPayment(pspReference) {
  const payments = Object.values(paymentStore).filter((v) => v.modificationRef === pspReference);
  if (payments.length < 0) {
    console.error("No payment found with that PSP reference");
  }
  return payments[0];
}

function findCurrency(type) {
  switch (type) {
    case "ach":
      return "USD";
    case "wechatpayqr":
    case "alipay":
      return "CNY";
    case "dotpay":
      return "PLN";
    case "boletobancario":
    case "boletobancario_santander":
      return "BRL";
    default:
      return "EUR";
  }
}

/* ################# end UTILS ###################### */

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
