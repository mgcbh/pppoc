import React from "react";

export const ReviewContainer = () => {

  /////////////////
  // WIP
  ////////////////

  const handlePlaceOrder = async () => {
    const { action, order, resultCode } = await fetch("/api/placeorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      }
    }).then(response => response.json());

    console.log('resultCode: ', resultCode);
  }

  return (
    <main className="container">
      <div className="review">
        <h2>Review your purchase</h2>
        <button className="button" onClick={handlePlaceOrder}>Place Order</button>
      </div>
    </main>
  )
}