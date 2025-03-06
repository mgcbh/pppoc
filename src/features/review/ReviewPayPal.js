import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "@adyen/adyen-web/styles/adyen.css";
import Messages from "../../components/Messages";
import { getRedirectUrl } from "../../util/redirect";

export const ReviewPayPalContainer = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseJson, setResponseJson] = useState({});
  const paymentContainer = useRef(null);
  const resultCodeRef = useRef(null);

  useEffect(() => {
    setMessage('The following PayPal data will be submitted with the payment request:');
    setJson(JSON.parse(sessionStorage.getItem('payPalData')));
  }, [])

  // Redirect the user after receiving a response from the back end.
  const handleRedirect = () => {
    navigate(getRedirectUrl(resultCodeRef.current), { replace: true });
  }

  const handlePlaceOrder = async () => {
    const payPalData = sessionStorage.getItem('payPalData');

    try {
      // Make a POST request to /api/payments/details which then makes a request
      // to the Adyen /payments/details endpoint.
      const response = await fetch("/api/payments/details", {
        method: "POST",
        body: payPalData,
        headers: {
          "Content-Type": "application/json",
        }
      }).then(response => response.json());

      const { action, resultCode, pspReference } = response;
      resultCodeRef.current = resultCode;

      setResponseMessage('Response from the /payments/details endpoint:')
      setResponseJson(response);
      setSubmitted(true);

    } catch (error) {
      console.error("Failed place order.", error);
    }
  }

  return (
    <div id="review-page">
      <div className="container">
        <div className="mw-100">
          <h2>Review Your Purchase</h2>
          <p>
            This demonstrates sending a request to the backend to submit the PayPal payment to Adyen.
            PayPal payment data is retrieved from sessionStorage and sent in the body of
            the POST request to the backend.
          </p>

          {message && json && <Messages message={message} json={json} />}
          {responseMessage && responseJson && <Messages message={responseMessage} json={responseJson} />}

          <button className="button" onClick={submitted ? handleRedirect : handlePlaceOrder}>
            {!submitted && (<>Place Order</>)}
            {submitted && <>Order Placed<br />(click again to proceed)</>}
          </button>

          <div ref={paymentContainer}></div>
        </div>
      </div>
    </div>
  );
}
