import "./main.scss";
import "./reset.css";
import { HelmetProvider } from 'react-helmet-async';
import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// There is only one route ; the route is required to manipulate the URL in "SearchBar.jsx"
const router = createBrowserRouter([{
  path: "/",
  element: <App />,
}]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </React.StrictMode>
);
