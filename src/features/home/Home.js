import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearPaymentSession } from "../../app/paymentSlice";


export const Home = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(clearPaymentSession());
  }, [dispatch]);

  return (
    <div className="main-container">
      <div className="info">
        <h1>Select a demo</h1>
      </div>
      <ul className="integration-list">
        <li className="integration-list-item">
          <Link to="/checkout/single-card" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Single Card</p>
            </div>
          </Link>
        </li>
        <li className="integration-list-item">
          <Link to="/checkout/single-card-apply" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Apply a Single Card</p>
            </div>
          </Link>
        </li>
        <li className="integration-list-item">
          <Link to="/checkout/stored-cards" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Stored Cards</p>
            </div>
          </Link>
        </li>        
        <li className="integration-list-item">
          <Link to="/checkout/two-cards" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Two Cards</p>
            </div>
          </Link>
        </li>
        <li className="integration-list-item">
          <Link to="/checkout/two-step" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Two Step Checkout</p>
            </div>
          </Link>
        </li>
      </ul>
      <div className="mt-5">
        <Link to="/cancel" className="button text-light">
          Cancel and Refund a payment
        </Link>
      </div>
    </div>
  )
}
