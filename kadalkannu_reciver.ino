#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "vivo T2x 5G";
const char* password = "Krishna@08";

ESP8266WebServer server(80);

float current_latitude = 0.0;
float current_longitude = 0.0;
bool sos_alert_active = false;
unsigned long last_update_time = 0;

void handleRoot() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>Kadal Kannu - Live Status</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial; background-color: #f0f8ff; text-align: center; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px auto; max-width: 400px; }
    .alert { color: red; font-weight: bold; animation: blink 1s linear infinite; }
    .normal { color: green; font-weight: bold; }
    @keyframes blink { 50% { opacity: 0; } }
  </style>
</head>
<body>
  <div class="card">
    <h2>Boat Location</h2>
    <p>Latitude: <span id="lat">--</span></p>
    <p>Longitude: <span id="lon">--</span></p>
    <p>SOS Alert: <span id="status" class="normal">INACTIVE</span></p>
    <p>Last Update: <span id="time">Never</span></p>
  </div>
  <script>
    setInterval(() => {
      fetch('/data')
        .then(res => res.json())
        .then(data => {
          document.getElementById('lat').innerText = data.lat.toFixed(6);
          document.getElementById('lon').innerText = data.lon.toFixed(6);
          document.getElementById('time').innerText = data.time + 's ago';
          const status = document.getElementById('status');
          if (data.sos) {
            status.innerText = 'ACTIVE!';
            status.className = 'alert';
          } else {
            status.innerText = 'INACTIVE';
            status.className = 'normal';
          }
        });
    }, 2000);
  </script>
</body>
</html>
)rawliteral";
  server.send(200, "text/html", html);
}

void handleData() {
  String json = "{";
  json += "\"lat\":" + String(current_latitude, 6);
  json += ",\"lon\":" + String(current_longitude, 6);
  json += ",\"sos\":" + String(sos_alert_active ? "true" : "false");
  json += ",\"time\":" + String((millis() - last_update_time) / 1000);
  json += "}";
  server.send(200, "application/json", json);
}

void handleUpdate() {
  if (server.hasArg("lat") && server.hasArg("lon") && server.hasArg("sos")) {
    current_latitude = server.arg("lat").toFloat();
    current_longitude = server.arg("lon").toFloat();
    sos_alert_active = server.arg("sos").toInt() == 1;
    last_update_time = millis();
    Serial.printf("Received: Lat=%.6f, Lon=%.6f, SOS=%d\n", current_latitude, current_longitude, sos_alert_active);
    server.send(200, "text/plain", "OK");
  } else {
    server.send(400, "text/plain", "Bad Request");
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("ESP8266 IP: ");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.on("/update", HTTP_POST, handleUpdate);

  server.begin();
  Serial.println("Server started");
}

void loop() {
  server.handleClient();
}
