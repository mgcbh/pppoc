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
  const [submitted, setSubmitted] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultJson, setResultJson] = useState({});
  const paymentContainer = useRef(null);
  const checkoutRef = useRef(null);
  const resultCodeRef = useRef(null);

  const cardData = sessionStorage.getItem('cardData');
  const cardDataTwo = sessionStorage.getItem('cardDataTwo');

  // Redirect the user after receiving a response from the back end.
  const handleRedirect = () => {
    navigate(getRedirectUrl(resultCodeRef.current), { replace: true });
  }

  // Initialize the checkout flow.
  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch])

  // DEV ONLY
  useEffect(() => {
    setMessage('The following card data will be submitted with the payment request:');
    setJson({
      cardOne: JSON.parse(cardData),
      cardTwo: JSON.parse(cardDataTwo)
    })
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
    const response = await fetch("/api/placeorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: cardData
    }).then(response => response.json());

    setResultMessage('Adyen payment response is below.')
    setResultJson(response);
    setSubmitted(true);
    sessionStorage.removeItem('cardData');

    const { action, resultCode, pspReference } = response;
    resultCodeRef.current = resultCode;

    // Some payment methods require follow up action, such as redirecting
    // to another site for further action. This kicks off that process.
    // See https://docs.adyen.com/online-payments/two-step-checkout/#implement-a-review-page
    // and https://docs.adyen.com/online-payments/build-your-integration/advanced-flow/?platform=Web&integration=Components&version=6.5.1#additional-action
    if (action) {
      setTimeout(() => {
        checkoutRef.current.createFromAction(action).mount(paymentContainer.current);
      }, 5000);
    } else {
      // No further action is required other than to
      // look at the response and redirect the user based on the result code.
      // Commenting out so that we can do it manually instead for POC purposes.
      // handleRedirect();
    }
  }

  // Handle a click on the Place Order button when there are two payment cards.
  const handlePlaceOrderTwoCards = async () => {
    const response = await fetch("/api/placeorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: cardData
    }).then(response => response.json());

    const responseTwo = await fetch("/api/placeorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: cardDataTwo
    }).then(response => response.json());

    setResultMessage('The placeorder endpoint was called twice. Adyen payment responses are below.')
    setResultJson({
      responseOne: response,
      responseTwo: responseTwo
    });
    setSubmitted(true);
    sessionStorage.removeItem('cardData');
    sessionStorage.removeItem('cardDataTwo');

    // Skip handling actions and redirecting to a result page in this case for POC.
    // ...
  }

  return (
    <div id="review-page">
      <div className="container">
        <div className="mw-100">
          <h2>Review Your Purchase</h2>
          <p>
            This demonstrates sending a request to the backend to submit the payment to Adyen.
            Encrypted card details are retrieved from sessionStorage and sent in the body of
            the POST request to the backend.
          </p>

          {message && json && <Messages message={message} json={json} />}
          {resultMessage && resultJson && <Messages message={resultMessage} json={resultJson} />}

          {!cardDataTwo &&
            <button className="button" onClick={submitted ? handleRedirect : handlePlaceOrder}>
              {!submitted && (<>Place Order</>)}
              {submitted && <>Order Placed<br />(click again to proceed)</>}
            </button>
          }

          {cardDataTwo &&
            <button className="button" onClick={submitted ? null : handlePlaceOrderTwoCards}>
              {!submitted && (<>Place Order for Two Cards</>)}
              {submitted && <>Order Placed</>}
            </button>
          }
          <div ref={paymentContainer}></div>
        </div>
      </div>
    </div>
  );
}
