import React, { useState, useEffect } from "react";
import Messages from "../../components/Messages";

export const ReviewContainer = () => {
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});
  const [resultMessage, setResultMessage] = useState('');
  const [resultJson, setResultJson] = useState({});

  useEffect(() => {
    setMessage('The following will be submitted with the payment request:');
    setJson(JSON.parse(sessionStorage.getItem('cardData')))
  }, [])

  const handlePlaceOrder = async () => {
    const cardData = sessionStorage.getItem('cardData');

    const response = await fetch("/api/placeorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: cardData
    }).then(response => response.json());

    const { resultCode } = response;

    setResultMessage('Response from place order:')
    setResultJson(response);

    console.log('resultCode: ', resultCode);
  }

  return (
    <div id="review-page">
      <div className="container">
        <div className="mw-100">
          <h2>Review your purchase</h2>
          <p>
            This demonstrates sending a request to the backend to submit the payment to Adyen.
            Encrypted card details are retrieved from sessionStorage and sent in the body of
            the POST request to the backend.
          </p>
          <p>(order details here)</p>
          <button className="button" onClick={handlePlaceOrder}>
            Place Order
          </button>
        </div>
        {message && json && <Messages message={message} json={json} />}
        {resultMessage && resultJson && <Messages message={resultMessage} json={resultJson} />}
      </div>
    </div>
  );
}