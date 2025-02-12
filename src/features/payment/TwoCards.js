import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Card } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import { getRedirectUrl } from "../../util/redirect";

export const TwoCardsContainer = () => {
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
  const paymentTwoContainer = useRef(null);
  const cardRef = useRef(null);
  const cardTwoRef = useRef(null);

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
        showPayButton:true,
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
        // Used for the Native 3DS2 Authentication flow, see: https://docs.adyen.com/online-payments/3d-secure/native-3ds2/
        onAdditionalDetails: async (state, component, actions) => {
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
        }
      })

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        const cardConfiguration = {
          // Optional configuration.
          billingAddressRequired: false, // when true show the billing address input fields and mark them as required.
          showBrandIcon: true, // when false not showing the brand logo 
          hasHolderName: true, // show holder name
          holderNameRequired: true, // make holder name mandatory
          // configure placeholders
          placeholders: {
            cardNumber: '1234 5678 9012 3456',
            expiryDate: 'MM/YY',
            securityCodeThreeDigits: '123',
            securityCodeFourDigits: '1234',
            holderName: 'J. Smith'
          },
        }

        if (cardRef.current === null) {
          cardRef.current = new Card(checkout, cardConfiguration);
          
          // Mount the card component.
          cardRef.current.mount(paymentContainer.current);
        }

        if (cardTwoRef.current === null) {
          cardTwoRef.current = new Card(checkout, cardConfiguration);

          // Mount the card component.
          cardTwoRef.current.mount(paymentTwoContainer.current);
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
      <div className="payment-container">
        <div ref={paymentContainer} className="payment"></div>
      </div>
      <br />
      <div className="payment-container">
        <div ref={paymentTwoContainer} className="payment"></div>
      </div>
    </div>
  );
}
