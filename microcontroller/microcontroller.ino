#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#ifndef PHOTOMETRIX_HOST_TEST
#include <Arduino.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <WiFi.h>
#include <Wire.h>
#include <cJSON.h>
#include <esp_random.h>
#include <esp_sntp.h>
#include <sys/time.h>

// Fill Wi-Fi and app-issued device credentials for each student's module.
// The public cloud origin/CA are prefilled; change them only for a verified deployment update.
// Keep real secrets private.
const char WIFI_SSID[] = "YOUR_WIFI_SSID";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
const char SERVER_BASE_URL[] = "https://api-production-60e6d.up.railway.app"; // Origin only; no /api.
const char DEVICE_ID[] = "YOUR_DEVICE_ID_FROM_APP";
const char DEVICE_TOKEN[] = "YOUR_ONE_TIME_DEVICE_TOKEN_FROM_APP";
// ISRG Root X1, SHA-256 96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:
// CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6; expires 2035-06-04.
// Origin chain and official root publication verified 2026-10-27.
const char SERVER_ROOT_CA[] = R"PEM(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)PEM";
// END EDITABLE BLOCK. Never use an insecure TLS workaround.
#endif

constexpr uint32_t SAMPLE_INTERVAL_MS = 10000;
constexpr uint32_t HTTP_BUDGET_MS = 3500;
constexpr uint32_t HTTP_RESERVE_MS = 700;
constexpr size_t SENSOR_COUNT = 3;
constexpr double PROTOCOL_MAX_LUX = 65535.0;

bool validId(const char *value) {
  if (value == nullptr) return false;
  const size_t length = strlen(value);
  if (length == 0 || length > 128) return false;
  for (size_t index = 0; index < length; ++index) {
    const char character = value[index];
    if (!((character >= 'A' && character <= 'Z') ||
          (character >= 'a' && character <= 'z') ||
          (character >= '0' && character <= '9') ||
          character == '-' || character == '_')) return false;
  }
  return true;
}

uint32_t remainingMs(uint32_t startedAt, uint32_t budget, uint32_t now) {
  const uint32_t elapsed = now - startedAt;
  return elapsed >= budget ? 0 : budget - elapsed;
}

bool canUpload(uint32_t acquiredAt, uint32_t now) {
  return remainingMs(acquiredAt, SAMPLE_INTERVAL_MS, now) >
         HTTP_BUDGET_MS + HTTP_RESERVE_MS;
}

double decodeLux(uint16_t raw, size_t receivedBytes) {
  // Default MTreg 69, high-resolution mode: raw / 1.2; reject saturation.
  if (receivedBytes != 2 || raw == 0xFFFF) return NAN;
  return static_cast<double>(raw) / 1.2;
}

bool retryableStatus(int status) {
  return status <= 0 || status == 408 || status == 429 ||
         (status >= 500 && status <= 599);
}

bool formatPayload(char *output, size_t capacity, const char *deviceId,
                   const char *sessionId, const char *sampleId,
                   uint32_t uptimeMs, const char *sampledAt,
                   const double readings[SENSOR_COUNT]) {
  if (!validId(deviceId) || !validId(sessionId) || !validId(sampleId) ||
      sampledAt == nullptr || strlen(sampledAt) != 24) return false;
  for (size_t index = 0; index < 24; ++index) {
    const char expected = index == 4 || index == 7 ? '-' :
                          index == 10 ? 'T' : index == 13 || index == 16 ? ':' :
                          index == 19 ? '.' : index == 23 ? 'Z' : '\0';
    if (expected != '\0' ? sampledAt[index] != expected :
        sampledAt[index] < '0' || sampledAt[index] > '9') return false;
  }
  char values[SENSOR_COUNT][32];
  for (size_t index = 0; index < SENSOR_COUNT; ++index) {
    if (isfinite(readings[index]) && readings[index] >= 0 &&
        readings[index] <= PROTOCOL_MAX_LUX) {
      snprintf(values[index], sizeof(values[index]), "%.6f", readings[index]);
    } else {
      strcpy(values[index], "null");
    }
  }
  const int written = snprintf(
    output, capacity,
    "{\"deviceId\":\"%s\",\"sessionId\":\"%s\",\"sampleId\":\"%s\","
    "\"uptimeMs\":%lu,\"sampledAt\":\"%s\","
    "\"sensor1Lux\":%s,\"sensor2Lux\":%s,\"sensor3Lux\":%s}",
    deviceId, sessionId, sampleId, static_cast<unsigned long>(uptimeMs),
    sampledAt, values[0], values[1], values[2]);
  return written > 0 && static_cast<size_t>(written) < capacity;
}

#ifdef PHOTOMETRIX_HOST_TEST
#include <assert.h>

int main() {
  assert(validId("module_1-ABC") && !validId("") && !validId("bad\"id"));
  char oversizedId[130];
  memset(oversizedId, 'a', 129);
  oversizedId[129] = '\0';
  assert(!validId(oversizedId));
  assert(decodeLux(0, 2) == 0 && decodeLux(600, 2) == 500);
  assert(isnan(decodeLux(0xFFFF, 2)) && isnan(decodeLux(600, 1)));
  assert(remainingMs(UINT32_MAX - 20, 10000, 10) == 9969);
  assert(canUpload(100, 100) && !canUpload(100, 6500));
  assert(!canUpload(100, 10100));
  assert(retryableStatus(-1) && retryableStatus(429) && retryableStatus(503));
  assert(!retryableStatus(401) && !retryableStatus(409) && !retryableStatus(400));
  const double readings[SENSOR_COUNT] = {0, 500, NAN};
  char payload[1024];
  assert(formatPayload(payload, sizeof(payload), "LIGHT-01", "session-1",
                       "boot-test-1", UINT32_MAX, "2026-10-27T06:00:00.000Z", readings));
  assert(strstr(payload, "\"sensor1Lux\":0.000000") != nullptr);
  assert(strstr(payload, "\"sensor3Lux\":null") != nullptr);
  assert(strstr(payload, "average") == nullptr);
  const double invalidReadings[SENSOR_COUNT] = {INFINITY, -1, 65536};
  assert(formatPayload(payload, sizeof(payload), "LIGHT-01", "session-1", "s", 0,
                       "2026-10-27T06:00:00.000Z", invalidReadings));
  assert(strstr(payload, "\"sensor1Lux\":null,\"sensor2Lux\":null,\"sensor3Lux\":null") != nullptr);
  assert(!formatPayload(payload, 8, "LIGHT-01", "session-1", "boot-test-1", 0,
                        "2026-10-27T06:00:00.000Z", readings));
  assert(!formatPayload(payload, sizeof(payload), "bad\"id", "session-1", "s", 0,
                        "2026-10-27T06:00:00.000Z", readings));
  assert(formatPayload(payload, sizeof(payload), "LIGHT-01", "session-1",
                       "boot-test-1", UINT32_MAX, "2026-10-27T06:00:00.000Z", readings));
  puts(payload);
}
#else



constexpr uint8_t SDA_PIN = 21;
constexpr uint8_t SCL_PIN = 22;
constexpr uint8_t TCA_ADDRESS = 0x70;
constexpr uint8_t BH1750_ADDRESS = 0x23;
constexpr uint32_t WIFI_RETRY_MS = 10000;
constexpr uint32_t CLOCK_RETRY_MS = 60000;
constexpr uint32_t CLOCK_MAX_AGE_MS = 6UL * 60 * 60 * 1000;
constexpr uint32_t SOCKET_TIMEOUT_MS = 600;
constexpr size_t MAX_RESPONSE_BYTES = 2048;
constexpr uint8_t MAX_UPLOAD_ATTEMPTS = 3;

struct HttpReply {
  int status = 0;
  String body;
  uint32_t retryAfterMs = 0;
};

struct PendingSample {
  bool active = false;
  char payload[1024] = {};
  char sampleId[64] = {};
  uint32_t acquiredAt = 0;
  uint32_t nextAttemptAt = 0;
  uint8_t attempts = 0;
};

HttpReply request(const char *method, const char *path, const char *payload);
void handleFailure(const HttpReply &reply);
bool acknowledgesSample(const HttpReply &reply);

PendingSample pending;
String serverHost;
char bootId[33] = {};
uint32_t sampleCounter = 0;
uint32_t lastCycleAt = 0;
uint32_t lastWifiAttemptAt = 0;
uint32_t lastClockAttemptAt = 0;
uint32_t rateLimitedAt = 0;
uint32_t rateLimitDelayMs = 0;
bool configured = false;
bool authenticationRejected = false;
volatile bool clockSynchronized = false;
volatile uint32_t lastClockSyncAt = 0;

void onClockSync(struct timeval *) {
  lastClockSyncAt = millis();
  clockSynchronized = true;
}

bool validConfiguration() {
  const String rootCa(SERVER_ROOT_CA);
  if (String(WIFI_SSID).startsWith("YOUR_") || String(WIFI_PASSWORD).startsWith("YOUR_") ||
      strlen(WIFI_SSID) == 0 || strlen(WIFI_SSID) > 32 ||
      strlen(WIFI_PASSWORD) > 63 || !validId(DEVICE_ID) ||
      String(DEVICE_ID).startsWith("YOUR_") || !validId(DEVICE_TOKEN) ||
      strlen(DEVICE_TOKEN) != 43 ||
      rootCa.indexOf("-----BEGIN CERTIFICATE-----") < 0 ||
      rootCa.indexOf("-----END CERTIFICATE-----") < 0) return false;
  serverHost = SERVER_BASE_URL;
  if (!serverHost.startsWith("https://")) return false;
  serverHost.remove(0, 8);
  if (serverHost.endsWith("/")) serverHost.remove(serverHost.length() - 1);
  if (serverHost.length() == 0 || serverHost.length() > 253 ||
      serverHost.indexOf("YOUR-") >= 0) return false;
  for (size_t index = 0; index < serverHost.length(); ++index) {
    const char value = serverHost[index];
    if (!isalnum(static_cast<unsigned char>(value)) && value != '.' && value != '-') return false;
  }
  return true;
}

void newBootId() {
  uint32_t randomWords[4];
  esp_fill_random(randomWords, sizeof(randomWords));
  snprintf(bootId, sizeof(bootId), "%08lx%08lx%08lx%08lx",
           static_cast<unsigned long>(randomWords[0]), static_cast<unsigned long>(randomWords[1]),
           static_cast<unsigned long>(randomWords[2]), static_cast<unsigned long>(randomWords[3]));
}

void maintainNetwork() {
  const uint32_t now = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiAttemptAt >= WIFI_RETRY_MS) {
      lastWifiAttemptAt = now;
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      Serial.println("Wi-Fi reconnect requested.");
    }
    return;
  }
  if (clockSynchronized && now - lastClockSyncAt > CLOCK_MAX_AGE_MS) clockSynchronized = false;
  if (!clockSynchronized && now - lastClockAttemptAt >= CLOCK_RETRY_MS) {
    lastClockAttemptAt = now;
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    Serial.println("Clock synchronization requested; uploads wait for synchronization.");
  }
}

bool selectChannel(uint8_t channel) {
  if (channel >= SENSOR_COUNT) return false;
  Wire.beginTransmission(TCA_ADDRESS);
  Wire.write(static_cast<uint8_t>(1U << channel));
  return Wire.endTransmission() == 0;
}

bool sensorCommand(uint8_t command) {
  Wire.beginTransmission(BH1750_ADDRESS);
  Wire.write(command);
  return Wire.endTransmission() == 0;
}

void acquireSensors(double readings[SENSOR_COUNT]) {
  bool initialized[SENSOR_COUNT];
  for (uint8_t channel = 0; channel < SENSOR_COUNT; ++channel) {
    // Reinitialize each cycle, including sensors absent at startup or reset.
    initialized[channel] = selectChannel(channel) && sensorCommand(0x01) &&
      sensorCommand(0x07) && sensorCommand(0x42) && sensorCommand(0x65) &&
      sensorCommand(0x20); // Power/reset, MTreg 69, one-time high-resolution.
  }
  delay(180);
  for (uint8_t channel = 0; channel < SENSOR_COUNT; ++channel) {
    readings[channel] = NAN;
    if (initialized[channel] && selectChannel(channel)) {
      const size_t count = Wire.requestFrom(BH1750_ADDRESS, static_cast<uint8_t>(2));
      if (count == 2 && Wire.available() == 2) {
        const uint16_t raw = static_cast<uint16_t>(Wire.read()) << 8 | Wire.read();
        readings[channel] = decodeLux(raw, count);
      }
    }
    Serial.printf("Sensor %u: %s\n", channel + 1, isfinite(readings[channel]) ? "read" : "unavailable/saturated");
  }
  Wire.beginTransmission(TCA_ADDRESS);
  Wire.write(static_cast<uint8_t>(0));
  Wire.endTransmission();
}

class BoundedResponse : public Stream {
 public:
  explicit BoundedResponse(uint32_t startedAt) : startedAt_(startedAt) {}
  String body;
  bool failed = false;
  int available() override { return 0; }
  int read() override { return -1; }
  int peek() override { return -1; }
  void flush() override {}
  size_t write(uint8_t value) override { return write(&value, 1); }
  size_t write(const uint8_t *data, size_t length) override {
    if (length > MAX_RESPONSE_BYTES - body.length() ||
        remainingMs(startedAt_, HTTP_BUDGET_MS, millis()) <= HTTP_RESERVE_MS) {
      failed = true;
      return 0;
    }
    if (!body.concat(reinterpret_cast<const char *>(data), length)) {
      failed = true;
      return 0;
    }
    return length;
  }
 private:
  uint32_t startedAt_;
};

HttpReply request(const char *method, const char *path, const char *payload) {
  HttpReply reply;
  NetworkClientSecure client;
  client.setCACert(SERVER_ROOT_CA);
  client.setHandshakeTimeout(1);
  HTTPClient http;
  http.setConnectTimeout(SOCKET_TIMEOUT_MS);
  http.setTimeout(SOCKET_TIMEOUT_MS);
  http.setReuse(false);
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  if (!http.begin(client, String("https://") + serverHost + path)) return reply;
  const char *headers[] = {"Retry-After"};
  http.collectHeaders(headers, 1);
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.addHeader("Accept", "application/json");
  http.addHeader("Accept-Encoding", "identity");
  const uint32_t startedAt = millis();
  if (strcmp(method, "GET") == 0) reply.status = http.GET();
  else {
    http.addHeader("Content-Type", "application/json");
    reply.status = http.POST(String(payload));
  }
  if (reply.status > 0) {
    const String retryAfter = http.header("Retry-After");
    char *end = nullptr;
    const long seconds = strtol(retryAfter.c_str(), &end, 10);
    if (*end == '\0' && seconds > 0) reply.retryAfterMs = static_cast<uint32_t>(min(seconds, 3600L)) * 1000;
    BoundedResponse response(startedAt);
    const bool bodyFits = http.getSize() <= static_cast<int>(MAX_RESPONSE_BYTES);
    if (bodyFits && http.writeToStream(&response) >= 0 && !response.failed) reply.body = response.body;
    else if (reply.status >= 200 && reply.status < 300) reply.status = 0;
  }
  http.end();
  return reply;
}

const char *safeErrorCode(const String &body) {
  static const char *codes[] = {"VALIDATION_ERROR", "UNAUTHENTICATED", "NOT_FOUND",
    "RESOURCE_ACTIVE", "RESOURCE_ARCHIVED", "SESSION_CLOSED", "IDEMPOTENCY_CONFLICT",
    "PAYLOAD_TOO_LARGE", "RATE_LIMITED", "DEVICE_SESSION_MISMATCH", "SAMPLE_TIME_INVALID"};
  cJSON *json = cJSON_ParseWithLengthOpts(body.c_str(), body.length() + 1, nullptr, true);
  const cJSON *code = cJSON_GetObjectItemCaseSensitive(json, "code");
  const char *result = "UNEXPECTED_RESPONSE";
  if (cJSON_IsString(code)) {
    for (const char *known : codes) if (strcmp(code->valuestring, known) == 0) result = known;
  }
  cJSON_Delete(json);
  return result;
}

void handleFailure(const HttpReply &reply) {
  const char *code = safeErrorCode(reply.body);
  Serial.printf("Device request failed: HTTP %d %s.\n", reply.status, code);
  if (reply.status == 401) {
    authenticationRejected = true;
    Serial.println("Update the device credential from app issuance/rotation, then restart firmware.");
  }
  if (strcmp(code, "SAMPLE_TIME_INVALID") == 0) {
    clockSynchronized = false;
    lastClockAttemptAt = millis() - CLOCK_RETRY_MS;
  }
  if (reply.status == 429) {
    rateLimitedAt = millis();
    rateLimitDelayMs = reply.retryAfterMs ? reply.retryAfterMs : 10000;
  }
}

bool discoverSession(char sessionId[129]) {
  const HttpReply reply = request("GET", "/api/device/active-session", nullptr);
  if (reply.status != 200) { handleFailure(reply); return false; }
  cJSON *json = cJSON_ParseWithLengthOpts(reply.body.c_str(), reply.body.length() + 1, nullptr, true);
  const cJSON *value = cJSON_GetObjectItemCaseSensitive(json, "sessionId");
  const bool valid = cJSON_IsObject(json) && cJSON_IsString(value) && validId(value->valuestring);
  if (valid) strcpy(sessionId, value->valuestring);
  else Serial.println(cJSON_IsNull(value) ? "Waiting for an active app session." : "Invalid assignment response; acquisition skipped.");
  cJSON_Delete(json);
  return valid;
}

bool acknowledgesSample(const HttpReply &reply) {
  cJSON *json = cJSON_ParseWithLengthOpts(reply.body.c_str(), reply.body.length() + 1, nullptr, true);
  const cJSON *identity = cJSON_GetObjectItemCaseSensitive(json, "sampleId");
  const bool valid = cJSON_IsObject(json) && cJSON_IsString(identity) &&
                     strcmp(identity->valuestring, pending.sampleId) == 0;
  cJSON_Delete(json);
  return valid;
}

void startSample() {
  char sessionId[129];
  if (!discoverSession(sessionId) || !clockSynchronized || WiFi.status() != WL_CONNECTED) return;
  struct timeval acquired;
  gettimeofday(&acquired, nullptr);
  struct tm utc;
  gmtime_r(&acquired.tv_sec, &utc);
  char sampledAt[25];
  strftime(sampledAt, sizeof(sampledAt), "%Y-%m-%dT%H:%M:%S", &utc);
  const unsigned milliseconds = static_cast<unsigned>(acquired.tv_usec / 1000) % 1000;
  snprintf(sampledAt + 19, sizeof(sampledAt) - 19, ".%03uZ", milliseconds);
  if (sampleCounter == UINT32_MAX) { newBootId(); sampleCounter = 0; }
  snprintf(pending.sampleId, sizeof(pending.sampleId), "boot-%s-%lu", bootId, static_cast<unsigned long>(++sampleCounter));
  pending.acquiredAt = millis();
  lastCycleAt = pending.acquiredAt;
  double readings[SENSOR_COUNT];
  acquireSensors(readings);
  if (!formatPayload(pending.payload, sizeof(pending.payload), DEVICE_ID, sessionId,
                     pending.sampleId, pending.acquiredAt, sampledAt, readings)) {
    Serial.println("Sample encoding failed; acquisition discarded.");
    return;
  }
  pending.attempts = 0;
  pending.nextAttemptAt = millis();
  pending.active = true;
}

void uploadPending() {
  if (!canUpload(pending.acquiredAt, millis()) || pending.attempts >= MAX_UPLOAD_ATTEMPTS) {
    pending.active = false;
    Serial.println("Current sample discarded after bounded upload window/attempts; gap retained.");
    return;
  }
  if (static_cast<int32_t>(millis() - pending.nextAttemptAt) < 0) return;
  ++pending.attempts;
  const HttpReply reply = request("POST", "/api/device/measurements", pending.payload);
  if ((reply.status == 200 || reply.status == 201) && acknowledgesSample(reply)) {
    pending.active = false;
    Serial.println("Sample accepted.");
    return;
  }
  handleFailure(reply);
  if (!retryableStatus(reply.status) || authenticationRejected || reply.status == 429) {
    pending.active = false;
    return;
  }
  // The encoded payload, identity, session and timestamp remain unchanged on retry.
  pending.nextAttemptAt = millis() + (500UL << (pending.attempts - 1));
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setTimeOut(50);
  configured = validConfiguration();
  if (!configured) {
    Serial.println("Check Wi-Fi and app-issued device ID/token; keep the prefilled verified HTTPS URL/CA unless the deployment changes.");
    return;
  }
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  newBootId();
  sntp_set_time_sync_notification_cb(onClockSync);
  lastClockAttemptAt = millis() - CLOCK_RETRY_MS;
  lastCycleAt = millis() - SAMPLE_INTERVAL_MS;
  Serial.println("Photometrix ready; waiting for Wi-Fi, synchronized time and app session.");
}

void loop() {
  if (!configured) { delay(100); return; }
  maintainNetwork();
  if (pending.active) {
    if (WiFi.status() != WL_CONNECTED || !clockSynchronized) pending.active = false;
    else uploadPending();
  } else if (!authenticationRejected && WiFi.status() == WL_CONNECTED && clockSynchronized &&
             remainingMs(rateLimitedAt, rateLimitDelayMs, millis()) == 0 &&
             millis() - lastCycleAt >= SAMPLE_INTERVAL_MS) {
    lastCycleAt = millis();
    startSample();
  }
  delay(10);
}
#endif
