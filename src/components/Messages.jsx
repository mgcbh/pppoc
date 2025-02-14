import React from "react";

const Messages = ({
  message,
  json
}) => {
  const formattedJson = JSON.stringify(json, null, 2);

  return (
    <div className="mw-100 mb-5 p-3 shadow">
      <div className="message">{message}</div>
      {formattedJson !== '{}' &&
        <div className="json">
          <pre>{formattedJson}</pre>
        </div>
      }
    </div>
  )
}

export default Messages