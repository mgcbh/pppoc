import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, PayPal } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

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
  const checkout = useRef(null);
  const paymentsAmountRef = useRef(null);
  const payPalRef = useRef(null);
  const paymentContainer = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitmessage, setSubmitMessage] = useState('');
  const [submitJson, setSubmitJson] = useState({});
  const [detailsMessage, setDetailsMessage] = useState('');
  const [detailsJson, setDetailsJson] = useState({});
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [intent, setIntent] = useState('capture');
  const [complete, setComplete] = useState(false);

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
    const { config, paymentMethods } = payment;

    // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
    // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
    let ignore = false;

    if (!paymentMethods) {
      // initiateCheckout is not finished yet.
      return;
    }

    const createCheckout = async () => {
      checkout.current = await AdyenCheckout({
        ...config,
        paymentMethodsResponse: paymentMethods,
        showPayButton: true,
        onSubmit: async (state, component, actions) => {
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

              setSubmitMessage('Response from the call to the /payments API:')
              setSubmitJson(response);

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
        onAdditionalDetails: async (state, component, actions) => {
          try {
            // Make a POST /payments/details request from your server.
            const response = await fetch("/api/payments/details", {
              method: "POST",
              body: state.data ? JSON.stringify({
                ...state.data,
              }) : "",
              headers: {
                "Content-Type": "application/json",
              }
            }).then(response => response.json());

            setDetailsMessage('Response from the call to the /payments/details API:')
            setDetailsJson(response);

            // If the /payments/details request from your server fails, or if an unexpected error occurs.
            if (!response.resultCode) {
              actions.reject();
              return;
            }

            const {
              resultCode,
              action,
              order,
              donationToken
            } = response;

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
        onPaymentCompleted: (result, component) => {
          console.info("onPaymentCompleted", result, component);
          component.unmount();
          setComplete(true);
          // navigate(getRedirectUrl(result.resultCode), { replace: true });
        },
        onPaymentFailed: (result, component) => {
          console.info("onPaymentFailed", result, component);
          // navigate(getRedirectUrl(result.resultCode), { replace: true });
        },
        onError: (error, component) => {
          console.error("onError", error.name, error.message, error.stack, component);
          setErrorMsg(error.message);
          // navigate(`/status/error?reason=${error.message}`, { replace: true });
        },
      })

      setReady(true);
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment, navigate, setReady])

  const createComponent = () => {
    if (paymentContainer.current && checkout.current) {
      if (payPalRef.current === null) {
        const payPalConfiguration = {
          intent: intent,
          environment: 'test',
          countryCode: "US",
          amount: {
            value: parseInt(amountRef.current.value),
            currency: "USD"
          },
        }

        payPalRef.current = new PayPal(checkout.current, payPalConfiguration);
        payPalRef.current.mount(paymentContainer.current);
        setInitialized(true);
      }
    }
  }

  const resetComponent = () => {
    payPalRef.current.unmount();
    payPalRef.current = null;
    setInitialized(false);
    setSubmitJson({});
    setSubmitMessage('');
    setDetailsJson({});
    setDetailsMessage('');
    setComplete(false);
    setErrorMsg('');
  }

  return (
    <div className="mw-100">
      <div className="form-group">
        <label>Amount:</label>
        <input disabled={initialized} className="form-control" type="number" ref={amountRef} defaultValue={100} />
      </div>

      <div className="form-group">
        <label>Set the intent:</label>
        <select disabled={initialized} className="form-control" onChange={(event) => setIntent(event.target.value)}>
          <option value="capture">capture</option>
          <option value="authorize">authorize</option>
          <option value="subscription">subscription</option>
          <option value="tokenize">tokenize</option>
        </select>
      </div>

      {ready && !initialized &&
        <div className="my-3">
          <button onClick={createComponent} className="button">Initialize component</button>
        </div>
      }

      <div className={`${initialized ? 'payment-container mb-5' : 'test'}`}>
        <div ref={paymentContainer} className="payment" />
        {complete && <p className="px-3 my-0">Processing complete.</p>}
        {errorMsg && (
          <div className="p-4">
            <p>PayPal could not be enabled.</p>
            <p>Error message: {errorMsg}</p>
          </div>
        )}
      </div>

      {(submitmessage && submitJson) && (
        <div className="mb-3">
          <Messages message={submitmessage} json={submitJson} />
        </div>
      )}

      {(detailsMessage && detailsJson) && (
        <div className="mb-3">
          <Messages message={detailsMessage} json={detailsJson} />
        </div>
      )}

      {initialized &&
        <div className="my-3">
          <button onClick={resetComponent} className="button">Reset component</button>
        </div>
      }
    </div>
  );
}
