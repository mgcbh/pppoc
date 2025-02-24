import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import { RedirectContainer } from "./features/redirect/Redirect";
import { SingleCardContainer } from "./features/payment/SingleCard";
import { SingleCardApplyContainer } from "./features/payment/SingleCardApply";
import { TwoCardsContainer } from "./features/payment/TwoCards";
import { TwoStepContainer } from "./features/payment/TwoStep";
import { StatusContainer } from "./features/status/Status";
import { ReviewContainer } from "./features/review/Review";
import { StoredCardsContainer } from "./features/payment/StoredCards";
import { ApplePayContainer } from "./features/payment/ApplePay";
import { GiftCardContainer } from "./features/payment/GiftCard";
import "./App.css";
import { Home } from "./features/home/Home";

const App = () => (
  <>
    <header id="header">
      <Link to="/">
        Home
      </Link>
    </header>
    <div className="container">
      <Routes>
        <Route path="/checkout/single-card" element={<SingleCardContainer />} />
        <Route path="/checkout/single-card-apply" element={<SingleCardApplyContainer />} />
        <Route path="/checkout/gift-card" element={<GiftCardContainer />} />
        <Route path="/checkout/two-cards" element={<TwoCardsContainer />} />
        <Route path="/checkout/two-step" element={<TwoStepContainer />} />
        <Route path="/checkout/stored-cards" element={<StoredCardsContainer />} />
        <Route path="/checkout/apple-pay" element={<ApplePayContainer />} />
        <Route path="/status/:type" element={<StatusContainer />} />
        <Route path="/redirect" element={<RedirectContainer />} />
        <Route path="/review" element={<ReviewContainer />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  </>
);

export default App;
