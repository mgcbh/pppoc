import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";
import { getRedirectUrl } from "../../util/redirect";

export const ReviewAffirmContainer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const payment = useSelector(state => state.payment);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultJson, setResultJson] = useState({});
  const [hasAction, setHasAction] = useState(false);
  const paymentContainer = useRef(null);
  const checkoutRef = useRef(null);
  const resultCodeRef = useRef(null);
  const [iFrameSrc, setIFrameSrc] = useState("");
  const [showIFrame, setShowIFrame] = useState(false);
  const [actionUrl, setActionUrl] = useState("");
  const affirmTab = useRef(null);
  const [success, setSuccess] = useState(false);
  const affirmData = sessionStorage.getItem('affirmData');

  // Redirect the user after receiving a response from the back end.
  const handleRedirect = () => {
    navigate(getRedirectUrl(resultCodeRef.current), { replace: true });
  }

  // Initialize the checkout flow.
  useEffect(() => {
    dispatch(initiateCheckout());
  }, [dispatch])

  // DEV ONLY
  useEffect(() => {
    setMessage('The following data will be submitted with the payment request:');
    setJson({
      cardOne: JSON.parse(affirmData),
    })
  }, [])

  useEffect(() => {
    localStorage.removeItem('affirmResult')
  }, [])

  // Once the paymentMethods have been set, create the checkout instance.
  useEffect(() => {
    const { config, paymentMethods } = payment;
    let ignore = false;

    if (!paymentMethods || !paymentContainer.current) {
      // initiateCheckout is not finished yet.
      return;
    }

    // Create a new checkout object to be used in the event that we need to launch one of the actions
    // that require additional steps on the front-end.
    // See https://docs.adyen.com/online-payments/two-step-checkout/#implement-a-review-page
    const createCheckout = async () => {
      checkoutRef.current = await AdyenCheckout({
        ...config,
        paymentMethodsResponse: paymentMethods,
        showPayButton: false, // We implement our own pay button on the review page.
      })
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment])

  const openNewTab = (url) => {
    const newTab = window.open(url, "_blank");
    affirmTab.current = newTab; 
  }

  // Handle a click on the Place Order button.
  const handlePlaceOrder = async (options) => {
    const response = await fetch("/api/placeorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: affirmData
    }).then(response => response.json());

    setResultMessage('Adyen payment response is below.')
    setResultJson(response);
    setSubmitted(true);
    sessionStorage.removeItem('affirmData');

    const { action, resultCode } = response;
    resultCodeRef.current = resultCode;

    // Some payment methods require follow up action, such as redirecting
    // to another site for further action. This kicks off that process.
    // See https://docs.adyen.com/online-payments/two-step-checkout/#implement-a-review-page
    // and https://docs.adyen.com/online-payments/build-your-integration/advanced-flow/?platform=Web&integration=Components&version=6.5.1#additional-action
    if (action) {
      setHasAction(true);
      setTimeout(() => {
        if (options.newTab) {
          // Simply doing the following is blocked by Chrome and probably other
          // browsers but only when the timeout is more than about 3 seconds.
          // Not sure this will work if/when there is a delay in getting the
          // initial response from Adyen
          openNewTab(action.url);

          // If the above doesn't work, then instead display a button that the user has to click.
          // setActionUrl(action.url);

          // Poll for a result and then close the new tab.
          const intervalId = setInterval(() => {
            const result = localStorage.getItem('affirmResult')
            if (affirmTab.current && result && result === "success") {
              affirmTab.current.close()
              clearInterval(intervalId);
              setSuccess(true);
              // and then do other stuff...
            }
          }, 100);
        } else if (options.iFrame) {
          setIFrameSrc(action.url);
          setShowIFrame(true);
        } else {
          checkoutRef.current.createFromAction(action).mount(paymentContainer.current);
        }
      }, 3000);
    } else {
      // No further action is required other than to
      // look at the response and redirect the user based on the result code.
      // Commenting out so that we can do it manually instead for POC purposes.
      // handleRedirect();
    }
  }

  return (
    <div id="review-page">
      <div className="container">
        <div className="mw-100">
          <h2>Review Your Purchase</h2>
          <p>
            This demonstrates sending a request to the backend to submit the payment to Adyen.
            Encrypted card details are retrieved from sessionStorage and sent in the body of
            the POST request to the backend.
          </p>

          {message && json && <Messages message={message} json={json} />}
          {resultMessage && resultJson && <Messages message={resultMessage} json={resultJson} />}

          {showIFrame && (
            <>
              <iframe src={iFrameSrc} width="100%" height="500px" />
              <br /><br />
            </>
          )}

          {success && <p>AFFIRM PAYMENT WAS SUCCESSFUL!</p>}

          {actionUrl && !success && (
            <>
              <button className="button" onClick={() => openNewTab(actionUrl)}>
                Adyen response received. Now click here to go to Affirm
              </button>
              <br /><br />
            </>
          )}

          {!submitted && !success && (
            <>
              <button disabled={hasAction} className="button" onClick={submitted ? handleRedirect : handlePlaceOrder}>
                {!submitted && (<>Place Order</>)}
                {submitted && <>Order Placed
                  {!hasAction && (<><br />(click again to proceed)</>)}
                  {hasAction && (<><br />(wait for additional action)</>)}
                </>
                }
              </button>

              <br /><br />

              <button disabled={hasAction} className="button" onClick={submitted ? handleRedirect : () => handlePlaceOrder({ newTab: true })}>
                {!submitted && (<>Place Order and open Affirm in new tab</>)}
                {submitted && <>Order Placed
                  {!hasAction && (<><br />(click again to proceed)</>)}
                  {hasAction && (<><br />(wait for additional action)</>)}
                </>
                }
              </button>

              <br /><br />

              <button disabled={hasAction} className="button" onClick={submitted ? handleRedirect : () => handlePlaceOrder({ iFrame: true })}>
                {!submitted && (<>Place Order and open Affirm in iFrame</>)}
                {submitted && <>Order Placed
                  {!hasAction && (<><br />(click again to proceed)</>)}
                  {hasAction && (<><br />(wait for additional action)</>)}
                </>
                }
              </button>
            </>
          )}

          {submitted && <button disabled className="button">Order Placed<br />(wait for additional action)</button>}

          <div ref={paymentContainer}></div>
        </div>
      </div>
    </div>
  );
}
