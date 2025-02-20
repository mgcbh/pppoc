import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Card } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

export const SingleCardApplyContainer = () => {
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
  const checkoutRef = useRef(null);
  const cardRef = useRef(null);
  const cardRefData = useRef(null);
  const cardDisplayData = useRef({});
  const [cardApplied, setCardApplied] = useState(false);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});

  // The default configuration for a Card component.
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
    onChange: (state, component) => {
      cardRefData.current = state.data
    },
    onBrand: (brandData) => {
      cardDisplayData.current.brand = brandData.brand;
    },
    onFieldValid: (data) => {
      if (data.encryptedFieldName === 'encryptedCardNumber') {
        cardDisplayData.current.lastFour = data.endDigits;
      }
    }
  }

  // Handle when the user clicks to "Apply" a credit card.
  const handleApply = () => {
    // Validate the shopper input in the payment form.
    if (cardRef.current.state.isValid) {
      const cardData = {
        ...cardRefData.current
      };
      setMessage(`The following will be saved to session storage and used in the
        final place order click:`);
      setJson(cardData);

      // Unmount the card component and reset the reference.
      cardRef.current.unmount();
      cardRef.current = null;
      setCardApplied(true);

      // Store the payment data to use in the /payments request.
      // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
      sessionStorage.setItem('cardData', JSON.stringify(cardData));
    } else {
      console.log(cardRef.current);
      // If the payment method details are invalid, trigger the validation to focus on the missing field.
      cardRef.current.showValidation(); // DOES NOT WORK.
    }
  }

  // Handle when the user clicks to add a new card. When the cardApplied state changes to false, the
  // useEffect below is triggered and renders a new instance of the Card form.
  const handleAddCard = () => {
    setCardApplied(false);
  }

  // Render a new instance of the card form after handleAddCard sets cardApplied to false.
  useEffect(() => {
    if (!cardApplied && checkoutRef.current) {
      cardRef.current = new Card(checkoutRef.current, cardConfiguration);

      // Mount the card component.
      cardRef.current.mount(paymentContainer.current);
    }
  }, [cardApplied, cardConfiguration])

  // Initiate checkout when the page loads.
  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch])

  // If the payment state is updated, check for errors and redirect as needed.
  // TODO.
  useEffect(() => {
    const { error } = payment;

    if (error) {
      navigate(`/status/error?reason=${error}`, { replace: true });
    }
  }, [payment, navigate])

  // When the payment state is updated, check to see if paymentMethods exists and if so
  // render the Card component.
  useEffect(() => {
    const { config, paymentMethods } = payment;
    let ignore = false;

    if (!paymentMethods || !paymentContainer.current) {
      // initiateCheckout is not finished yet.
      return;
    }

    const createCheckout = async () => {
      checkoutRef.current = await AdyenCheckout({
        ...config,
        paymentMethodsResponse: paymentMethods,
        showPayButton: false, // Hide the pay button for two-step checkout.
      })

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        if (cardRef.current === null) {
          cardRef.current = new Card(checkoutRef.current, cardConfiguration);

          // Mount the card component.
          cardRef.current.mount(paymentContainer.current);
        }
      }
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment, navigate, cardConfiguration])

  return (
    <>
      <div className="mw-100">
        {!cardApplied && (
          <>
            <div className="payment-container mb-3">
              <div ref={paymentContainer} className="payment"></div>
            </div>
            <div>
              <button className="button" onClick={handleApply}>Apply</button>
            </div>
          </>
        )}

        {cardApplied && (
          <>
            <div className="payment-container mnb-3">
              <h6>Applied card details:</h6>
              <div><b>Brand:</b> {cardDisplayData.current.brand}</div>
              <div><b>Last Four:</b> {cardDisplayData.current.lastFour}</div>
            </div>
            <div>
              <button className="button" onClick={handleAddCard}>
                Use a different card
              </button>
            </div>
          </>
        )}

        {(message && json) && (
          <Messages message={message} json={json} />
        )}
      </div>
    </>
  );
}
