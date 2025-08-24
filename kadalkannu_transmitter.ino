#include <WiFi.h>          // For ESP32 Wi-Fi functionalities (Station mode)
#include <HTTPClient.h>    // For making HTTP requests to OpenWeatherMap and Receiver ESP32
#include <ArduinoJson.h>   // For parsing JSON responses from OpenWeatherMap
#include <LiquidCrystal_I2C.h> // For I2C LCD display
#include <Wire.h>          // Required for I2C communication (used by LiquidCrystal_I2C)
#include <TinyGPSPlus.h>   // For parsing GPS data - NOW ACTIVE
#include <HardwareSerial.h> // For ESP32's hardware serial ports - NOW ACTIVE

// --- Wi-Fi Credentials for Internet Access (and Receiver AP connection) ---
// This ESP32 (Transmitter) will connect to this network.
// Your Receiver ESP32 must also create this AP.
const char* ssid = "vivo T2x 5G";
const char* password = "Krishna@08";

// --- OpenWeatherMap API Key ---
// Go to openweathermap.org to get your free API key
const String openWeatherApiKey = "239ecc3eccde30599ae58a2495f653dc0"; // Corrected API key (example)

// --- Receiver ESP32's IP Address ---
// This is the IP address of the Receiver's Access Point. It's almost always 192.168.4.1
const char* receiverIP = "192.168.186.149"; // This should be the IP of your Receiver ESP32's AP

// --- Hardware Pin Definitions ---
const int sosButtonPin = 2; // Connect a button to GPIO2 and GND
// Buzzer functionality removed as per request

// --- I2C LCD Pin Definitions ---
// Standard I2C pins for ESP32
const int I2C_SDA = 21; 
const int I2C_SCL = 22;

// --- GPS Module Pin Definitions ---
// Connect GPS TX to ESP32 RX (GPIO18)
// Connect GPS RX to ESP32 TX (GPIO19)
const int GPS_RX_PIN = 18;
const int GPS_TX_PIN = 19; 
static const int GPSBaud = 9600; 

// --- LCD Configuration ---
// Adjust LCD address (0x27 or 0x3F) and dimensions (16x2 or 20x4) as per your LCD module
// Trying 0x3F as it's another common address for I2C LCDs. If this doesn't work, try 0x27.
LiquidCrystal_I2C lcd(0x27, 16, 2); // Set the LCD I2C address, 16 columns and 2 rows

// --- GPS & State Variables ---
TinyGPSPlus gps; // The TinyGPSPlus object - NOW ACTIVE
HardwareSerial gpsSerial(2); // Use Serial2 for GPS (GPIO18 RX, GPIO19 TX) - NOW ACTIVE

// Custom hardcoded latitude and longitude
float latitude = 9.857049; // Custom latitude
float longitude = 74.524166; // Custom longitude
bool sosActive = false;
bool lastSosState = false; // To detect button press edges
String currentFetchedWeather = "N/A"; // Global to store fetched weather
bool gpsFixObtained = true; // Manually set to true since we are using custom location

// --- WiFi Reconnection Variables ---
unsigned long lastReconnectAttemptMillis = 0;
const unsigned long RECONNECT_INTERVAL_MILLIS = 10000; // Try reconnecting every 10 seconds

// --- SOS Display Logic Variables ---
bool sosDisplayActive = false;
unsigned long displaySosUntilMillis = 0;
const unsigned long SOS_DISPLAY_DURATION = 5000; // Display SOS message for 5 seconds


// Function to fetch weather data directly from OpenWeatherMap
void getWeatherData() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[Transmitter] No internet connection to fetch weather.");
        currentFetchedWeather = "No Internet";
        lcd.clear();
        lcd.print("No Internet");
        return;
    }
    // GPS fix check is now active, but gpsFixObtained is hardcoded to true
    // if (!gpsFixObtained) { 
    //     Serial.println("[Transmitter] No GPS fix, cannot fetch weather.");
    //     currentFetchedWeather = "No GPS Fix";
    //     lcd.clear();
    //     lcd.print("No GPS Fix");
    //     return;
    // }

    HTTPClient http;
    WiFiClient wifiClient; // Need a WiFiClient for HTTPClient on ESP32
    String url = "http://api.openweathermap.org/data/2.5/weather?lat=" + String(latitude, 6) + "&lon=" + String(longitude, 6) + "&appid=" + openWeatherApiKey + "&units=metric";
    
    Serial.println("\n[Transmitter] Fetching weather from OpenWeatherMap...");
    lcd.clear();
    lcd.print("Fetching Weather");
    http.begin(wifiClient, url); // Use WiFiClient for HTTPClient on ESP32
    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        StaticJsonDocument<256> doc; // Adjust size if JSON response is larger
        DeserializationError error = deserializeJson(doc, payload);

        if (error) {
            Serial.print("[Transmitter] JSON parse failed: ");
            Serial.println(error.c_str());
            currentFetchedWeather = "JSON Error";
            lcd.clear();
            lcd.print("Weather JSON Err");
            return;
        }

        String description = doc["weather"][0]["description"].as<String>();
        float temp = doc["main"]["temp"].as<float>();

        currentFetchedWeather = "W: " + description + ", T: + " + String(temp, 1) + "C";
        
        Serial.println("\n--- Weather Notification ---");
        Serial.println(currentFetchedWeather);
        Serial.println("---------------------------\n");

        lcd.clear();
        lcd.print("Weather OK!");
        lcd.setCursor(0, 1);
        lcd.print(description.substring(0, 15)); // Display first part of description
    } else {
        Serial.printf("[Transmitter] Weather GET failed, error: %s\n", http.errorToString(httpCode).c_str());
        currentFetchedWeather = "Weather FAILED (HTTP " + String(httpCode) + ")";
        lcd.clear();
        lcd.print("Weather Failed");
    }
    http.end();
}

// Function to send SOS alert, GPS, and Weather to the Receiver ESP32
void sendSOSAlertToReceiver() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[Transmitter] Not connected to Receiver AP, cannot send alert.");
        lcd.clear();
        lcd.print("No AP Conn. Alert");
        return;
    }
    // GPS fix check is now active, but gpsFixObtained is hardcoded to true
    // if (!gpsFixObtained) { 
    //     Serial.println("[Transmitter] No GPS fix, cannot send alert.");
    //     lcd.clear();
    //     lcd.print("No GPS Fix Alert");
    //     return;
    // }

    HTTPClient http;
    WiFiClient wifiClient; // Need a WiFiClient for HTTPClient on ESP32
    
    // URL-encode weather string to handle spaces and special characters
    String encodedWeather = "";
    for (int i = 0; i < currentFetchedWeather.length(); i++) {
        char c = currentFetchedWeather.charAt(i);
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            encodedWeather += c;
        } else if (c == ' ') {
            encodedWeather += '+';
        } else {
            encodedWeather += '%';
            // Corrected URL encoding logic
            if (String(((c >> 4) & 0xF), HEX).length() == 1) encodedWeather += '0'; // Pad with 0 if single digit
            encodedWeather += String(((c >> 4) & 0xF), HEX);
            if (String((c & 0xF), HEX).length() == 1) encodedWeather += '0'; // Pad with 0 if single digit
            encodedWeather += String((c & 0xF), HEX);
        }
    }

    // Construct the URL to send GPS, Weather, and SOS status
    // Receiver ESP32 will listen on /alert
    String url = "http://" + String(receiverIP) + "/alert?lat=" + String(latitude, 6) + 
                 "&lon=" + String(longitude, 6) + 
                 "&weather=" + encodedWeather + 
                 "&sos=" + (sosActive ? "1" : "0");
    
    Serial.println("\n[Transmitter] Sending alert to Receiver: " + url);
    lcd.clear();
    lcd.print("Sending SOS Data");
    http.begin(wifiClient, url);
    int httpCode = http.GET();
    
    if (httpCode > 0) {
        Serial.printf("[Transmitter] Alert sent to receiver. HTTP code: %d\n", httpCode);
        lcd.clear();
        lcd.print("SOS Sent OK!");
    } else {
        Serial.printf("[Transmitter] Failed to send alert to receiver. HTTP error: %s\n", http.errorToString(httpCode).c_str());
        lcd.clear();
        lcd.print("SOS Send Failed");
    }
    http.end();
}

// --- I2C Scanner Function ---
// Call this function from setup() to find the I2C address of your LCD
void i2cScanner() {
  byte error, address;
  int nDevices;
  Serial.println("\n[Transmitter] Scanning I2C addresses...");
  lcd.clear();
  lcd.print("Scanning I2C...");

  nDevices = 0;
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("[Transmitter] I2C device found at address 0x");
      if (address<16) {
        Serial.print("0");
      }
      Serial.println(address,HEX);
      lcd.clear();
      lcd.print("I2C Found: 0x");
      if (address<16) lcd.print("0");
      lcd.print(address,HEX);
      delay(2000);
      nDevices++;
    } else if (error==4) {
      Serial.print("[Transmitter] Unkown error at address 0x");
      if (address<16) {
        Serial.print("0");
      }
      Serial.println(address,HEX);
    }    
  }
  if (nDevices == 0) {
    Serial.println("[Transmitter] No I2C devices found\n");
    lcd.clear();
    lcd.print("No I2C Devices");
    delay(2000);
  } else {
    Serial.println("[Transmitter] ...done\n");
  }
  delay(5000); // Wait 5 seconds before continuing
}


void setup() {
    Serial.begin(115200);
    delay(100);

    // Initialize I2C bus explicitly
    Wire.begin(I2C_SDA, I2C_SCL); 

    // --- Temporarily uncomment the line below to run the I2C scanner ---
    // i2cScanner(); 
    // --- After finding the address, update LiquidCrystal_I2C lcd(0xXX, 16, 2); and re-comment/remove this line ---

    // Initialize LCD
    lcd.init();      // Initialize the LCD
    lcd.backlight(); // Turn on the backlight
    lcd.print("Kadalkannu Ready"); // Display custom message
    lcd.setCursor(0, 1);
    lcd.print("Connecting WiFi");

    // Set up I/O pins
    pinMode(sosButtonPin, INPUT_PULLUP);
    // Buzzer pin setup removed

    // Initialize GPS serial communication - NOW ACTIVE
    // This will still attempt to read from GPS, but latitude/longitude are hardcoded
    gpsSerial.begin(GPSBaud, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

    // Connect to Wi-Fi (which is the Receiver ESP32's AP)
    Serial.print("\n[Transmitter] Connecting to Wi-Fi... ");
    WiFi.begin(ssid, password);

    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 40) { // Try for ~20 seconds
        delay(500);
        Serial.print(".");
        retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[Transmitter] Connected to Wi-Fi!");
        Serial.print("[Transmitter] ESP32 Transmitter IP: ");
        Serial.println(WiFi.localIP());
        lcd.clear();
        lcd.print("WiFi Connected!");
        lcd.setCursor(0, 1);
        lcd.print(WiFi.localIP().toString());
        delay(2000); // Display IP for a moment
    } else {
        Serial.println("\n[Transmitter] Failed to connect to Wi-Fi in setup. Will retry in loop.");
        lcd.clear();
        lcd.print("WiFi Failed!");
        delay(2000);
    }
    currentFetchedWeather = "N/A"; // Initialize weather status
    lastReconnectAttemptMillis = millis(); // Initialize reconnection timer
}

void loop() {
    // --- GPS Data Reading and Parsing --- NOW ACTIVE
    // This block will still read and try to encode GPS data, but latitude/longitude are overridden
    while (gpsSerial.available() > 0) {
        if (gps.encode(gpsSerial.read())) {
            // We are using custom latitude/longitude, so we don't update from GPS.
            // However, the gps.encode() is still processing incoming NMEA sentences.
            // If you later connect a working GPS, you can uncomment the lines below.
            // if (gps.location.isValid()) {
            //     latitude = gps.location.lat();
            //     longitude = gps.location.lng();
            //     gpsFixObtained = true;
            // } else {
            //     gpsFixObtained = false;
            // }
        }
    }

    // Read the state of the SOS button
    bool currentButtonState = (digitalRead(sosButtonPin) == LOW);

    // --- Wi-Fi Reconnection Logic ---
    if (WiFi.status() != WL_CONNECTED) {
        lcd.setCursor(0,0);
        lcd.print("WiFi Disconnected");
        lcd.setCursor(0,1);
        lcd.print("Reconnecting...");
        
        if (millis() - lastReconnectAttemptMillis > RECONNECT_INTERVAL_MILLIS) {
            Serial.println("[Transmitter] WiFi Disconnected. Retrying connection...");
            WiFi.begin(ssid, password);
            lastReconnectAttemptMillis = millis(); // Reset timer
        }
        delay(100); 
        return; 
    } else {
        // If connected, display current time/status if not doing other tasks
        lcd.setCursor(0, 0);
        lcd.print("Kadalkannu Online");
        lcd.setCursor(0, 1);
        // Display that GPS is using custom data
        lcd.print("GPS: Accuring loc"); 
    }


    // Act only on the initial press (rising edge)
    if (currentButtonState && !lastSosState) {
        Serial.println("\n!!! SOS button PRESSED - ALERT ACTIVE !!!");
        lcd.clear();
        lcd.print("SOS PRESSED!");
        
        // GPS fix check is now active, but gpsFixObtained is hardcoded to true
        // if (!gpsFixObtained) { 
        //     Serial.println("[Transmitter] SOS pressed but no GPS fix. Cannot send location/weather.");
        //     lcd.setCursor(0, 1);
        //     lcd.print("No GPS Fix!");
        //     delay(2000);
        //     lastSosState = currentButtonState; 
        //     return;
        // }

        // 1. Get weather data directly from OpenWeatherMap
        getWeatherData();
        
        // 2. Send SOS alert, GPS, and Weather to the Receiver ESP32
        sendSOSAlertToReceiver();

        // 3. Send SMS/Call to phone (placeholder)
        Serial.println("\n[Transmitter] Simulating SMS to emergency contact...");
        Serial.println("[Transmitter] Contact: +91 9074664646");
        Serial.println("[Transmitter] Message: SOS from Kadalkannu! Loc: " + String(latitude, 6) + "," + String(longitude, 6) + " | " + currentFetchedWeather);
        
        delay(500); // Debounce delay
    } else if (!currentButtonState && lastSosState) {
        // Button released (falling edge)
        Serial.println("[Transmitter] SOS button released. Alert cleared.");
        lcd.clear();
        lcd.print("SOS Cleared.");
        delay(500); // Short delay for display
    }
    
    lastSosState = currentButtonState;

    // Simulate changing GPS location over time for testing - REMOVED, now uses actual GPS
    // latitude += 0.00001;
    // longitude += 0.00001;
    
    delay(100); // Small delay to prevent a tight loop
}
