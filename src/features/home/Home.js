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
      <ul className="integration-list mb-5">
        <li className="integration-list-item">
          <Link to="/checkout/two-step" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Two-Step Checkout</p>
            </div>
          </Link>
        </li>
        <li className="integration-list-item">
          <Link to="/checkout/two-cards" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Pay with Two Cards</p>
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
          <Link to="/checkout/gift-card" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Gift Card</p>
            </div>
          </Link>
        </li>
        <li className="integration-list-item">
          <Link to="/checkout/apple-pay" className="integration-list-item-link">
            <div className="title-container">
              <p className="integration-list-item-title">Apple Pay</p>
            </div>
          </Link>
        </li>
      </ul>

      <p>Other demos:</p>
      <ul>
        <li>
          <Link to="/checkout/single-card">
            Single Card
          </Link>
        </li>
        <li>
          <Link to="/checkout/single-card-apply">
            Apply a Single Card
          </Link>
        </li>
      </ul>
    </div>
  )
}
