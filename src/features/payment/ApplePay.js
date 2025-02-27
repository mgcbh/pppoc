import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, ApplePay } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import { getRedirectUrl } from "../../util/redirect";

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
  const paymentContainer = useRef(null);
  const applePayRef = useRef(null);
  const amountRef = useRef(null);

  const paymentContainerAlt = useRef(null);
  const applePayRefAlt = useRef(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [errorMsgAlt, setErrorMsgAlt] = useState('');

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

    if (!paymentMethods || !paymentContainer.current) {
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
              const { action, order, resultCode } = await fetch("/api/payments", {
                method: "POST",
                body: state.data ? JSON.stringify({
                  ...state.data,
                  amount: parseInt(amountRef.current.value)
                }) : "",
                headers: {
                  "Content-Type": "application/json",
                }
              }).then(response => response.json());

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
          navigate(getRedirectUrl(result.resultCode), { replace: true });
        },
        onError: (error, component) => {
          console.error("onError", error.name, error.message, error.stack, component);
          navigate(`/status/error?reason=${error.message}`, { replace: true });
        },
      })

      const checkoutAlt = await AdyenCheckout({
        ...config,
        paymentMethodsResponse: paymentMethods,
        showPayButton: true,
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
              value: 100,
              currency: "USD"
            },
            countryCode: "US"
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
          // applePayRef.current = new ApplePay(checkout);

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

      if (paymentContainerAlt.current && !ignore) {
        if (applePayRefAlt.current === null) {
          const applePayConfiguration = {
            amount: {
              value: 100,
              currency: "USD"
            },
            countryCode: "US"
          }

          applePayRefAlt.current = new ApplePay(checkoutAlt, applePayConfiguration);

          applePayRefAlt.current
            .isAvailable()
            .then(() => {
              // Mount the Apple Pay component.
              applePayRefAlt.current.mount(paymentContainerAlt.current);
            })
            .catch(error => {
              setErrorMsgAlt(error.toString());
              console.log('Apple Pay is not available: ', error)
            });
        }
      }

    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment, navigate])

  return (
    <div>
      <p className="red">WORK IN PROGRESS</p>
      <div className="form-group">
        <label>Amount</label>
        <input className="form-control" type="number" ref={amountRef} defaultValue={100} />
      </div>
      <div className="payment-container mb-5">
        <div ref={paymentContainer} className="payment"></div>
        {errorMsg && (
          <div className="p-4">
            <p>Apple Pay could not be enabled.</p>
            <p>Error message: {errorMsg}</p>
          </div>
        )}
      </div>
      <div className="payment-container mb-5">
        <div ref={paymentContainerAlt} className="payment"></div>
        {errorMsgAlt && (
          <div className="p-4">
            <p>Apple Pay could not be enabled.</p>
            <p>Error message: {errorMsgAlt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
