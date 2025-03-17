import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Card } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { clearPaymentSession, initiateCheckout } from "../../app/paymentSlice";
import { getRedirectUrl } from "../../util/redirect";

export const SingleCardContainer = () => {
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
  const [includePaymentMethods, setIncludePaymentMethods] = useState(true);

  const handleReset = () => {
    cardRef.current.unmount();
    cardRef.current = null;
    dispatch(clearPaymentSession());
    setIncludePaymentMethods(false);
  }

  const handleUnmount = () => {
    cardRef.current.unmount();
  }

  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch, includePaymentMethods])

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
        paymentMethodsResponse: includePaymentMethods ? paymentMethods : {},
        showPayButton: true,
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
        // Just to prove we can change the styles in the iFrame.
        // See https://docs.adyen.com/payment-methods/cards/custom-card-integration/#styling for all styles.
        const styleObject = {
          base: {
            fontSize: '14px'
          },
        };

        const cardConfiguration = {
          // Optional configuration.
          billingAddressRequired: false, // when true show the billing address input fields and mark them as required.
          showBrandIcon: true, // when false not showing the brand logo 
          hasHolderName: false, // show holder name
          holderNameRequired: false, // make holder name mandatory
          // configure placeholders
          placeholders: {
            cardNumber: '1234 5678 9012 3456',
            expiryDate: 'MM/YY',
            securityCodeThreeDigits: '123',
            securityCodeFourDigits: '1234',
            holderName: 'J. Smith'
          },
          // Apply custom styling to iFramed input fields.
          styles: styleObject,
          onBinValue: (data) => {
            const cardLogo = cardRef.current._node.querySelector('.adyen-checkout-card-input__icon');

            // Pretend that CBCC cards start with 1.
            if (data.binValue.substring(0, 1) === '1') {
              console.log('yes')
              // If a CBCC card is detected, update the logo in the card number input.  
              cardLogo.classList.add('cbcc');
              cardLogo.setAttribute('src', '/images/cbcc.svg');
            } else {
              if (cardLogo.classList.contains('cbcc')) {
                cardLogo.setAttribute('src', '');
                cardLogo.setAttribute('src', 'https://checkoutshopper-test.cdn.adyen.com/checkoutshopper/images/logos/nocard.svg');
                cardLogo.classList.remove('cbcc');
              }
            }
          },
          onLoad: () => {
            try {
              const appendRequired = (element) => {
                const required = document.createElement('span');
                required.textContent = 'required';
                required.classList.add('adyen-checkout__label__text', 'required');
                element.after(required);
              }

              const cardNumberLabel = cardRef.current._node.querySelector('[data-id="encryptedCardNumber"]');
              const expiryDateLabel = cardRef.current._node.querySelector('[data-id="encryptedExpiryDate"]');
              const securityCodeLabel = cardRef.current._node.querySelector('[data-id="encryptedSecurityCode"]');

              appendRequired(cardNumberLabel);
              appendRequired(expiryDateLabel);
              appendRequired(securityCodeLabel);

              // Prepend the CBCC card.
              const card = cardRef.current._node.querySelector('.adyen-checkout__card__brands__brand-wrapper').cloneNode(true);
              card.classList.add('cbcc');
              card.firstChild.setAttribute('src', '/images/cbcc.svg');
              cardRef.current._node.querySelector('.adyen-checkout__card__brands__brand-wrapper').before(card);
            } catch (error) {
              console.log('There was an issue with updating the DOM during onLoad.')
            }
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
      <div className="payment-container payment-container--cb mb-5">
        <div ref={paymentContainer} className="payment"></div>
      </div>

      <button className="button mb-3"
        onClick={handleReset}>
        Reload without paymentMethodsResponse
      </button>

      <button onClick={handleUnmount} className="button">Unmount the component</button>
    </div>
  );
}
