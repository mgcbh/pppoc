import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Card } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

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
  const checkoutRef = useRef(null);
  const cardRef = useRef(null);
  const cardRefData = useRef(null);
  const cardRefDisplayData = useRef({});
  const [cardApplied, setCardApplied] = useState(false);
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});

  const paymentContainerTwo = useRef(null);
  const cardRefTwo = useRef(null);
  const cardRefDataTwo = useRef(null);
  const cardRefDisplayDataTwo = useRef({});
  const [amountTwo, setAmountTwo] = useState(0);
  const [cardAppliedTwo, setCardAppliedTwo] = useState(false);
  const [messageTwo, setMessageTwo] = useState('');
  const [jsonTwo, setJsonTwo] = useState({});

  // The default configuration for a Card component.
  const cardConfiguration = useCallback((dataRef, displayRef) => {
    return {
      // Optional configuration.
      billingAddressRequired: false, // when true show the billing address input fields and mark them as required.
      showBrandIcon: true, // when false not showing the brand logo
      hasHolderName: false, // hide the  holder name
      holderNameRequired: false, // holder name is not mandatory
      // configure placeholders
      placeholders: {
        cardNumber: '1234 5678 9012 3456',
        expiryDate: 'MM/YY',
        securityCodeThreeDigits: '123',
        securityCodeFourDigits: '1234',
        holderName: 'J. Smith'
      },
      onChange: (state, component) => {
        dataRef.current = state.data
      },
      onBrand: (brandData) => {
        displayRef.current.brand = brandData.brand;
      },
      onFieldValid: (data) => {
        if (data.encryptedFieldName === 'encryptedCardNumber') {
          displayRef.current.lastFour = data.endDigits;
        }
      }
    }
  }, []);

  // Handle when the user clicks to "Apply" a credit card.
  const handleApply = () => {
    // Validate the shopper input in the payment form.
    if (cardRef.current.state.isValid) {
      const cardData = {
        ...cardRefData.current,
        amount: amount
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
      // If the payment method details are invalid, trigger the validation to focus on the missing field.
      cardRef.current.showValidation();
    }
  }

  // Handle when the user clicks to "Apply" a credit card.
  // POC only. Obviously lots of duplicate code here.
  const handleApplyTwo = () => {
    // Validate the shopper input in the payment form.
    if (cardRefTwo.current.state.isValid) {
      const cardData = {
        ...cardRefDataTwo.current,
        amount: amountTwo
      };
      setMessageTwo(`The following will be saved to session storage and used in the
        final place order click:`);
      setJsonTwo(cardData);

      // Unmount the card component and reset the reference.
      cardRefTwo.current.unmount();
      cardRefTwo.current = null;
      setCardAppliedTwo(true);

      // Store the payment data to use in the /payments request.
      // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
      sessionStorage.setItem('cardDataTwo', JSON.stringify(cardData));
    } else {
      // If the payment method details are invalid, trigger the validation to focus on the missing field.
      cardRefTwo.current.showValidation();
    }
  }

  const handleSubmit = () => {
    navigate('/review');
  }

  // Initiate checkout when the page loads.
  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch])


  // Handle when the user clicks to add a new card. When the cardApplied state changes to false, the
  // useEffect below is triggered and renders a new instance of the Card form.
  const handleAddCard = () => {
    setCardApplied(false);
  }

  // Handle when the user clicks to add a new card. When the cardApplied state changes to false, the
  // useEffect below is triggered and renders a new instance of the Card form.
  const handleAddCardTwo = () => {
    setCardAppliedTwo(false);
  }

  // Render a new instance of the card form after handleAddCard sets cardApplied to false.
  useEffect(() => {
    if (!cardApplied && checkoutRef.current) {
      cardRef.current = new Card(checkoutRef.current, cardConfiguration(cardRefData, cardRefDisplayData));

      // Mount the card component.
      cardRef.current.mount(paymentContainer.current);
    }
  }, [cardApplied, cardConfiguration])

  // Render a new instance of the card form after handleAddCard sets cardApplied to false.
  useEffect(() => {
    if (!cardAppliedTwo && checkoutRef.current) {
      cardRefTwo.current = new Card(checkoutRef.current, cardConfiguration(cardRefDataTwo, cardRefDisplayDataTwo));

      // Mount the card component.
      cardRefTwo.current.mount(paymentContainerTwo.current);
    }
  }, [cardAppliedTwo, cardConfiguration])

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
          cardRef.current = new Card(checkoutRef.current, cardConfiguration(cardRefData, cardRefDisplayData));

          // Mount the card component.
          cardRef.current.mount(paymentContainer.current);
        }
      }

      if (paymentContainerTwo.current && !ignore) {
        if (cardRefTwo.current === null) {
          cardRefTwo.current = new Card(checkoutRef.current, cardConfiguration(cardRefDataTwo, cardRefDisplayDataTwo));

          // Mount the card component.
          cardRefTwo.current.mount(paymentContainerTwo.current);
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

            <div className="mb-3">
              <label>Amount:</label>
              <input value={amount} type="number" onChange={(event) => setAmount(event.target.value)} />
            </div>

            <div className="mb-5">
              <button className="button" onClick={handleApply}>Apply</button>
            </div>
          </>
        )}

        {cardApplied && (
          <>
            <div className="payment-container mb-3">
              <h6>Applied card details:</h6>
              <div><b>Brand:</b> {cardRefDisplayData.current.brand}</div>
              <div><b>Last Four:</b> {cardRefDisplayData.current.lastFour}</div>
              <div><b>Amount:</b> {amount}</div>
            </div>
            <div className="mb-5">
              <button className="button" onClick={handleAddCard}>
                Use a different card
              </button>
            </div>
          </>
        )}

        {!cardAppliedTwo && (
          <>
            <div className="payment-container mb-3">
              <div ref={paymentContainerTwo} className="payment"></div>
            </div>

            <div className="mb-3">
              <label>Amount:</label>
              <input value={amountTwo} type="number" onChange={(event) => setAmountTwo(event.target.value)} />
            </div>

            <div className="mb-5">
              <button className="button" onClick={handleApplyTwo}>Apply</button>
            </div>
          </>
        )}

        {cardAppliedTwo && (
          <>
            <div className="payment-container mb-3">
              <h6>Applied card details:</h6>
              <div><b>Brand:</b> {cardRefDisplayDataTwo.current.brand}</div>
              <div><b>Last Four:</b> {cardRefDisplayDataTwo.current.lastFour}</div>
              <div><b>Amount:</b> {amountTwo}</div>
            </div>
            <div className="mb-5">
              <button className="button" onClick={handleAddCardTwo}>
                Use a different card
              </button>
            </div>
          </>
        )}

        {cardApplied && cardAppliedTwo && (
          <div className="mb-5">
            <button onClick={handleSubmit} className="button">Submit Two Card Payment</button>
          </div>
        )}

        {(message && json) && (
          <Messages message={message} json={json} />
        )}

        {(messageTwo && jsonTwo) && (
          <Messages message={messageTwo} json={jsonTwo} />
        )}

      </div>
    </>
  );
}
