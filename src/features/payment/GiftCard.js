import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Giftcard } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import { getRedirectUrl } from "../../util/redirect";

export const GiftCardContainer = () => {
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
  const giftCardRef = useRef(null);

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

        // Is onSubmit needed for gift cards?
        onSubmit: async (state, component, actions) => {
          console.info("onSubmit", state, component, actions);
          try {
            if (state.isValid) {
              const { action, order, resultCode } = await fetch("/api/payments", {
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

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        const giftCardConfiguration = {
          onChange: (state, component) => {
            console.log('giftCard state:')
            console.log(state);
          },
          onBalanceCheck: (resolve, reject, data) => {
            console.log('onBalanceCheck: ', data)
            // Make a POST /paymentMethods/balance request
            // resolve(BalanceResponse);
          },
          onOrderRequest: (resolve, reject, data) => {
            console.log('onOrderRequest: ', data)
            // Make a POST /orders request
            // Create an order for the total transaction amount
            // resolve(OrderResponse);
          },
          onOrderCancel: (order) => {
            console.log('onOrderCancel: ', order)
            // Make a POST /orders/cancel request
            // Call the update function and pass the payment methods response to update the instance of checkout
            // checkout.update(paymentMethodsResponse, amount);
          }
        };


        if (giftCardRef.current === null) {
          giftCardRef.current = new Giftcard(checkout, giftCardConfiguration);

          // Mount the gift card component.
          giftCardRef.current
            .isAvailable()
            .then(() => {
              giftCardRef.mount(paymentContainer.current);
            })
            .catch(error => {
              console.log('Gift cards are not available.')
              console.log(error);
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
      <div className="payment-container mb-5">
        <div ref={paymentContainer} className="payment"></div>
      </div>
    </div>
  );
}
