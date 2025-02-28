import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, ApplePay } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";
// import { getRedirectUrl } from "../../util/redirect";

export const ApplePayContainer = () => {
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
  const applePayRef = useRef(null);
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
        onSubmit: async (state, component, actions) => {
          console.info("onSubmit", state, component, actions);
          try {
            if (state.isValid) {
              const response = await fetch("/api/payments", {
                method: "POST",
                body: state.data ? JSON.stringify({
                  ...state.data,
                  amount: parseInt(paymentsAmountRef.current.value)
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
          // navigate(getRedirectUrl(result.resultCode), { replace: true });
        },
        onPaymentFailed: (result, component) => {
          console.info("onPaymentFailed", result, component);
          // navigate(getRedirectUrl(result.resultCode), { replace: true });
        },
        onError: (error, component) => {
          console.error("onError", error.name, error.message, error.stack, component);
          navigate(`/status/error?reason=${error.message}`, { replace: true });
        },
      })

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        if (applePayRef.current === null) {
          const applePayConfiguration = {
            amount: {
              value: parseInt(amountRef.current.value),
              currency: "USD"
            },
            countryCode: "US",
            // Apple Pay component events.
            // See https://docs.adyen.com/payment-methods/apple-pay/web-component/?tab=advanced-requirements_2#ap-events
            // onClick: (resolve, reject) => {
            //   console.info('onClick called');
            //   resolve();
            // },
            // onValidateMerchant: (event) => {
            //   console.info('onValidateMerchant called', event)
            // },
            // onPaymentAuthorized: (event) => {
            //   console.info('onPaymentAuthorized called', event)
            // },
            // onPaymentMethodSelected: (event) => {
            //   console.info('onPaymentMethodSelected called', event)
            // },
            // Methods below require isExpress = true.
            // onShippingContactSelected: (event) => {
            //   console.info('onShippingContactSelected called', event)
            // },
            // onShippingMethodSelected: (event) => {
            //   console.info('onShippingMethodSelected called', event)
            // }
          }

          applePayRef.current = new ApplePay(checkout, applePayConfiguration);

          applePayRef.current
            .isAvailable()
            .then(() => {
              // Mount the Apple Pay component.
              applePayRef.current.mount(paymentContainer.current);
            })
            .catch(error => {
              setErrorMsg(error.toString());
              console.log('Apple Pay is not available: ', error)
            });
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
        <label>Amount to send to Apple Pay:</label>
        <input className="form-control" type="number" ref={amountRef} defaultValue={100} />
      </div>

      <div className="form-group">
        <label>Amount to send to /payments API:</label>
        <input className="form-control" type="number" ref={paymentsAmountRef} defaultValue={100} />
      </div>

      <p>The two amount above need to match in order for the payment to succeed. Note that "100" equals "$1.00".</p>

      <div className="my-3">
        <button onClick={() => setInitialized(true)} className="button">Click to initialize ApplePay after entering amounts.</button>
      </div>

      {initialized &&
        <div className="payment-container mb-5">
          <div ref={paymentContainer} className="payment"></div>
          {errorMsg && (
            <div className="p-4">
              <p>Apple Pay could not be enabled.</p>
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
