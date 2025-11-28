# PWA (Progressive Web App) Installation Guide

## 🎯 What Changed?

Your ambulance alert system is now a **Progressive Web App (PWA)** that works like a native mobile app!

### ✨ Key Benefits:

✅ **Install as App** - Add to home screen, works like native app  
✅ **Background Notifications** - Receive alerts even when app is CLOSED  
✅ **Offline Support** - Works without internet (cached)  
✅ **Push Notifications** - Real emergency alerts via Service Worker  
✅ **Auto-Updates** - Always latest version  
✅ **No App Store** - Install directly from browser

---

## 📱 How to Install & Use

### **On Mobile (Android/iOS):**

#### **Step 1: Open in Browser**

```
http://YOUR_LAPTOP_IP:3000/auto-receiver.html
```

#### **Step 2: Install as App**

**Android (Chrome/Edge):**

1. Tap the **"Install App"** banner at bottom
2. OR: Menu (⋮) → **"Install app"** or **"Add to Home screen"**
3. Tap **"Install"**
4. App icon appears on home screen

**iPhone/iPad (Safari):**

1. Tap **Share** button (square with arrow)
2. Scroll down → **"Add to Home Screen"**
3. Tap **"Add"**
4. App icon appears on home screen

#### **Step 3: Enable Notifications**

- First time opening: Tap **"Allow"** when prompted for notifications
- That's it! Close the app, it still receives alerts in background

---

### **On Desktop (Chrome/Edge):**

1. Open: `http://localhost:3000/auto-receiver.html`
2. Look for **install icon** (⊕) in address bar
3. Click → **"Install"**
4. App opens in separate window
5. Works even when browser closed!

---

## 🚀 How It Works

### **Background Service Worker:**

- Runs 24/7 in background
- Listens for ambulance broadcasts
- Shows notifications automatically
- No need to keep app open!

### **When Ambulance Broadcasts:**

1. Server sends alert to all devices
2. Service Worker receives it (even if app closed)
3. Notification pops up on your phone/PC
4. Vibration + sound alert
5. Tap to view details

---

## 🧪 Testing the PWA

### **Start Server:**

```bash
cd "c:/Users/MOHITH/Desktop/New folder (2)/mohith/web-dashboard"
npm start
```

### **Install on Phone:**

1. Find laptop IP: `ipconfig` or `ifconfig`
2. Open on phone: `http://LAPTOP_IP:3000/auto-receiver.html`
3. Install as app
4. Allow notifications

### **Test Background Alerts:**

1. **Close the app completely** (swipe away)
2. On laptop: Run `npm run sim:ambulance`
3. **Phone gets notification even though app is closed!** 🎉

---

## 📊 PWA Features Implemented

### 1. **Service Worker** (`service-worker.js`)

- Caches app for offline use
- Handles push notifications
- Background sync
- Periodic updates check

### 2. **Web App Manifest** (`manifest.json`)

- App name, icons, colors
- Display mode (standalone)
- Installability metadata

### 3. **Push Notifications**

- Vibration patterns
- Sound alerts
- Action buttons (View/Dismiss)
- Auto-dismiss after time

### 4. **Background Sync**

- Syncs missed alerts when back online
- Periodic ambulance checks
- Offline queue

---

## 🔧 Advanced Features

### **Notification Actions:**

When notification appears, you can:

- Tap **"View Details"** → Opens app
- Tap **"Dismiss"** → Closes notification
- Swipe away → Auto-dismisses

### **Offline Mode:**

- App works without internet
- Cached for fast loading
- Syncs when reconnected

### **Auto-Updates:**

- New version? App updates automatically
- No manual reinstall needed

---

## 🎨 Customization

### Change App Name:

Edit `manifest.json`:

```json
"name": "Your Custom Name",
"short_name": "Custom"
```

### Change Colors:

```json
"theme_color": "#YOUR_COLOR",
"background_color": "#YOUR_BG_COLOR"
```

### Custom Icons:

Replace `icon-192.svg` and `icon-512.svg` with your designs

---

## 🐛 Troubleshooting

### **"Install" button not showing?**

- Must use HTTPS or localhost
- Check browser supports PWA (Chrome, Edge, Safari)
- Manifest.json must be valid

### **Notifications not working?**

- Check notification permission: **Settings → Notifications**
- Ensure "Allow" is granted
- Test with `npm run sim:ambulance` while app closed

### **App not updating?**

- Clear cache: Settings → Storage → Clear
- Unregister old service worker
- Reinstall app

### **Icons not showing?**

- SVG icons are placeholders
- Use PNG for better compatibility
- Generate icons: Open `/generate-icons.html`

---

## 📲 Real-World Deployment

For production (not localhost):

1. **Get HTTPS certificate** (required for PWA)

   - Use Let's Encrypt (free)
   - Or deploy to Heroku/Netlify (auto-HTTPS)

2. **Deploy server** to cloud

   - Heroku, AWS, Google Cloud
   - DigitalOcean, Railway

3. **Users install from your domain**

   - `https://yourapp.com/auto-receiver.html`
   - Works on ALL devices globally

4. **Push Notifications at Scale**
   - Integrate Firebase Cloud Messaging (FCM)
   - Or OneSignal, Pusher

---

## 🎯 Summary

**Before PWA:**

- ❌ Must keep browser open
- ❌ Manual refresh needed
- ❌ No background alerts

**After PWA:**

- ✅ Install as native app
- ✅ Receive alerts when app closed
- ✅ Works offline
- ✅ Auto-updates
- ✅ Home screen icon

**Your app now works exactly like Uber, WhatsApp, or any native app!** 🚀

---

## 📝 Files Created

- `/public/service-worker.js` - Background worker
- `/public/manifest.json` - App metadata
- `/public/icon-192.svg` - App icon (small)
- `/public/icon-512.svg` - App icon (large)
- Updated `auto-receiver.html` - PWA integration

Start the server and install the app to test background notifications!
