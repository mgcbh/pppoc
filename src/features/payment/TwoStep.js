import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Card } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

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
  const cardRefData = useRef(null);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});

  const goToReview = () => {
    navigate('/review');
  }

  const handleContinue = () => {
    // Validate the shopper input in the payment form.
    if (cardRef.current.state.isValid) {
      const cardData = {
        ...cardRefData.current
      };
      setMessage('The following will be saved to session storage and used in the final place order click. It could also be saved to the back end if necessary.');
      setJson(cardData);

      // Store the payment data to use in the /payments request.
      // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
      sessionStorage.setItem('cardData', JSON.stringify(cardData));
      setSubmitted(true);

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

        // Called when there is any kind of error with the component.
        onError: (error, component) => {
          console.log('in on error')
          console.error(error.name, error.message, error.stack, component);
        }
      })

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        const cardConfiguration = {
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
          },
          onChange: (state, component) => {
            cardRefData.current = state.data
          }
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
    <>
      <div className="mw-100">
        <div className="mb-3">
        <h2>Two-Step Checkout</h2>
          <p>
            This page demonstrates a "two-step" checkout flow where payment details are entered on the first page, and then the payment is
            actually finalized and submitted to Adyen on the second page.
          </p>
          <ul>
            <li>Card holder name is not shown.</li>
            <li>
              Encrypted card data is captured during the Adyen Card onChange event.{" "}
              <a href="https://docs.adyen.com/online-payments/build-your-integration/advanced-flow/?platform=Web&integration=Components&version=6.5.1#add">
                Step 5 in the advanced checkout flow docs
              </a>{" "}
              explains that the data from the onChange event can be passed to the backend for processing the payment.
            </li>
            <li>On the click to continue, focus is set to invalid data fields if applicable.</li>
          </ul>
        </div>
        <div className="payment-container mb-3">
          <div ref={paymentContainer} className="payment"></div>
        </div>
        {message && json &&
          <div className="mb-5">
            <Messages message={message} json={json} />
          </div>
        }
        <div>
          <button className="button" onClick={submitted ? goToReview : handleContinue}>
            Continue to Review Page
            {submitted && <span> (click again to proceed)</span>}
          </button>
        </div>
      </div>
    </>
  );
}
