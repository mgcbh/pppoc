import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, PayPal } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

export const PayPalTwoStepContainer = () => {
  return (
    <div id="payment-page">
      <div className="container">
        <Checkout />
      </div>
    </div>
  );
};

const Checkout = () => {
  const dispatch = useDispatch();
  const payment = useSelector((state) => state.payment);
  const navigate = useNavigate();
  const amountRef = useRef(null);
  const checkout = useRef(null);
  const payPalRef = useRef(null);
  const paymentContainer = useRef(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitmessage, setSubmitMessage] = useState("");
  const [submitJson, setSubmitJson] = useState({});
  const [detailsMessage, setDetailsMessage] = useState("");
  const [detailsJson, setDetailsJson] = useState({});
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [capturedData, setCapturedData] = useState(false);

  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch]);

  useEffect(() => {
    const { error } = payment;

    if (error) {
      navigate(`/status/error?reason=${error}`, { replace: true });
    }
  }, [payment, navigate]);

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

        // This handler is required for PayPal and is called after the user has
        // clicked the PayPal button.
        onSubmit: async (state, component, actions) => {
          console.log("in onSubmit");
          try {
            if (state.isValid) {
              const response = await fetch("/api/payments", {
                method: "POST",
                body: state.data
                  ? JSON.stringify({
                      ...state.data,
                      amount: parseInt(amountRef.current.value),
                    })
                  : "",
                headers: {
                  "Content-Type": "application/json",
                },
              }).then((response) => response.json());

              const { action, order, resultCode } = response;

              setSubmitMessage(
                "Response from the call to the /payments API, which is called when the user first clicks the PayPal button:"
              );
              setSubmitJson(response);

              if (!resultCode) {
                console.warn("reject");
                actions.reject();
              }

              // This needs to be called in order to update the state of the
              // PayPal modal. If the .resolve method is not called, the PayPal
              // modal will just keep spinning.
              actions.resolve({
                resultCode,
                action,
                order,
              });
            }
          } catch (error) {
            console.error(error);
            actions.reject();
          }
        },

        // This handler is required for PayPal and is called after the user has
        // completed their purchase and dismissed the PayPal modal.
        onAdditionalDetails: async (state, component, actions) => {
          console.log("in onAdditionalDetails");

          // Store the payment data to use in the /payments/details request.
          sessionStorage.setItem("payPalData", JSON.stringify(state.data));

          setCapturedData(true);
          setDetailsMessage(
            `Upon clicking 'Complete Purchase' in the PayPal modal, the following 
             data is saved to storage and will be used to finalize the payment on 
             the review page:`
          );
          setDetailsJson(state.data);
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
      });

      setReady(true);
    };

    createCheckout();

    return () => {
      ignore = true;
    };
  }, [payment, navigate, setReady]);

  const createComponent = () => {
    if (paymentContainer.current && checkout.current) {
      if (payPalRef.current === null) {
        const payPalConfiguration = {
          environment: "test",
          countryCode: "US",
          amount: {
            value: parseInt(amountRef.current.value),
            currency: "USD",
          },
          userAction: 'continue'
        };

        payPalRef.current = new PayPal(checkout.current, payPalConfiguration);
        payPalRef.current.mount(paymentContainer.current);
        setInitialized(true);
      }
    }
  };

  const resetComponent = () => {
    payPalRef.current.unmount();
    payPalRef.current = null;
    setInitialized(false);
    setSubmitJson({});
    setSubmitMessage("");
    setDetailsJson({});
    setDetailsMessage("");
    setComplete(false);
    setErrorMsg("");
    setCapturedData(false);
    sessionStorage.removeItem("payPalData");
  };

  return (
    <div className="mw-100">
      <div className="mb-3">
        <h2>PayPal Two-Step Checkout</h2>
        <p>
          This page demonstrates a "two-step" PayPal checkout flow where the user signs into their PayPal account on the first page, and
          then the payment is actually finalized and submitted to Adyen on the second page.
        </p>
      </div>

      <div className="form-group">
        <label>Amount:</label>
        <input disabled={initialized} className="form-control" type="number" ref={amountRef} defaultValue={100} />
      </div>

      {ready && !initialized && (
        <div className="my-3">
          <button onClick={createComponent} className="button">
            Initialize PayPal Component
          </button>
        </div>
      )}

      <div className={`${initialized ? "payment-container mb-5" : "test"}`}>
        <div ref={paymentContainer} className="payment" />
        {complete && <p className="px-3 my-0">Processing complete.</p>}
        {errorMsg && (
          <div className="p-4">
            <p>PayPal could not be enabled.</p>
            <p>Error message: {errorMsg}</p>
          </div>
        )}
      </div>

      {submitmessage && submitJson && (
        <div className="mb-3">
          <Messages message={submitmessage} json={submitJson} />
        </div>
      )}

      {detailsMessage && detailsJson && (
        <div className="mb-3">
          <Messages message={detailsMessage} json={detailsJson} />
        </div>
      )}

      {capturedData && !complete && (
        <div className="my-3">
          <button
            onClick={() => {
              navigate("/review-paypal");
            }}
            className="button"
          >
            Proceed to Review
          </button>
        </div>
      )}

      {initialized && (
        <div className="my-3">
          <button onClick={resetComponent} className="button">
            Reset PayPal Component
          </button>
        </div>
      )}
    </div>
  );
};
