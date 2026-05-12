# ZKTeco Firebase Attendance Sync

A Node.js server that connects a ZKTeco LX50 biometric fingerprint device to Firebase Firestore. Supports two sync modes: **ADMS** (device pushes data to the server over HTTP) and **ZKLib** (server pulls data from the device over TCP).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        ADMS Mode (Render)                        │
│                                                                  │
│  ZKTeco LX50  ──── HTTP POST ────►  Express Server  ────►  Firestore  │
│  (fingerprint)   /iclock/cdata     (Render.com)         (Firebase)  │
│                                                                  │
│  • Device pushes each punch to the server automatically          │
│  • Works from any internet-accessible server                     │
│  • Recommended for production on Render                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   ZKLib Mode (Local Network Only)                │
│                                                                  │
│  Express Server  ──── TCP :4370 ────►  ZKTeco LX50  ────►  Firestore  │
│  (local server)       (pull every      (192.168.0.x)    (Firebase)  │
│                         30 seconds)                              │
│                                                                  │
│  • Server actively connects to device via TCP                    │
│  • Only works when server is on the SAME local network           │
│  • Not compatible with Render.com (device is behind NAT)         │
└──────────────────────────────────────────────────────────────────┘
```

---

## How to Run Locally

### 1. Install dependencies

```bash
cd zkteco-firebase
npm install
```

### 2. Create `.env` from the example

```bash
cp .env.example .env
```

### 3. Fill in Firebase credentials

Open `.env` and paste in your service account values (see [Firebase Setup](#firebase-setup) below).

### 4. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FIREBASE_PROJECT_ID` | **Yes** | Firebase project ID (e.g. `shop-dashboard-285a2`) |
| `FIREBASE_PRIVATE_KEY` | **Yes** | Service account private key (keep `\n` as literal `\n`) |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | Service account email |
| `FIREBASE_PRIVATE_KEY_ID` | No | Private key ID from service account JSON |
| `FIREBASE_CLIENT_ID` | No | Client ID from service account JSON |
| `FIREBASE_CLIENT_CERT_URL` | No | Client cert URL from service account JSON |
| `FIREBASE_AUTH_URI` | No | Defaults to Google OAuth URI |
| `FIREBASE_TOKEN_URI` | No | Defaults to Google token URI |
| `FIREBASE_AUTH_PROVIDER_CERT_URL` | No | Defaults to Google certs URL |
| `SYNC_MODE` | No | `adms` (default) or `zklib` |
| `DEVICE_IP` | ZKLib only | Device IP on local network (e.g. `192.168.0.201`) |
| `DEVICE_PORT` | No | Device TCP port (default `4370`) |
| `DEVICE_SERIAL` | No | Device serial number (default `BR63232460857`) |
| `PORT` | No | HTTP server port (default `3000`) |
| `NODE_ENV` | No | `development` or `production` |

### FIREBASE_PRIVATE_KEY format

The key must have `\n` as literal two-character sequences, not actual newlines. Copy the key exactly as shown in the service account JSON file, including the header and footer lines:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIB...\n-----END PRIVATE KEY-----\n"
```

---

## Deploy on Render.com

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Create a Web Service on Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repository
3. Set **Root Directory** to `zkteco-firebase`
4. Build command: `npm install`
5. Start command: `npm start`
6. Plan: Free

### Step 3 — Set environment variables

In the Render dashboard under **Environment**, add these as secret vars:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY` (entire key with `\n`)
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_CLIENT_CERT_URL`
- `SYNC_MODE` = `adms`

The other Firebase URI variables have sensible defaults and do not need to be set.

### Step 4 — Verify deployment

```bash
curl https://your-service.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "mode": "adms",
  "deviceConnected": false,
  "uptime": 42,
  "timestamp": "2024-05-02T09:30:00.000Z",
  "lastPunch": null
}
```

---

## Configure the LX50 Device

1. On the LX50 touchscreen: **Menu → Communication → Cloud Server Settings**
2. Set **Server Address**: `https://your-service.onrender.com`
3. Set **Server Path**: `/iclock/cdata`
4. Set **Port**: `443`
5. Enable **HTTPS Push** (may be labelled "ADMS" or "Cloud Server")
6. Save and test the connection

The device will then push each fingerprint punch to the server automatically.

**Device info for reference:**

| Field | Value |
|---|---|
| Model | LX50 |
| Serial | BR63232460857 |
| Firmware | ZLM31-FXO1-3.1.7 |
| Device password | 3 |
| Default TCP port | 4370 |

---

## Verify Everything Is Working

### 1. Test the endpoint manually

```bash
curl -X POST "https://your-service.onrender.com/iclock/cdata?SN=BR63232460857" \
  -H "Content-Type: text/plain" \
  -d "1	2024-05-02 09:30:00	0	1"
```

Expected: `OK`

### 2. Check Firestore

Open Firebase Console → Firestore → `attendance` collection. A new document should appear within seconds.

### 3. Check the health endpoint after a punch

```bash
curl https://your-service.onrender.com/health
```

`deviceConnected` should be `true` and `lastPunch` should contain the user and time.

### 4. Do a real punch on the device

Touch a registered finger on the LX50. Within a few seconds the record should appear in Firestore.

---

## Firestore Data Structure

### Collection: `attendance`

Document ID is deterministic: `{userId}_{YYYY-MM-DDTHH-MM-SS}` — this prevents duplicate records if the device retransmits.

```json
{
  "userId": "1",
  "rawDateTime": "2024-05-02 09:30:00",
  "dateTime": "Timestamp(2024-05-02T09:30:00.000Z)",
  "status": "0",
  "statusLabel": "Check In",
  "verification": "1",
  "verificationLabel": "Fingerprint",
  "workCode": "",
  "deviceSerial": "BR63232460857",
  "syncedAt": "Timestamp(2024-05-02T09:30:05.123Z)"
}
```

### Collection: `devices`

Document ID is the device serial number.

```json
{
  "serial": "BR63232460857",
  "lastSeen": "Timestamp(2024-05-02T09:30:05.123Z)",
  "ipAddress": "192.168.0.201",
  "totalPunches": 42
}
```

### Status codes

| Code | Label |
|---|---|
| 0 | Check In |
| 1 | Check Out |
| 2 | Break Out |
| 3 | Break In |
| 4 | Overtime In |
| 5 | Overtime Out |

### Verification codes

| Code | Label |
|---|---|
| 0 | Password |
| 1 | Fingerprint |
| 2 | Card |
| 3 | Face |
| 15 | Face Recognition |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server and device status |
| GET | `/iclock/cdata` | Device configuration poll (device → server) |
| POST | `/iclock/cdata` | Attendance record submission (device → server) |
| GET | `/iclock/getrequest` | Device checks for pending commands |
| POST | `/iclock/devicecmd` | Device confirms command execution |

---

## Troubleshooting

### Device not connecting

- Confirm the LX50 has internet access (try pinging an external address from a device on the same network).
- Check the server address on the device — must include `https://` and no trailing slash.
- Confirm `SYNC_MODE=adms` is set (ZKLib will not work on Render).
- Check server logs in Render dashboard for incoming requests.

### No data in Firestore

- Test the endpoint manually with the curl command above.
- If curl returns `OK` but nothing appears in Firestore, check the server logs for Firebase errors.
- Confirm the service account has the **Firebase Admin SDK Administrator** role or at minimum **Cloud Datastore User**.
- Check that `FIREBASE_PRIVATE_KEY` is correctly formatted with `\n` (not real newlines).

### Server crashing on startup

The server exits immediately with a clear error message if credentials are missing:

```
✗ Missing required Firebase environment variables:
  - FIREBASE_PROJECT_ID
  - FIREBASE_PRIVATE_KEY
  - FIREBASE_CLIENT_EMAIL
```

Fix: set the missing environment variables and redeploy.

If you see a Firebase SDK error instead:

```
✗ Firebase initialization failed: error decoding private key
```

Fix: the `FIREBASE_PRIVATE_KEY` value contains literal newline characters — replace them with `\n`.

### Render free tier: first punch is slow

Render free services sleep after 15 minutes of inactivity. The first request after sleep wakes the server (~30 seconds). Subsequent punches are instant. Upgrade to a paid plan to eliminate the cold-start delay.

### ZKLib: connection refused

- Confirm `DEVICE_IP` is correct and the device is powered on.
- Confirm the server and device are on the same local network (ZKLib uses TCP — it cannot cross the internet).
- The server retries automatically every 30 seconds.

---

## Project Structure

```
zkteco-firebase/
├── index.js              # Server entry — startup, health endpoint, shutdown
├── config.js             # All config from environment variables
├── state.js              # Shared runtime state (mode, lastPunch, etc.)
├── routes/
│   └── iclock.js         # ZKTeco ADMS HTTP endpoints
├── services/
│   ├── firebase.js       # Firestore operations
│   ├── parser.js         # ADMS text format parser
│   └── zklib.js          # ZKLib TCP pull service (local mode)
├── .env.example          # Environment variable template
├── package.json
├── render.yaml           # Render.com deployment config
└── CHECKLIST.md          # Step-by-step deployment checklist
```
