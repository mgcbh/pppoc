import { createSlice } from "@reduxjs/toolkit";

export const slice = createSlice({
  name: "payment",
  initialState: {
    paymentMethods: null,
    error: "",
    session: null,
    orderRef: null,
    config: {
      paymentMethodsResponse: {},
      clientKey: process.env.REACT_APP_ADYEN_CLIENT_KEY,
      locale: "en_US",
      countryCode: "US", // Need to get from back end?
      environment: "test",
      showPayButton: true,
      amount: {
        value: 1000,
        currency: 'USD'
      },
      // Override field labels
      translations: {
        'en-US': {
          'creditCard.securityCode.label': 'CVC / CVV',
          'creditCard.cardNumber.label': 'Card Number',
          'creditCard.expiryDate.label': 'Expiry MM/YY',
          // Hide help text.
          'creditCard.expiryDate.contextualText': '',
          'creditCard.securityCode.contextualText.3digits': '',
          'creditCard.securityCode.contextualText.4digits': '',
        }
      },
    },
  },
  reducers: {
    paymentSession: (state, action) => {
      const [res, status] = action.payload;
      if (status >= 300) {
        state.error = res;
      } else {
        [state.session, state.orderRef] = res;
      }
    },
    paymentMethods: (state, action) => {
      const [res, status] = action.payload;
      if (status >= 300) {
        state.error = res;
      } else {
        state.paymentMethods = res;
      }
    },
    clearPaymentSession: (state) => {
      state.error = "";
      state.session = null;
      state.orderRef = null;
      state.paymentMethods = null;
    },
  },
});

export const { paymentSession,
  clearPaymentSession,
  paymentMethods } = slice.actions;

export const initiateCheckout = (type) => async (dispatch) => {
  try {
    const paymentMethodsResponse = await fetch('/api/paymentMethods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(response => response.json());

    dispatch(paymentMethods([paymentMethodsResponse, paymentMethodsResponse.status]));
  } catch (error) {
    console.error(error);
    alert("Error occurred. Look at console for details");
  }
};

export const savePaymentData = (data, callback) => async (dispatch) => {
  try {
    //// WIP
    // const response = await fetch('/api/savePaymentData', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data)
    // }).then(response => response.json());

    // if (response.ok) {
    //   callback();
    // } else {
    //   throw new Error("Something went wrong when saving payment data.")
    // }
    console.log('saved data');
    callback();
  } catch (error) {
    console.error(error);
  }
}

export default slice.reducer;
