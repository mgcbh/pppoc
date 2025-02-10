import { createSlice } from "@reduxjs/toolkit";

export const slice = createSlice({
  name: "payment",
  initialState: {
    error: "",
    session: null,
    orderRef: null,
    paymentDataStoreRes: null,
    config: {
      // storePaymentMethod: true,
      // paymentMethodsConfiguration: {
      //   ideal: {
      //     showImage: true,
      //   },
      //   card: {
      //     hasHolderName: true,
      //     holderNameRequired: true,
      //     name: "Credit or debit card",
      //     amount: {
      //       value: 10000, // 100€ in minor units
      //       currency: "EUR",
      //     },
      //   },
      // },
      countryCode: "US", // Need to confirm
      locale: "en_US",
      showPayButton: false,
      clientKey: process.env.REACT_APP_ADYEN_CLIENT_KEY,
      environment: "test",
      // override Security Code label
      translations: {
        'en-US': {
          'creditCard.securityCode.label': 'CVV/CVC'
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
        [state.paymentMethods] = res;
      }
    },
    clearPaymentSession: (state) => {
      state.error = "";
      state.session = null;
      state.orderRef = null;
    },
    paymentDataStore: (state, action) => {
      const [res, status] = action.payload;
      if (status >= 300) {
        state.error = res;
      } else {
        state.paymentDataStoreRes = res;
      }
    },
  },
});

export const { paymentSession, clearPaymentSession, paymentDataStore, paymentMethods } = slice.actions;

export const initiateCheckout = (type) => async (dispatch) => {
  try {
    const paymentMethodsResponse = await fetch('/api/paymentMethods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(response => response.json());
    
    dispatch(paymentMethods(paymentMethodsResponse, paymentMethodsResponse.status));
  } catch (error) {
    console.error(error);
    alert("Error occurred. Look at console for details");
  }
};

export const savePaymentData = (data, callback) => async (dispatch) => {
  try {
    const response = await fetch('/api/savePaymentData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).then(response => response.json());
    
    if (response.ok) {
      callback();
    } else {
      throw new Error("Something went wrong when saving payment data.")
    }
  } catch (error) {
    console.error(error);
  }
}

export const getPaymentDataStore = () => async (dispatch) => {
  const response = await fetch("/api/getPaymentDataStore");
  dispatch(paymentDataStore([await response.json(), response.status]));
};

export const cancelOrRefundPayment = (orderRef) => async (dispatch) => {
  await fetch(`/api/cancelOrRefundPayment?orderRef=${orderRef}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  dispatch(getPaymentDataStore());
};

export default slice.reducer;
