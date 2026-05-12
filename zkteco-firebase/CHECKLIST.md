# ZKTeco Firebase — Deployment Checklist

---

## Code

- [x] DONE — Express server handles ADMS push (`POST /iclock/cdata`)
- [x] DONE — Parser handles `UserID\tDateTime\tStatus\tVerify\tWorkCode` format
- [x] DONE — Batch Firestore writes with 400-op chunks (under 500-op limit)
- [x] DONE — Deduplication: deterministic doc IDs prevent duplicate records
- [x] DONE — `totalPunches` incremented by actual record count, not always 1
- [x] DONE — Firebase init fails fast with a readable error on missing credentials
- [x] DONE — `/health` endpoint returns `mode`, `deviceConnected`, `uptime`, `lastPunch`
- [x] DONE — Startup banner shows mode, port, device IP, Firebase project
- [x] DONE — Graceful shutdown: ZKLib disconnects cleanly on SIGTERM/SIGINT
- [x] DONE — ZKLib mode with 30-second retry loop (`SYNC_MODE=zklib`)
- [x] DONE — `SYNC_MODE`, `DEVICE_IP`, `DEVICE_PORT`, `DEVICE_SERIAL` env vars added
- [x] DONE — `.gitignore` excludes `.env` and `serviceAccountKey.json`

---

## Firebase Setup

- [ ] TODO — Create Firestore database in Firebase Console
  - **Who:** Developer
  - **How long:** 2 minutes
  - Go to Firebase Console → Firestore Database → Create database → Start in production mode

- [ ] TODO — Generate a Firebase service account key
  - **Who:** Developer
  - **How long:** 2 minutes
  - Firebase Console → Project Settings → Service Accounts → Generate New Private Key
  - Download the JSON file (do NOT commit it to git)

- [ ] TODO — Add Firestore security rules for the `attendance` and `devices` collections
  - **Who:** Developer
  - **How long:** 5 minutes
  - Minimum rules (server-only write, no public read):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /attendance/{doc} {
          allow read, write: if false; // Admin SDK bypasses these rules
        }
        match /devices/{doc} {
          allow read, write: if false;
        }
      }
    }
    ```

- [ ] TODO — Verify service account has `roles/datastore.user` IAM permission
  - **Who:** Developer
  - **How long:** 2 minutes
  - Google Cloud Console → IAM → find the `firebase-adminsdk` service account

---

## Render Deployment

- [ ] TODO — Push `zkteco-firebase/` folder to a GitHub repository
  - **Who:** Developer
  - **How long:** 5 minutes
  - `git init`, `git add .`, `git commit`, `git remote add`, `git push`

- [ ] TODO — Create a new Web Service on Render.com
  - **Who:** Developer
  - **How long:** 5 minutes
  - Connect GitHub repo → select `zkteco-firebase` root → free plan

- [ ] TODO — Set the following secret environment variables in Render dashboard
  - **Who:** Developer
  - **How long:** 5 minutes
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_PRIVATE_KEY_ID`
  - `FIREBASE_PRIVATE_KEY` (paste the entire key including `-----BEGIN/END PRIVATE KEY-----` and literal `\n`)
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_CLIENT_ID`
  - `FIREBASE_CLIENT_CERT_URL`
  - `SYNC_MODE=adms`

- [ ] TODO — Confirm successful deployment by checking health endpoint
  - **Who:** Developer
  - **How long:** 2 minutes
  - `curl https://your-service.onrender.com/health`
  - Expected: `{"status":"ok","mode":"adms","deviceConnected":false,...}`

- [ ] TODO — Note the public Render URL (needed for device configuration)
  - **Who:** Developer
  - Format: `https://zkteco-firebase-xxxx.onrender.com`

---

## Device Configuration (ZKTeco LX50)

- [ ] TODO — Set the ADMS server address on the device
  - **Who:** Device owner / on-site technician
  - **How long:** 5 minutes
  - On the LX50 touchscreen: Menu → Communication → Cloud Server Settings
  - Set **Server Address**: `https://your-service.onrender.com`
  - Set **Server Path**: `/iclock/cdata`
  - Set **Port**: `443` (HTTPS) or `80` (HTTP)
  - Enable **ADMS** (also called "Cloud Server" or "HTTPS Push")

- [ ] TODO — Verify the device clock is set to the correct local time
  - **Who:** Device owner
  - **How long:** 2 minutes
  - Menu → System → Date/Time
  - Important: attendance timestamps come from the device clock

- [ ] TODO — Verify the device can reach the internet
  - **Who:** Device owner / network admin
  - **How long:** 5 minutes
  - Device must be on a network with outbound HTTPS access
  - Render free tier uses HTTPS on port 443

---

## Testing

- [ ] TODO — Test ADMS endpoint manually with curl
  - **Who:** Developer
  - **How long:** 2 minutes
  ```bash
  curl -X POST "https://your-service.onrender.com/iclock/cdata?SN=BR63232460857" \
    -H "Content-Type: text/plain" \
    -d "1\t2024-05-02 09:30:00\t0\t1"
  ```
  - Expected response: `OK`
  - Expected in Firestore: new doc in `attendance` collection

- [ ] TODO — Confirm attendance record appears in Firestore
  - **Who:** Developer
  - **How long:** 1 minute
  - Firebase Console → Firestore → `attendance` collection
  - Expected document fields: `userId`, `rawDateTime`, `dateTime`, `status`, `statusLabel`, `deviceSerial`, `syncedAt`

- [ ] TODO — Confirm device appears in `devices` collection
  - **Who:** Developer
  - **How long:** 1 minute
  - Firebase Console → Firestore → `devices` collection → document `BR63232460857`

- [ ] TODO — Do a real fingerprint punch on the LX50 and confirm it appears in Firestore
  - **Who:** Device owner + developer
  - **How long:** 5 minutes

- [ ] TODO — Test deduplication: send the same record twice and confirm only one doc in Firestore
  - **Who:** Developer
  - **How long:** 2 minutes
  - Run the curl command above twice — document count must remain 1

- [ ] TODO — Test the `/health` endpoint returns `deviceConnected: true` after a punch
  - **Who:** Developer
  - **How long:** 1 minute

---

## Important Notes

### Why ZKLib won't work on Render (local network limitation)
The `SYNC_MODE=zklib` setting makes the server connect to the device via TCP.
Render.com is on the public internet; the LX50 is on your local WiFi (`192.168.0.x`).
**TCP from Render cannot reach a device behind your router.**
→ Use `SYNC_MODE=adms` on Render (device pushes to public URL).
→ Use `SYNC_MODE=zklib` only when running the server on the **same local network** as the device.

### FIREBASE_PRIVATE_KEY formatting
When pasting the private key into Render, the newlines must be literal `\n` characters, not actual line breaks. The `.env.example` shows the correct format with `\n` inside the quoted string.

### Render free tier sleep
Render free-tier services sleep after 15 minutes of inactivity. The LX50 ADMS push will wake the server, but the **first punch after sleep has a ~30-second delay** while the service boots. Consider upgrading to a paid plan for time-critical attendance tracking.
