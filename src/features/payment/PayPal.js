import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, PayPal } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";
import { getRedirectUrl } from "../../util/redirect";

export const PayPalContainer = () => {
  return (
    <div id="payment-page">
      <div className="container">
        <Checkout />
      </div>
    </div>
  );
}

const Checkout = () => {
  const dispatch = useDispatch();
  const payment = useSelector(state => state.payment);
  const navigate = useNavigate();
  const amountRef = useRef(null);
  const paymentsAmountRef = useRef(null);
  const payPalRef = useRef(null);
  const paymentContainer = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [messageResponse, setMessageResponse] = useState('');
  const [jsonResponse, setJsonResponse] = useState({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch])

  useEffect(() => {
    const { error } = payment;

    if (error) {
      navigate(`/status/error?reason=${error}`, { replace: true });
    }
  }, [payment, navigate])

  useEffect(() => {
    console.log('in useffect')
    const { config, paymentMethods } = payment;
    let ignore = false;

    if (!paymentMethods || !paymentContainer.current || !initialized) {
      // initiateCheckout is not finished yet.
      return;
    }

    const createCheckout = async () => {
      const checkout = await AdyenCheckout({
        ...config,
        paymentMethodsResponse: paymentMethods,
        showPayButton: true,
        amount: {
          value: parseInt(amountRef.current.value),
          currency: "USD"
        },

        onAdditionalDetails: async (state, component, actions) => {
          console.log('in onAdditionalDetails');
          console.log(state)
          try {
            // Make a POST /payments/details request from your server.
            const result = await fetch("/api/payments/details", {
              method: "POST",
              body: state.data ? JSON.stringify({
                ...state.data,
              }) : "",
              headers: {
                "Content-Type": "application/json",
              }
            }).then(response => response.json());

            // If the /payments/details request from your server fails, or if an unexpected error occurs.
            if (!result.resultCode) {
              actions.reject();
              return;
            }

            const {
              resultCode,
              action,
              order,
              donationToken
            } = result;

            // If the /payments/details request request form your server is successful, you must call this to resolve whichever of the listed objects are available.
            // You must call this, even if the result of the payment is unsuccessful.
            actions.resolve({
              resultCode,
              action,
              order,
              donationToken,
            });
          } catch (error) {
            console.error("onAdditionalDetails", error);
            actions.reject();
          }
        },


        onSubmit: async (state, component, actions) => {
          console.info("onSubmit", state, component, actions);
          console.log("value: ", parseInt(amountRef.current.value))
          try {
            if (state.isValid) {
              const response = await fetch("/api/payments", {
                method: "POST",
                body: state.data ? JSON.stringify({
                  ...state.data,
                  amount: parseInt(amountRef.current.value)
                }) : "",
                headers: {
                  "Content-Type": "application/json",
                }
              }).then(response => response.json());

              const { action, order, resultCode } = response;

              setMessageResponse('Response from the call to the /payments API:')
              setJsonResponse(response);

              if (!resultCode) {
                console.warn("reject");
                actions.reject();
              }

              actions.resolve({
                resultCode,
                action,
                order
              });
            }
          } catch (error) {
            console.error(error);
            actions.reject();
          }
        },
        onPaymentCompleted: (result, component) => {
          console.info("onPaymentCompleted", result, component);
          navigate(getRedirectUrl(result.resultCode), { replace: true });
        },
        onPaymentFailed: (result, component) => {
          console.info("onPaymentFailed", result, component);
          // navigate(getRedirectUrl(result.resultCode), { replace: true });
        },
        onError: (error, component) => {
          console.error("onError", error.name, error.message, error.stack, component);
          // navigate(`/status/error?reason=${error.message}`, { replace: true });
        },
      })

      console.log('checkout: ', checkout)

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        if (payPalRef.current === null) {
          const payPalConfiguration = {
            // intent: "authorize",
            environment: 'test',
            countryCode: "US",
          }

          payPalRef.current = new PayPal(checkout, payPalConfiguration);

          console.log('mounting')
          payPalRef.current.mount(paymentContainer.current);

          // payPalRef.current
          //   .isAvailable()
          //   .then(() => {
          //     // Mount the PayPal component.

          //   })
          //   .catch(error => {
          //     setErrorMsg(error.toString());
          //     console.log('PayPas is not available: ', error)
          //   });
        }
      }
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment, navigate, initialized])

  return (
    <div>
      <p className="red">WORK IN PROGRESS</p>

      <div className="form-group">
        <label>Amount to send to PayPal and the /payments API:</label>
        <input className="form-control" type="number" ref={amountRef} defaultValue={100} />
      </div>


      {/* <div className="form-group">
        <label>Amount to send to /payments API:</label>
        <input className="form-control" type="number" ref={paymentsAmountRef} defaultValue={100} />
      </div> */}

      {/* <p>The two amount above need to match in order for the payment to succeed. Note that "100" equals "$1.00".</p> */}

      <div className="my-3">
        <button onClick={() => setInitialized(true)} className="button">Click to initialize PayPal after entering amount.</button>
      </div>

      {initialized &&
        <div className="payment-container mb-5">
          <div ref={paymentContainer} className="payment"></div>
          {errorMsg && (
            <div className="p-4">
              <p>PayPal could not be enabled.</p>
              <p>Error message: {errorMsg}</p>
            </div>
          )}
        </div>
      }

      <div className="mb-3">
        {(messageResponse && jsonResponse) && (
          <Messages message={messageResponse} json={jsonResponse} />
        )}
      </div>
    </div>
  );
}
