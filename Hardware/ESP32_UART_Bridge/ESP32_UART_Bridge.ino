#include <WiFi.h>
#include <WebServer.h>

// ==========================================
// 🔧 CONFIGURATION SECTION
// ==========================================
const char* ssid = "wifi";
const char* password = "0987654321";

WebServer server(80);

// ESP32 Hardware Serial 2 pins for communicating with STM32
#define RXD2 16  // RX0 is GPIO 3
#define TXD2 17  // TX0 is GPIO 1

// Physical GPIO pin to signal STM32 when charging starts
const int SIGNAL_PIN = 15; // Change to any available GPIO pin you prefer (e.g., 4 = D4)

// Buffer to store the latest JSON data coming from STM32 UART
String latestTelemetry = "{\"power_kW\":0, \"voltage\":0, \"current\":0, \"energyConsumed_kWh\":0}";

// Variables for parsing STM32 strings
float current_V = 0.0;
float current_I = 0.0;
float current_SOC = 0.0;

// Variables for calculating energy
float chargerEfficiency = 0.92; // Set charger efficiency (92% as default)
bool chargingActive = false;
unsigned long startTime = 0;

void setup() {
  Serial.begin(115200);   // Debugging to your PC
  
  // STM32 UART Communication Setup
  Serial2.begin(115200, SERIAL_8N1, RXD2, TXD2); 
  
  // Set up the signal pin
  pinMode(SIGNAL_PIN, OUTPUT);
  digitalWrite(SIGNAL_PIN, LOW); // Start with signal OFF
  
  Serial.println("Starting ESP32 UART Bridge...");

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi connected!");
  Serial.print("⚡ IP Address: ");
  Serial.println(WiFi.localIP());

  // Backend Endpoints
  server.on("/start", handleStart);
  server.on("/stop", handleStop);
  server.on("/live-data", handleLiveData);

  server.begin();
}

void loop() {
  // 1. Listen for HTTP commands from Node.js
  server.handleClient();
  
  // 2. Continually listen for UART data coming from STM32
  if (Serial2.available()) {
    String incoming = Serial2.readStringUntil('\n');  // STM32 sends data ending with \n
    incoming.trim();
    
    if (incoming.length() > 0) {
      // Serial.println("STM32: " + incoming); // Uncomment for debugging

      // If STM32 sends JSON (fallback format)
      if (incoming.startsWith("{")) {
         latestTelemetry = incoming;
      }
      else {
        // Handle Error from STM32 first
        if (incoming.startsWith("Error")) {
          chargingActive = false;
          digitalWrite(SIGNAL_PIN, LOW);
          Serial2.println("CMD:STOP"); // Signal STM32 to stop just in case
          Serial.println("❌ Received Error from STM32, FORCE STOP.");
          
          // Append fault state to the most recent telemetry JSON
          latestTelemetry.replace("}", ", \"fault\":\"HARDWARE_CAN_ERROR\"}");
          return; // Skip rest of parsing
        }

        // Parse Voltage & Current: "V: 400.00 V, I: 10.00 A"
        if (incoming.startsWith("V:")) {
          int vIndex = incoming.indexOf("V: ") + 3;
          int vEnd = incoming.indexOf(" V,");
          int iIndex = incoming.indexOf("I: ") + 3;
          int iEnd = incoming.indexOf(" A");
          
          if (vIndex > 2 && vEnd > vIndex && iIndex > 2 && iEnd > iIndex) {
            current_V = incoming.substring(vIndex, vEnd).toFloat();
            current_I = incoming.substring(iIndex, iEnd).toFloat();
          }
        } 
        // Parse SOC: "SOC: 85.00 %"
        else if (incoming.startsWith("SOC:")) {
          int socInd = incoming.indexOf("SOC: ") + 5;
          int socEnd = incoming.indexOf(" %");
          if (socInd > 4 && socEnd > socInd) {
            current_SOC = incoming.substring(socInd, socEnd).toFloat();
          }
        }

        // Calculate power ( factoring in charger efficiency )
        float outputPower_kW = (current_V * current_I) / 1000.0;
        float inputPower_kW = outputPower_kW / chargerEfficiency;

        // Calculate energy drawn from the grid
        float energyConsumed_kWh = 0.0;
        unsigned long durationSecs = 0;
        if (chargingActive) {
           durationSecs = (millis() - startTime) / 1000;
           energyConsumed_kWh = (durationSecs / 3600.0) * inputPower_kW;
        }

        // Reconstruct the JSON format string that the Node.js backend expects
        latestTelemetry = "{";
        latestTelemetry += "\"voltage\":" + String(current_V, 2) + ",";
        latestTelemetry += "\"current\":" + String(current_I, 2) + ",";
        latestTelemetry += "\"power_kW\":" + String(inputPower_kW, 2) + ",";
        latestTelemetry += "\"soc\":" + String(current_SOC, 2) + ",";
        latestTelemetry += "\"timeElapsed_sec\":" + String(durationSecs) + ",";
        latestTelemetry += "\"energyConsumed_kWh\":" + String(energyConsumed_kWh, 4);
        latestTelemetry += "}";
      }
    }
  }
}

// ------------------------------------------
// API ENDPOINTS (Node.js -> ESP32 -> STM32)
// ------------------------------------------

void handleStart() {
  chargingActive = true;
  startTime = millis();
  
  // Turn ON the physical GPIO signal pin to STM32
  digitalWrite(SIGNAL_PIN, HIGH);
  
  // Command STM32 to pull-in the Economizer Circuit Contactor
  Serial2.println("CMD:START");
  Serial.println("Sent START to STM32, Set SIGNAL_PIN HIGH");
  
  server.send(200, "application/json", "{\"message\": \"Started\"}");
}

void handleStop() {
  chargingActive = false;
  
  // Turn OFF the physical GPIO signal pin to STM32
  digitalWrite(SIGNAL_PIN, LOW);
  
  // Command STM32 to drop the Economizer Contactor
  Serial2.println("CMD:STOP");
  Serial.println("Sent STOP to STM32, Set SIGNAL_PIN LOW");
  
  // Wait briefly for STM32 to process
  delay(200); 
  
  // Read any pending data so the final telemetry JSON is somewhat accurate
  while(Serial2.available()){
      String finalData = Serial2.readStringUntil('\n');
      finalData.trim();
      // We will rely on latestTelemetry that was constructed in the loop
  }

  // Forward the final JSON string back to the Node.js Backend
  server.send(200, "application/json", latestTelemetry);
}

void handleLiveData() {
  // Forward the latest parsed battery CAN metrics from STM32 to Node.js Backend
  server.send(200, "application/json", latestTelemetry);
}
