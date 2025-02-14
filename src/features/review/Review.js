import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";
import { getRedirectUrl } from "../../util/redirect";

export const ReviewContainer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const payment = useSelector(state => state.payment);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});
  const [resultMessage, setResultMessage] = useState('');
  const [resultJson, setResultJson] = useState({});
  const paymentContainer = useRef(null);
  const checkoutRef = useRef(null);

  // Initialize the checkout flow.
  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch])


  // DEV ONLY
  useEffect(() => {
    setMessage('The following will be submitted with the payment request:');
    setJson(JSON.parse(sessionStorage.getItem('cardData')))
  }, [])

  // Once the paymentMethods have been set, create the checkout instance.
  useEffect(() => {
    const { config, paymentMethods } = payment;
    let ignore = false;

    if (!paymentMethods || !paymentContainer.current) {
      // initiateCheckout is not finished yet.
      return;
    }

    // Create a new checkout object to be used in the event that we need to launch one of the actions
    // that require additional steps on the front-end.
    // See https://docs.adyen.com/online-payments/two-step-checkout/#implement-a-review-page
    const createCheckout = async () => {
      checkoutRef.current = await AdyenCheckout({
        ...config,
        paymentMethodsResponse: paymentMethods,
        showPayButton: false, // We implement our own pay button on the review page.

        // Used for the Native 3DS2 Authentication flow, see: https://docs.adyen.com/online-payments/3d-secure/native-3ds2/
        onAdditionalDetails: async (state, component, actions) => {
          //////////////////////////
          /////////// WIP //////////
          //////////////////////////

          console.info("onAdditionalDetails", state, component);
          try {
            const { resultCode } = await fetch("/api/payments/details", {
              method: "POST",
              body: state.data ? JSON.stringify(state.data) : "",
              headers: {
                "Content-Type": "application/json",
              }
            }).then(response => response.json());

            if (!resultCode) {
              console.warn("reject");
              actions.reject();
            }

            actions.resolve({ resultCode });
          } catch (error) {
            console.error(error);
            actions.reject();
          }
        },

        // This callback will only be called if/when there is an action such
        // as voucher or after addtional details are submitted via
        // onAdditionalDetails.
        onPaymentCompleted: (result, component) => {
          console.info(result, component);
        },

        // This callback will only be called if/when there is an action such
        // as voucher or after addtional details are submitted via
        // onAdditionalDetails and the payment fails.
        onPaymentFailed: (result, component) => {
          console.info(result, component);
        },

        // Called when there is any kind of error with the component.
        onError: (error, component) => {
          console.error(error.name, error.message, error.stack, component);
        }
      })
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment])

  // Handle a click on the Place Order button.
  const handlePlaceOrder = async () => {
    const cardData = sessionStorage.getItem('cardData');

    const response = await fetch("/api/placeorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: cardData
    }).then(response => response.json());

    setResultMessage('Response from place order:')
    setResultJson(response);

    const { action, resultCode, pspReference } = response;

    // Some payment methods require follow up action, such as redirecting
    // to another site for further action. This kicks off that process.
    // See https://docs.adyen.com/online-payments/two-step-checkout/#implement-a-review-page
    // and https://docs.adyen.com/online-payments/build-your-integration/advanced-flow/?platform=Web&integration=Components&version=6.5.1#additional-action
    if (action) {
      checkoutRef.current.createFromAction(action).mount(paymentContainer.current);
    } else {
      // No further action is required.
      // Look at the response and redirect the user based on the result code.
      setMessage('You will be redirected shortly.');
      setJson({});
      setTimeout(() => {
        navigate(getRedirectUrl(resultCode), { replace: true });
      }, 3000)
    }
  }

  return (
    <div id="review-page">
      <div className="container">
        <div className="mw-100">
          <h2>Review your purchase</h2>
          <p>
            This demonstrates sending a request to the backend to submit the payment to Adyen.
            Encrypted card details are retrieved from sessionStorage and sent in the body of
            the POST request to the backend.
          </p>
          <p>(order details here)</p>
          <button className="button" onClick={handlePlaceOrder}>
            Place Order
          </button>
          <div ref={paymentContainer}></div>
        </div>
        {message && json && <Messages message={message} json={json} />}
        {resultMessage && resultJson && <Messages message={resultMessage} json={resultJson} />}
      </div>
    </div>
  );
}