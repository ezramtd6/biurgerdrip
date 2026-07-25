"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api")
      .then(res => res.json())
      .then(data => setMessage(data.message));
  }, []);

  return (
    <h1>{message}</h1>
  );
}