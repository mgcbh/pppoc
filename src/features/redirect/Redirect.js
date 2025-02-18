import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import "@adyen/adyen-web/styles/adyen.css";
import { useLocation, useNavigate } from "react-router";
import { getRedirectUrl } from "../../util/redirect";

// This class is used to finalize redirect flows for some payment methods
export const RedirectContainer = () => {
  const location = useLocation();
  const payment = useSelector(state => state.payment);
  const navigate = useNavigate();

  useEffect(() => {
    const orderRef = new URLSearchParams(location.search).get('orderRef');
    const redirectResult = new URLSearchParams(location.search).get('redirectResult');

    const createCheckout = async () => {
      try {
        const response = await fetch("/api/payments/details", {
          method: "POST",
          body: JSON.stringify({
            "details": {
              "redirectResult": redirectResult
            }
          }),
          headers: {
            "Content-Type": "application/json",
          }
        }).then(response => response.json());

        const { pspReference, resultCode } = response;

        navigate(getRedirectUrl(resultCode), { replace: true });

      } catch (error) {
        console.error(error);
      }
    };

    createCheckout();
  }, [payment, navigate, location.search])

  return (
    <div id="redirect-page"></div>
  );
}
