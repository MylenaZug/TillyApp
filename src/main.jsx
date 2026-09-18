import React from "react";
import ReactDOM from "react-dom/client";
import { storage } from "./firebase.js";
import TillyTracker from "./App.jsx";

// Der App-Code ruft window.storage.get/set auf (genau wie im Claude-Artefakt).
// Hier wird das einmal global auf die Firebase-Anbindung umgelegt.
window.storage = storage;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TillyTracker />
  </React.StrictMode>
);
