// src/components/QrCodeGenerator.jsx
import React from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QrCodeGenerator({ url }) {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-lg font-semibold mb-4">Scan to Open Website</h2>
      <QRCodeCanvas value={url} size={200} bgColor="#ffffff" fgColor="#000000" />
    </div>
  );
}
