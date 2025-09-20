#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <FastLED.h>
#include <ArduinoJson.h>

// BLE UUIDs - must match the web UI
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "87654321-4321-4321-4321-cba987654321"

// Standard BLE services for better compatibility
#define DEVICE_INFO_SERVICE_UUID "0000180a-0000-1000-8000-00805f9b34fb"
#define DEVICE_NAME_CHAR_UUID    "00002a00-0000-1000-8000-00805f9b34fb"

// Hardware pins
#define WS2811_PIN 4        // Pin for WS2811 LED strip (configurable)
#define NUM_LEDS 30         // Number of LEDs in the strip

// FastLED setup
CRGB leds[NUM_LEDS];

// BLE objects
BLEServer* pServer = NULL;
BLEService* pService = NULL;
BLEService* pDeviceInfoService = NULL;
BLECharacteristic* pCharacteristic = NULL;
BLECharacteristic* pDeviceNameChar = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Device state
String deviceName = "ESP32-LED-Controller";

// LED strip state (0=Off, 1=Red, 2=Green, 3=Blue)
uint8_t ledStripState[NUM_LEDS];

// Brightness control (0-255, default 50%)
uint8_t currentBrightness = 128;

// Color mapping
CRGB colorMap[4] = {
  CRGB::Black,   // 0 - Off
  CRGB::Red,     // 1 - Red
  CRGB::Green,   // 2 - Green
  CRGB::Blue     // 3 - Blue
};

// Server callback class to handle connection events
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("[OK] Device connected");
      Serial.print("Connected clients: ");
      Serial.println(pServer->getConnectedCount());
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("[INFO] Device disconnected");
      Serial.print("Connected clients: ");
      Serial.println(pServer->getConnectedCount());
    }
};

// Characteristic callback class to handle incoming commands
class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String rxValue = pCharacteristic->getValue();

      if (rxValue.length() > 0) {
        Serial.print("[RX] Received command: '");
        Serial.print(rxValue.c_str());
        Serial.print("' (");
        Serial.print(rxValue.length());
        Serial.println(" bytes)");

        // Process JSON command for LED grid configuration
        if (rxValue[0] == '{') {
          handleLEDGridCommand(rxValue);
        } else {
          Serial.print("[WARN] Unknown command format: ");
          Serial.println(rxValue.c_str());
        }
      }
    }

    void handleLEDGridCommand(String jsonCommand) {
      // Parse JSON command
      DynamicJsonDocument doc(2048);
      DeserializationError error = deserializeJson(doc, jsonCommand);
      
      if (error) {
        Serial.print("[ERROR] JSON parsing failed: ");
        Serial.println(error.c_str());
        return;
      }

      String commandType = doc["type"];
      
      if (commandType == "led_grid") {
        JsonArray ledData = doc["data"];
        
        if (ledData.size() != NUM_LEDS) {
          Serial.print("[ERROR] Invalid LED data size: ");
          Serial.print(ledData.size());
          Serial.print(" (expected ");
          Serial.print(NUM_LEDS);
          Serial.println(")");
          return;
        }

        Serial.println("[PROC] Processing LED grid configuration...");
        
        // Update LED strip state and colors
        for (int i = 0; i < NUM_LEDS; i++) {
          uint8_t colorValue = ledData[i];
          
          if (colorValue > 3) {
            Serial.print("[ERROR] Invalid color value at LED ");
            Serial.print(i + 1);
            Serial.print(": ");
            Serial.println(colorValue);
            colorValue = 0; // Default to off
          }
          
          ledStripState[i] = colorValue;
          leds[i] = colorMap[colorValue];
        }
        
        // Update the LED strip
        FastLED.show();
        
        // Print status
        int onCount = 0;
        for (int i = 0; i < NUM_LEDS; i++) {
          if (ledStripState[i] != 0) onCount++;
        }
        
        Serial.print("[OK] LED strip updated: ");
        Serial.print(onCount);
        Serial.print(" LEDs ON, ");
        Serial.print(NUM_LEDS - onCount);
        Serial.println(" LEDs OFF");
        
        // Debug: Print first few LED states
        Serial.print("[DEBUG] First 10 LEDs: ");
        for (int i = 0; i < min(10, NUM_LEDS); i++) {
          Serial.print(ledStripState[i]);
          if (i < min(9, NUM_LEDS - 1)) Serial.print(",");
        }
        Serial.println();

      } else if (commandType == "brightness") {
        uint8_t brightnessValue = doc["value"];

        if (brightnessValue > 255) {
          Serial.print("[ERROR] Invalid brightness value: ");
          Serial.println(brightnessValue);
          return;
        }

        currentBrightness = brightnessValue;
        FastLED.setBrightness(currentBrightness);
        FastLED.show(); // Apply brightness change to current LED state

        int brightnessPercent = (currentBrightness * 100) / 255;
        Serial.print("[OK] Brightness set to ");
        Serial.print(brightnessPercent);
        Serial.print("% (");
        Serial.print(currentBrightness);
        Serial.println("/255)");

      } else {
        Serial.print("[WARN] Unknown command type: ");
        Serial.println(commandType);
      }
    }
};




void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  Serial.println();
  Serial.println("[INIT] ESP32 LED Grid Controller Starting...");
  Serial.println("=========================================");


  // Initialize FastLED
  FastLED.addLeds<WS2811, WS2811_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(currentBrightness); // Set to default brightness
  
  // Initialize LED strip state (all off)
  for (int i = 0; i < NUM_LEDS; i++) {
    ledStripState[i] = 0;
    leds[i] = CRGB::Black;
  }
  FastLED.show();
  
  Serial.println("[INIT] WS2811 LED strip initialized:");
  Serial.println("   - Pin: GPIO " + String(WS2811_PIN));
  Serial.println("   - LEDs: " + String(NUM_LEDS));
  Serial.println("   - Brightness: " + String((currentBrightness * 100) / 255) + "%");

  // Create the BLE Device
  BLEDevice::init(deviceName.c_str());
  Serial.println("[BLE] Device initialized as: " + deviceName);

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  Serial.println("[BLE] Server created");

  // Create the main BLE Service
  pService = pServer->createService(SERVICE_UUID);
  Serial.println("[BLE] Main service created: " + String(SERVICE_UUID));

  // Create Device Information Service
  pDeviceInfoService = pServer->createService(DEVICE_INFO_SERVICE_UUID);
  Serial.println("[BLE] Device Info service created: " + String(DEVICE_INFO_SERVICE_UUID));

  // Create Device Name characteristic
  pDeviceNameChar = pDeviceInfoService->createCharacteristic(
                      DEVICE_NAME_CHAR_UUID,
                      BLECharacteristic::PROPERTY_READ
                    );
  pDeviceNameChar->setValue(deviceName.c_str());
  Serial.println("[BLE] Device Name characteristic created");

  // Create the main characteristic for receiving commands
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_WRITE |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Set the callback for characteristic writes
  pCharacteristic->setCallbacks(new MyCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());
  Serial.println("[BLE] Main characteristic created: " + String(CHARACTERISTIC_UUID));

  // Start services
  pDeviceInfoService->start();
  pService->start();
  Serial.println("[BLE] Services started");

  // Configure advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->addServiceUUID(DEVICE_INFO_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  
  BLEAdvertisementData advertisementData;
  advertisementData.setName(deviceName.c_str());
  advertisementData.setCompleteServices(BLEUUID(SERVICE_UUID));
  pAdvertising->setAdvertisementData(advertisementData);
  
  BLEAdvertisementData scanResponseData;
  scanResponseData.setCompleteServices(BLEUUID(DEVICE_INFO_SERVICE_UUID));
  pAdvertising->setScanResponseData(scanResponseData);

  // Start advertising
  BLEDevice::startAdvertising();
  
  Serial.println("[BLE] Advertising started");
  Serial.println("[BLE] Device discoverable as: '" + deviceName + "'");
  Serial.println("[INFO] Service UUID: " + String(SERVICE_UUID));
  Serial.println("[INFO] Characteristic UUID: " + String(CHARACTERISTIC_UUID));
  Serial.println("[INFO] Waiting for client connection...");
  Serial.println("=========================================");
  
  Serial.println();
  Serial.println("[INFO] Command Support:");
  Serial.println("   LED Grid: {\"type\":\"led_grid\",\"data\":[0,1,2,3,...]}");
  Serial.println("   Brightness: {\"type\":\"brightness\",\"value\":0-255}");
  Serial.println("   Colors: 0=Off, 1=Red, 2=Green, 3=Blue");
  Serial.println();
}

void loop() {
  // Handle disconnection and restart advertising
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Restarting advertising after disconnect...");
    oldDeviceConnected = deviceConnected;
  }
  
  // Handle new connection
  if (deviceConnected && !oldDeviceConnected) {
    Serial.println("[OK] Client connected successfully!");
    Serial.println("[INFO] Ready to receive LED Grid JSON commands");
    oldDeviceConnected = deviceConnected;
  }

  // Small delay for loop efficiency
  delay(100);
}