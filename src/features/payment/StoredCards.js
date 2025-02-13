import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Card } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

export const StoredCardsContainer = () => {
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
  const storedCardContainer = useRef(null);
  const cardRef = useRef(null);
  const storedCardRef = useRef(null);
  const [message, setMessage] = useState('');
  const [storedMessage, setStoredMessage] = useState('');
  const storedCardRefData = useRef(null);
  const cardRefData = useRef(null);
  const [allStoredCards, setAllStoredCards] = useState([]);
  const [json, setJson] = useState({});
  const [storedJson, setStoredJson] = useState({});

  const goToReview = () => {
    navigate('/review');
  }

  const handleGoToReview = () => {
    // Validate the shopper input in the payment form.
    if (storedCardRef.current.state.isValid) {
      const cardData = {
        ...storedCardRefData.current,
        shopperInteraction: 'ContAuth',
        recurringProcessingModel: 'CardOnFile',
        shopperReference: 'pocShopper'
      }
      setMessage('The following will be saved to session storage and used in the final place order click:');
      setJson(cardData);

      // Store the payment data to use in the /payments request.
      // Pass goToReview to navigate to review if the save is successful.
      setTimeout(() => {
        // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
        sessionStorage.setItem('cardData', JSON.stringify(cardData));
        goToReview();
      }, 3000);
    } else {
      // If the payment method details are invalid, trigger the validation to focus on the missing field.
      storedCardRef.current.showValidation();
    }

    // Validate the shopper input in the payment form.
    if (cardRef.current.state.isValid) {
      const cardData = {
        ...cardRefData.current,
        storePaymentMethod: true,
        recurringProcessingModel: 'CardOnFile',
        shopperReference: 'pocShopper'
      };
      setMessage('The following data will be saved to the user`s stored cards and also used for processing the payment:');
      setJson(cardData);

      // Store the payment data to use in the /payments request.
      // Pass goToReview to navigate to review if the save is successful.
      setTimeout(() => {
        // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
        sessionStorage.setItem('cardData', JSON.stringify(cardData));
        goToReview();
      }, 3000);
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
      })

      setAllStoredCards(checkout.paymentMethodsResponse.storedPaymentMethods);

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
          cardConfiguration.onChange = (state, component) => {
            cardRefData.current = state.data;
          }

          cardRef.current = new Card(checkout, cardConfiguration);
          cardRef.current.mount(paymentContainer.current);
        }

        if (storedCardRef.current === null) {
          const storedPaymentMethod = checkout.paymentMethodsResponse.storedPaymentMethods[0];
          setStoredMessage('The following data is needed to initialized the stored card component:')
          setStoredJson(storedPaymentMethod);

          storedPaymentMethod.onChange = (state, component) => {
            storedCardRefData.current = state.data;
          }

          storedCardRef.current = new Card(checkout, storedPaymentMethod)
          storedCardRef.current.mount(storedCardContainer.current);
        }
      }
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment, navigate])

  return (
    <div className="mw-100">
      <div className="payment-container mb-5">
        <div ref={paymentContainer} className="payment mb-3"></div>
        <p className="p-4">This card will be saved and associated with user <code>pocShopper</code>.</p>
      </div>

      <h5>All of pocShopper's cards:</h5>
      <div className="payment-container mb-5">
        <ul>
          {allStoredCards.map((card) => {
            return (
              <li key={card.id}>{card.name}: {card.lastFour}</li>
            )
          })}
        </ul>
      </div>

      <h5>First Stored Card:</h5>
      {(storedMessage && storedJson) && (
        <Messages message={storedMessage} json={storedJson} />
      )}
      <div className="payment-container mb-5">
        <div ref={storedCardContainer} className="payment"></div>
      </div>

      <div>
        <button className="button" onClick={handleGoToReview}>Continue to Review Page</button>
      </div>
      {(message && json) && (
        <Messages message={message} json={json} />
      )}
    </div>
  );
}
