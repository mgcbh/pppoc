import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import { RedirectContainer } from "./features/redirect/Redirect";
import { SingleCardContainer } from "./features/payment/SingleCard";
import { TwoCardsContainer } from "./features/payment/TwoCards";
import { TwoStepContainer } from "./features/payment/TwoStep";
import { StatusContainer } from "./features/status/Status";
import { ReviewContainer } from "./features/review/Review";
import "./App.css";
import { Home } from "./features/home/Home";

const App = () => (
  <>
    <header id="header">
      <Link to="/">
        <img src="/images/mystore-logo.svg" alt="" />
      </Link>
    </header>
    <div className="container">
      <Routes>
        <Route path="/checkout/single-card" element={<SingleCardContainer />} />
        <Route path="/checkout/two-cards" element={<TwoCardsContainer />} />
        <Route path="/checkout/two-step" element={<TwoStepContainer />} />
        <Route path="/status/:type" element={<StatusContainer />} />
        <Route path="/redirect" element={<RedirectContainer />} />
        <Route path="/review" element={<ReviewContainer />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  </>
);

export default App;
