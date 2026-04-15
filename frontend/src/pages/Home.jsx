import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, Zap, Wallet, Server } from "lucide-react";
import QrCodeGenerator  from "../components/QrCode";
export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/signup");
  };

  const handleHowItWorks = () => {
    const howItWorksSection = document.getElementById("how-it-works");
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-sky-50 p-6">
      {/* Hero Section */}
      <section className="text-center py-20">
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Smart EV Charging System for Residential Areas
        </motion.h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
          Seamless, secure, and efficient EV charging at your fingertips.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <button
            onClick={handleGetStarted}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Get Started
          </button>
          <button
            onClick={handleHowItWorks}
            className="px-6 py-2 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition"
          >
            How It Works
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <h2 className="text-3xl font-semibold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <QrCode className="w-10 h-10 mx-auto mb-2 text-blue-600" />
            <h3 className="text-lg font-medium">QR Code Access</h3>
            <p className="text-gray-600 text-sm">Scan to instantly begin charging</p>
          </div>
          <div>
            <Zap className="w-10 h-10 mx-auto mb-2 text-green-600" />
            <h3 className="text-lg font-medium">Real-Time Control</h3>
            <p className="text-gray-600 text-sm">Monitor and control charging sessions</p>
          </div>
          <div>
            <Wallet className="w-10 h-10 mx-auto mb-2 text-indigo-600" />
            <h3 className="text-lg font-medium">Monthly Billing</h3>
            <p className="text-gray-600 text-sm">Automatic bill generation</p>
          </div>
          <div>
            <Server className="w-10 h-10 mx-auto mb-2 text-red-600" />
            <h3 className="text-lg font-medium">IoT Integration</h3>
            <p className="text-gray-600 text-sm">ESP8266-based relay control</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white rounded-2xl shadow-md px-6 md:px-20">
        <h2 className="text-3xl font-semibold text-center mb-12">How It Works</h2>
        <ol className="list-decimal list-inside space-y-4 text-lg text-gray-700">
          <li>Scan the QR code to open the charging control page</li>
          <li>Login and press the "Start Charging" button</li>
          <li>Monitor your session in real-time</li>
          <li>Stop charging when done and check your bill</li>
        </ol>
      </section>
      <QrCodeGenerator url="http://192.168.171.210:5173/" /> 
      

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 mt-20">
        &copy; {new Date().getFullYear()} Smart EV Charging System. All rights reserved.
      </footer>
    </div>
  );
}
