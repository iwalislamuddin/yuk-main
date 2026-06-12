import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Suntik script AdSense hanya jika ID publisher di-set lewat env.
const adsClient = import.meta.env.VITE_ADSENSE_CLIENT;
if (adsClient) {
  const s = document.createElement("script");
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsClient}`;
  s.async = true;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
