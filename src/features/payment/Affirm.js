import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Affirm } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

export const AffirmContainer = () => {
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
  const affirmRef = useRef(null);
  const affirmRefData = useRef(null);
  const amountRef = useRef(0);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});

  const goToReview = () => {
    navigate('/review');
  }

  const handleContinue = () => {
    // Validate the shopper input in the payment form.
    if (affirmRef.current.state.isValid) {
      const affirmData = {
        ...affirmRefData.current,
        amount: parseInt(amountRef.current.value * 100),
      };
      setMessage('The following will be saved to session storage and used in the final place order click. It could also be saved to the back end if necessary.');
      setJson(affirmData);

      // Store the payment data to use in the /payments request.
      // Here we may decide to post this data to the back end instead of just saving to sessionStorage.
      sessionStorage.setItem('cardData', JSON.stringify(affirmData));
      setSubmitted(true);

      // Go to the review page. Commenting out so that we can do it manually instead for POC purposes.
      // goToReview();
    } else {
      // If the payment method details are invalid, trigger the validation to focus on the missing field.
      affirmRef.current.showValidation();
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
        onChange: (state, component) => {
          console.log('on change')
          console.log(state)
          affirmRefData.current = state.data
        },
        onSubmit: (state, component, actions) => {
          console.log('on submit')
          console.log(state);
        },
        // Called when there is any kind of error with the component.
        onError: (error, component) => {
          console.log('in on error')
          console.error(error.name, error.message, error.stack, component);
        }
      })

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        const affirmConfiguration = {
          visibility: {
            personalDetails: "editable", // These fields will not appear on the payment form.
            billingAddress: "editable", // These fields will appear on the payment form, but the shopper cannot edit them.
            deliveryAddress: "editable" // These fields will appear on the payment form, and the shopper can edit them. This is the default behavior.
          },
        }

        if (affirmRef.current === null) {
          affirmRef.current = new Affirm(checkout, affirmConfiguration);

          // Mount the Affirm component.
          affirmRef.current.mount(paymentContainer.current);
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
        <div className="form-group">
          <label>Amount:</label>
          <input className="form-control" type="number" ref={amountRef} defaultValue={100} />
        </div>

        <div className="mb-3">
          <h2>Affirm (Buy Now, Pay Later)</h2>
          <p>
            This page demonstrates the flow for the Affirm component.<br />
            When you are redirected to Affirm to complete the transaction, use <b>123456</b> for the verification PIN and <b>5678</b> for the user SSN.
          </p>
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
