/*
 * 🛡️ SURAKSHA SMART DEVICE - ESP32/ESP8266
 * Women's Safety IoT Device with Firebase Realtime Database
 * 
 * Features:
 * - SOS Button with instant alert
 * - GPS Location Tracking (NEO-6M)
 * - Temperature & Humidity (DHT11/DHT22)
 * - Motion Detection (PIR Sensor)
 * - Battery Level Monitoring
 * - WiFi Signal Strength
 * - Real-time Firebase Sync
 * 
 * Hardware Required:
 * - ESP32 or ESP8266 (NodeMCU)
 * - NEO-6M GPS Module (Optional)
 * - DHT11/DHT22 Sensor (Optional)
 * - PIR Motion Sensor (Optional)
 * - Push Button (SOS)
 * - LED (Status Indicator)
 * - Battery (3.7V Li-ion)
 * 
 * Libraries Required (Install via Arduino Library Manager):
 * - Firebase ESP32 Client by Mobizt
 * - DHT sensor library by Adafruit
 * - TinyGPSPlus by Mikal Hart
 */

#include <WiFi.h>           // For ESP32 (use <ESP8266WiFi.h> for ESP8266)
#include <Firebase_ESP_Client.h>
#include <addons/RTDBHelper.h>
#include <addons/TokenHelper.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ==================== CONFIGURATION ====================

// WiFi Credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Configuration
#define API_KEY "AIzaSyCnk_0PNkbovIp7i4c5k6iUpc3_fpJVvpc"
#define FIREBASE_PROJECT_ID "womern-safety"  // Your Firebase Project ID
#define USER_EMAIL "device@suraksha.com"
#define USER_PASSWORD "DevicePassword123!"   // Create this user in Firebase Auth
#define USER_UID "device_user_uid_here"      // Get this from Firebase Console > Authentication > Users

// Realtime Database Paths (User-specific for proper access control)
// Format: /users/{USER_UID}/devices/{DEVICE_ID}
#define DEVICE_PATH_BASE "/users/"
#define DEVICE_PATH_SUFFIX "/devices/"
#define SENSOR_PATH_SUFFIX "/sensors"
#define LOCATION_PATH_SUFFIX "/location"
#define SOS_PATH_SUFFIX "/sos"
#define STATUS_PATH_SUFFIX "/status"

// Device Configuration
#define DEVICE_ID "SURAKSHA_DEV_001"  // Unique ID for each device
#define SOS_BUTTON_PIN 4              // GPIO pin for SOS button
#define LED_PIN 2                     // Built-in LED or external
#define PIR_PIN 5                     // PIR Motion Sensor pin
#define DHT_PIN 15                    // DHT11/DHT22 Data pin
#define DHT_TYPE DHT11                // DHT11 or DHT22
#define GPS_RX_PIN 16                 // GPS TX connected to ESP32 RX
#define GPS_TX_PIN 17                 // GPS RX connected to ESP32 TX
#define BATTERY_PIN 34                // ADC pin for battery voltage

// Update interval (milliseconds)
#define SENSOR_UPDATE_INTERVAL 5000      // 5 seconds
#define LOCATION_UPDATE_INTERVAL 10000   // 10 seconds
#define STATUS_UPDATE_INTERVAL 3000      // 3 seconds
#define SOS_DEBOUNCE_DELAY 1000          // 1 second debounce

// ==================== GLOBAL OBJECTS ====================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
DHT dht(DHT_PIN, DHT_TYPE);
HardwareSerial gpsSerial(1);
TinyGPSPlus gps;

// ==================== VARIABLES ====================

bool signupOK = false;
unsigned long lastSensorTime = 0;
unsigned long lastLocationTime = 0;
unsigned long lastStatusTime = 0;
unsigned long lastSOSCheck = 0;
bool lastSOSState = HIGH;
bool wifiConnected = false;

// Sensor data
float temperature = 0;
float humidity = 0;
bool motionDetected = false;
float batteryLevel = 0;
int wifiSignal = 0;

// Location data
float latitude = 0;
float longitude = 0;
float speed = 0;
float altitude = 0;
int gpsSatellites = 0;

// Device status
bool isOnline = false;
String lastError = "";

// ==================== FUNCTION DECLARATIONS ====================

void connectToWiFi();
void initFirebase();
void readSensors();
void readGPS();
void readBattery();
void updateFirebase();
void checkSOSButton();
void blinkLED(int times, int delayMs);
void writeToFirebase(const String &path, const String &value);
void writeToFirebase(const String &path, int value);
void writeToFirebase(const String &path, float value);
void writeToFirebase(const String &path, bool value);

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  
  digitalWrite(LED_PIN, LOW);
  
  // Initialize sensors
  dht.begin();
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  
  Serial.println("\n\n🛡️ SURAKSHA SMART DEVICE");
  Serial.println("========================");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize Firebase
  initFirebase();
  
  // Initial blink
  blinkLED(3, 200);
  
  Serial.println("\n✅ Device initialized successfully!");
  Serial.println("Waiting for sensor data...\n");
}

// ==================== MAIN LOOP ====================

void loop() {
  unsigned long currentTime = millis();
  
  // Keep WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectToWiFi();
  }
  
  // Read SOS Button (always checking)
  checkSOSButton();
  
  // Read GPS data (continuous)
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
  
  // Read Sensors (every 5 seconds)
  if (currentTime - lastSensorTime >= SENSOR_UPDATE_INTERVAL) {
    readSensors();
    lastSensorTime = currentTime;
  }
  
  // Read GPS Location (every 10 seconds)
  if (currentTime - lastLocationTime >= LOCATION_UPDATE_INTERVAL) {
    readGPS();
    lastLocationTime = currentTime;
  }
  
  // Read Battery (every 5 seconds)
  if (currentTime - lastSensorTime >= SENSOR_UPDATE_INTERVAL) {
    readBattery();
  }
  
  // Update Firebase (every 3 seconds)
  if (currentTime - lastStatusTime >= STATUS_UPDATE_INTERVAL) {
    updateFirebase();
    lastStatusTime = currentTime;
  }
  
  // Small delay
  delay(100);
}

// ==================== FUNCTION IMPLEMENTATIONS ====================

/**
 * Connect to WiFi Network
 */
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.print(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    blinkLED(1, 100);
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
    wifiSignal = WiFi.RSSI();
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    wifiConnected = false;
    lastError = "WiFi connection failed";
  }
}

/**
 * Initialize Firebase
 */
void initFirebase() {
  Serial.println("Initializing Firebase...");
  
  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = "https://" + String(FIREBASE_PROJECT_ID) + ".firebaseio.com";
  
  // Sign up or sign in
  if (Firebase.signUp(&config, &auth, USER_EMAIL, USER_PASSWORD)) {
    Serial.println("✅ Firebase authentication successful!");
    signupOK = true;
  } else {
    Serial.println("❌ Firebase authentication failed!");
    Serial.println(config.signer.signupError.message.c_str());
    signupOK = false;
    lastError = "Firebase auth failed: " + config.signer.signupError.message;
  }
  
  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Set database read/write timeout
  config.max_token_generation_retry = 5;
}

/**
 * Read Sensor Data (Temperature, Humidity, Motion)
 */
void readSensors() {
  // Read DHT sensor
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  if (!isnan(temp)) {
    temperature = temp;
  }
  
  if (!isnan(hum)) {
    humidity = hum;
  }
  
  // Read PIR Motion Sensor
  motionDetected = digitalRead(PIR_PIN) == HIGH;
  
  Serial.print("🌡️ Temp: ");
  Serial.print(temperature);
  Serial.print("°C | 💧 Humidity: ");
  Serial.print(humidity);
  Serial.print("% | ");
  Serial.print(motionDetected ? "🏃 Motion!" : "No motion");
  Serial.println();
}

/**
 * Read GPS Location Data
 */
void readGPS() {
  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    altitude = gps.altitude.meters();
    speed = gps.speed.kmph();
    gpsSatellites = gps.satellites.value();
    
    Serial.print("📍 Location: ");
    Serial.print(latitude, 6);
    Serial.print(", ");
    Serial.print(longitude, 6);
    Serial.print(" (");
    Serial.print(gpsSatellites);
    Serial.print(" sats)");
    Serial.println();
  } else {
    Serial.println("📍 GPS: Waiting for satellites...");
  }
}

/**
 * Read Battery Level (ADC)
 */
void readBattery() {
  int adcValue = analogRead(BATTERY_PIN);
  float voltage = adcValue * (3.3 / 4095.0) * 2;  // Voltage divider (2:1)
  batteryLevel = map(voltage * 100, 300, 420, 0, 100);  // 3.0V - 4.2V
  
  if (batteryLevel < 0) batteryLevel = 0;
  if (batteryLevel > 100) batteryLevel = 100;
  
  Serial.print("🔋 Battery: ");
  Serial.print(batteryLevel);
  Serial.println("%");
}

/**
 * Update Firebase Realtime Database
 */
void updateFirebase() {
  if (!signupOK || !wifiConnected) {
    isOnline = false;
    return;
  }

  isOnline = true;

  // Update WiFi signal
  wifiSignal = WiFi.RSSI();

  // Build full paths: /users/{USER_UID}/devices/{DEVICE_ID}/...
  String devicePath = String(DEVICE_PATH_BASE) + String(USER_UID) + String(DEVICE_PATH_SUFFIX) + String(DEVICE_ID);
  String sensorPath = devicePath + String(SENSOR_PATH_SUFFIX);
  String locationPath = devicePath + String(LOCATION_PATH_SUFFIX);
  String statusPath = devicePath + String(STATUS_PATH_SUFFIX);
  String sosPath = devicePath + String(SOS_PATH_SUFFIX);

  // Write sensor data
  Firebase.RTDB.setFloat(&fbdo, sensorPath + "/temperature", temperature);
  Firebase.RTDB.setFloat(&fbdo, sensorPath + "/humidity", humidity);
  Firebase.RTDB.setBool(&fbdo, sensorPath + "/motion", motionDetected);

  // Write location data
  Firebase.RTDB.setFloat(&fbdo, locationPath + "/latitude", latitude);
  Firebase.RTDB.setFloat(&fbdo, locationPath + "/longitude", longitude);
  Firebase.RTDB.setFloat(&fbdo, locationPath + "/altitude", altitude);
  Firebase.RTDB.setFloat(&fbdo, locationPath + "/speed", speed);
  Firebase.RTDB.setInt(&fbdo, locationPath + "/satellites", gpsSatellites);
  Firebase.RTDB.setBool(&fbdo, locationPath + "/gpsValid", gps.location.isValid());

  // Write device status
  Firebase.RTDB.setBool(&fbdo, statusPath + "/online", isOnline);
  Firebase.RTDB.setInt(&fbdo, statusPath + "/wifiSignal", wifiSignal);
  Firebase.RTDB.setFloat(&fbdo, statusPath + "/battery", batteryLevel);
  Firebase.RTDB.setInt(&fbdo, statusPath + "/lastUpdate", millis());
  Firebase.RTDB.setString(&fbdo, statusPath + "/lastError", lastError);

  // Write device info
  Firebase.RTDB.setString(&fbdo, devicePath + "/deviceId", DEVICE_ID);
  Firebase.RTDB.setBool(&fbdo, devicePath + "/online", isOnline);
  Firebase.RTDB.setInt(&fbdo, devicePath + "/lastSeen", millis());

  Serial.println("✅ Firebase updated!");
  Serial.print("Path: ");
  Serial.println(devicePath);
}

/**
 * Check SOS Button and Trigger Alert
 */
void checkSOSButton() {
  if (millis() - lastSOSCheck < SOS_DEBOUNCE_DELAY) {
    return;
  }

  bool sosState = digitalRead(SOS_BUTTON_PIN);

  // Button pressed (LOW because of INPUT_PULLUP)
  if (sosState == LOW && lastSOSState == HIGH) {
    Serial.println("\n🚨 SOS BUTTON PRESSED! 🚨");
    blinkLED(10, 100);

    // Build SOS path: /users/{USER_UID}/devices/{DEVICE_ID}/sos
    String sosPath = String(DEVICE_PATH_BASE) + String(USER_UID) + String(DEVICE_PATH_SUFFIX) + String(DEVICE_ID) + String(SOS_PATH_SUFFIX);

    // Write SOS alert to Firebase
    Firebase.RTDB.setBool(&fbdo, sosPath + "/active", true);
    Firebase.RTDB.setInt(&fbdo, sosPath + "/timestamp", millis());
    Firebase.RTDB.setFloat(&fbdo, sosPath + "/latitude", latitude);
    Firebase.RTDB.setFloat(&fbdo, sosPath + "/longitude", longitude);
    Firebase.RTDB.setString(&fbdo, sosPath + "/message", "EMERGENCY! Need immediate help!");

    Serial.println("✅ SOS alert sent to Firebase!");
    Serial.print("SOS Path: ");
    Serial.println(sosPath);

    delay(2000);  // Debounce delay
  }

  lastSOSState = sosState;
  lastSOSCheck = millis();
}

/**
 * Blink LED for status indication
 */
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(delayMs);
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(delayMs);
  }
}

/**
 * Write String to Firebase (helper)
 */
void writeToFirebase(const String &path, const String &value) {
  if (signupOK && wifiConnected) {
    Firebase.RTDB.setString(&fbdo, path, value);
  }
}

/**
 * Write Int to Firebase (helper)
 */
void writeToFirebase(const String &path, int value) {
  if (signupOK && wifiConnected) {
    Firebase.RTDB.setInt(&fbdo, path, value);
  }
}

/**
 * Write Float to Firebase (helper)
 */
void writeToFirebase(const String &path, float value) {
  if (signupOK && wifiConnected) {
    Firebase.RTDB.setFloat(&fbdo, path, value);
  }
}

/**
 * Write Bool to Firebase (helper)
 */
void writeToFirebase(const String &path, bool value) {
  if (signupOK && wifiConnected) {
    Firebase.RTDB.setBool(&fbdo, path, value);
  }
}
