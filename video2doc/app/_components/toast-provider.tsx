"use client";
import React from "react";
import { Toaster } from "react-hot-toast";

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <Toaster />
      {children}
    </div>
  );
};

export default ToastProvider;
