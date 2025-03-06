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
  const storedCardRefData = useRef(null);
  const cardRefData = useRef(null);
  const [allStoredCards, setAllStoredCards] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  // Messaging
  const [cardMessage, setCardMessage] = useState('');
  const [storedMessage, setStoredMessage] = useState('');
  const [storedDataMessage, setStoredDataMessage] = useState('');
  const [cardJson, setCardJson] = useState('');
  const [storedJson, setStoredJson] = useState({});
  const [storedDataJson, setStoredDataJson] = useState({});

  const goToReview = () => {
    navigate('/review');
  }

  const handleGoToReviewStored = () => {
    // Validate the shopper input in the stored card form.
    if (storedCardRef.current.state.isValid) {
      const cardData = {
        ...storedCardRefData.current,
        shopperInteraction: 'ContAuth',
        recurringProcessingModel: 'CardOnFile',
        shopperReference: 'pocShopper'
      }
      setStoredDataMessage('The following will be saved to session storage and used in the final place order click:');
      setStoredDataJson(cardData);
      setSubmitted(true);

      // Store the payment data to use in the /payments request.
      // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
      sessionStorage.setItem('cardData', JSON.stringify(cardData));

      // Go to the review page. Commenting out so that we can do it manually instead for POC purposes.
      // goToReview();
    } else {
      // If the payment method details are invalid, trigger the validation to focus on the missing field.
      storedCardRef.current.showValidation();
    }
  }

  const handleGoToReview = () => {
    // Validate the shopper input in the payment form.
    if (cardRef.current.state.isValid) {
      const cardData = {
        ...cardRefData.current,
        storePaymentMethod: true,
        recurringProcessingModel: 'CardOnFile',
        shopperReference: 'pocShopper'
      };
      setCardMessage('The following data will be saved to the user`s stored cards and also used for processing the payment:');
      setCardJson(cardData);
      setSubmitted(true);

      // Store the payment data to use in the /payments request.
      // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
      sessionStorage.setItem('cardData', JSON.stringify(cardData));

      // Go to the review page. Commenting out so that we can do it manually instead for POC purposes.
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
          setStoredMessage(
            `The following data is is returned from the call to /api/paymentMethods
            and is needed to initialize the stored card component:`
          );
          setStoredJson(storedPaymentMethod);

          storedPaymentMethod.onChange = (state, component) => {
            storedCardRefData.current = state.data;
          }

          // Enable once we have configured our account to skip CVCs.
          // At this time, the payment request fails without a CVC but any CVC passes the test.
          storedPaymentMethod.hideCVC = true;

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
      <h4>Example 1: Pay and Store a Card<br />(Generate a Token)</h4>
      <div className="payment-container mb-5">
        <div ref={paymentContainer} className="payment mb-3"></div>
      </div>

      {(cardMessage && cardJson) && (
        <Messages message={cardMessage} json={cardJson} />
      )}

      <div>
        <button className="button" onClick={submitted ? goToReview : handleGoToReview}>
          Continue to Review Page - pay and store card
          {submitted && <span><br />(click again to proceed)</span>}
          </button>
        <p className="p-4">The payment response will include a token and will be stored and associated with user <code>pocShopper</code>.</p>
      </div>

      <hr className="mt-3 mb-5" />

      <h4 className="mb-3">Example 2: Pay With a Stored Card</h4>
      <h5>All of pocShopper's Stored Cards:</h5>
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

      <h5>Stored Card Component:</h5>
      <div className="payment-container mb-5">
        <p className="pl-4 pr-3">Enter the CVC to pay with card ending in {allStoredCards[0]?.lastFour}</p>
        <div ref={storedCardContainer} className="payment"></div>
      </div>

      {(storedDataMessage && storedDataJson) && (
        <Messages message={storedDataMessage} json={storedDataJson} />
      )}

      <div>
        <button className="button" onClick={submitted ? goToReview : handleGoToReviewStored}>
          Continue to Review Page - pay with stored card
          {submitted && <span><br />(click again to proceed)</span>}
        </button>
      </div>
    </div>
  );
}
