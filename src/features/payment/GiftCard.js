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
  const paymentContainer = useRef([React.createRef()]);
  const giftCardRef = useRef([React.createRef()]);
  const [message, setMessage] = useState('');
  const [json, setJson] = useState({});
  const [messageResponse, setMessageResponse] = useState('');
  const [jsonResponse, setJsonResponse] = useState({});
  const amountRef = useRef(null);
  const [count, setCount] = useState(1);
  const checkout = useRef(null);
  const giftCardData = useRef([]);

  const countArray = Array(count).fill().map((x, i) => i);

  const createCard = (number) => {
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
        if (state.isValid) {
          const key = component["_id"];
          const found = giftCardData.current.findIndex((item) => item.id === key);
          if (found === -1) {
            giftCardData.current = [...giftCardData.current, { ...state.data, id: key }];
          }
        }
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

    if (!giftCardRef.current[number]?.current) {
      giftCardRef.current[number].current = new Giftcard(checkout.current, giftCardConfiguration);

      // Mount the gift card component.
      giftCardRef.current[number].current
        .isAvailable()
        .then(() => {
          giftCardRef.current[number].current.mount(paymentContainer.current[number].current);
        })
        .catch(error => {
          console.log('Gift cards are not available.')
          console.log(error);
        });
    }
  }

  const handleIncrement = () => {
    paymentContainer.current = Array(count + 1).fill().map((_, i) => paymentContainer.current[i] || React.createRef());
    giftCardRef.current = Array(count + 1).fill().map((_, i) => giftCardRef.current[i] || React.createRef());

    setCount(count + 1)
  }

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
    if (count > 1) {
      createCard(count - 1)
    }

  }, [count]);

  useEffect(() => {
    const { config, paymentMethods } = payment;
    let ignore = false;

    if (!paymentMethods || !paymentContainer.current) {
      // initiateCheckout is not finished yet.
      return;
    }

    const createCheckout = async () => {
      checkout.current = await AdyenCheckout({
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
        createCard(0)
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

      {countArray.map((item, index) => {
        return (
          <div key={index} className="payment-container mb-5">
            <div ref={paymentContainer.current[index]} className="payment"></div>
          </div>
        )
      })}

      <div className="mb-3">
        {giftCardData.current &&
          giftCardData.current.map(data => {
            return <Messages key={data.id} message={'Gift card data'} json={data} />
          })
        }
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

      <button className="button" onClick={handleIncrement}>Add a Gift Card</button>
    </div>
  );
}
