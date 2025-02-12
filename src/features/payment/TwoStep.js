import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Card } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout, savePaymentData } from "../../app/paymentSlice";
import { getRedirectUrl } from "../../util/redirect";

/////////////////////////
//  WIP
/////////////////////////

export const TwoStepContainer = () => {
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
  const cardRef = useRef(null);

  const goToReview = () => {
    navigate('/review');
  }

  const handleGoToReview = () => {
    // Validate the shopper input in the payment form.
    if (cardRef.current.state.isValid) {
      // Store the payment data to use in the /payments request.
      // Pass goToReview to navigate to review if the save is successful.
      dispatch(savePaymentData(cardRef.current.state.data, goToReview));
      // cardRef.current.unmount();
      // goToReview();
    } else {
      // If the payment method details are invalid, trigger the validation to focus on the missing field.
      cardRef.current.showValidation();
    }
  }


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
        showPayButton: false, // Hide the pay button for two-step checkout.
        onSubmit: async (state, component, actions) => {
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
      }
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment, navigate])

  return (
    <div>
      <div className="payment-container mb-3">
        <div ref={paymentContainer} className="payment"></div>
      </div>
      <div>
        <button className="button" onClick={handleGoToReview}>Continue to Review Page</button>
      </div>
    </div>
  );
}
