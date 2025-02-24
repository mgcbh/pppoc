import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AdyenCheckout, Giftcard } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { initiateCheckout } from "../../app/paymentSlice";
import Messages from "../../components/Messages";

export const GiftCardContainer = () => {
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
  const giftCardRef = useRef(null);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});
  const [messageResponse, setMessageResponse] = useState('');
  const [jsonResponse, setJsonResponse] = useState({});
  const amountRef = useRef(null);

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
        showPayButton: true,
        onError: (error, component) => {
          console.error("onError", error.name, error.message, error.stack, component);
          navigate(`/status/error?reason=${error.message}`, { replace: true });
        },
      })

      // The 'ignore' flag is used to avoid double re-rendering caused by React 18 StrictMode
      // More about it here: https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
      if (paymentContainer.current && !ignore) {
        const giftCardConfiguration = {
          onOrderCreated: function (orderStatus) {
            // Get the remaining amount to be paid from orderStatus.
            console.log(orderStatus.remainingAmount);
            // Use your existing instance of AdyenCheckout to create payment methods components
            // The shopper can use these payment methods to pay the remaining amount
            // const idealComponent = checkout.create('ideal').mount('#ideal-container');
            // const cardComponent = checkout.create('card').mount('#card-container');
            // Add other payment method components that you want to show to the shopper
          },
          onChange: (state, component) => {
            console.log('giftCard state:')
            console.log(state);
          },
          onBalanceCheck: async (resolve, reject, data) => {
            console.log('onBalanceCheck: ', data)
            const reqBody = {
              ...data,
              amount: parseInt(amountRef.current.value)
            }

            try {
              const balanceResponse = await fetch('/api/paymentMethods/balance', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(reqBody)
              }).then(response => response.json());

              console.log('balance check response:');
              console.log(balanceResponse);

              setMessage('This data is used to check the gift card balance:')
              setJson(reqBody);

              setMessageResponse('Response from the call to check the gift card balance (/paymentMethods/balance):')
              setJsonResponse(balanceResponse);

              // resolve(balanceResponse);
            } catch (error) {
              console.error(error);
              alert("Error occurred. Look at console for details");
            }
          },
          onOrderRequest: (resolve, reject, data) => {
            console.log('onOrderRequest: ', data)
            // Make a POST /orders request
            // Create an order for the total transaction amount
            // resolve(OrderResponse);
          },
          onOrderCancel: (order) => {
            console.log('onOrderCancel: ', order)
            // Make a POST /orders/cancel request
            // Call the update function and pass the payment methods response to update the instance of checkout
            // checkout.update(paymentMethodsResponse, amount);
          }
        };

        if (giftCardRef.current === null) {
          giftCardRef.current = new Giftcard(checkout, giftCardConfiguration);

          // Mount the gift card component.
          giftCardRef.current
            .isAvailable()
            .then(() => {
              giftCardRef.current.mount(paymentContainer.current);
            })
            .catch(error => {
              console.log('Gift cards are not available.')
              console.log(error);
            });
        }
      }
    }

    createCheckout();

    return () => {
      ignore = true;
    }
  }, [payment, navigate])

  return (
    <div className="w-100">
      <div className="form-group">
        <label>Amount</label>
        <input className="form-control" type="number" ref={amountRef} defaultValue={100} />
      </div>

      <div className="payment-container mb-5">
        <div ref={paymentContainer} className="payment"></div>
      </div>

      <div className="mb-3">
        {(message && json) && (
          <Messages message={message} json={json} />
        )}
      </div>

      <div className="mb-3">
        {(messageResponse && jsonResponse) && (
          <Messages message={messageResponse} json={jsonResponse} />
        )}
      </div>

      <p>Adyen SVS test gift card number: 6006490000000000 (any PIN)</p>

      <p>To simulate a scenario, send one of the following amounts in the test payment request:</p>
      <table className="table">
        <thead>
          <tr>
            <th>Amount (last three digits)</th>
            <th><code>resultCode</code></th>
            <th><code>refusalReason</code></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>100</td>
            <td>Authorised</td>
            <td></td>
          </tr>
          <tr>
            <td>123</td>
            <td>Refused</td>
            <td>Refused</td>
          </tr>
          <tr>
            <td>124</td>
            <td>Refused</td>
            <td>Not enough balance</td>
          </tr>
          <tr>
            <td>125</td>
            <td>Refused</td>
            <td>Blocked Card</td>
          </tr>
          <tr>
            <td>126</td>
            <td>Refused</td>
            <td>Expired Card</td>
          </tr>
          <tr>
            <td>130</td>
            <td>Error</td>
            <td>Acquirer Error</td>
          </tr>
          <tr>
            <td>134</td>
            <td>Refused</td>
            <td>Invalid Pin</td>
          </tr>
          <tr>
            <td>135</td>
            <td>Refused</td>
            <td>Pin tries exceeded</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
