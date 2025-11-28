# 🔑 Google Maps API Setup Guide

Follow these steps to get your Google Maps API key and configure the project.

## Step 1: Create Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms of service if prompted

## Step 2: Create a New Project

1. Click on the project dropdown at the top
2. Click **"New Project"**
3. Enter project name: `Ambulance-Simulator`
4. Click **"Create"**
5. Wait for project creation (takes a few seconds)

## Step 3: Enable Required APIs

1. In the search bar, type **"Maps JavaScript API"**
2. Click on it and press **"Enable"**
3. Go back and search for **"Directions API"**
4. Click on it and press **"Enable"**

## Step 4: Create API Key

1. Click hamburger menu (☰) → **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"API Key"**
4. Your API key will be created and displayed
5. Click **"Copy"** to copy the key

## Step 5: Restrict Your API Key (Recommended)

1. Click **"RESTRICT KEY"** in the popup
2. Under **"Application restrictions"**:
   - Select **"HTTP referrers (websites)"**
   - Add: `localhost:3000/*`
   - Add: `http://localhost:3000/*`
3. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check: Maps JavaScript API
   - Check: Directions API
4. Click **"Save"**

## Step 6: Configure Your Project

1. Navigate to your project folder:
   ```bash
   cd ambulance-sim
   ```

2. Create a `.env` file from the example:
   ```bash
   copy .env.example .env
   ```

3. Open `.env` file in a text editor

4. Replace `your_api_key_here` with your actual API key:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyB1234567890abcdefghijklmnopqr
   ```

5. Save the file

## Step 7: Start the Application

```bash
npm start
```

Your browser should open at `http://localhost:3000` with the map loaded!

## 💰 Billing Information

Google Maps API has a **FREE tier**:
- $200 free credit per month
- Approximately 28,000 map loads free per month
- No credit card required initially

For this simulator's development usage, you'll stay well within the free tier.

## 🚨 Troubleshooting

### "This page can't load Google Maps correctly"
- Check if API key is correct in `.env`
- Ensure there are no extra spaces or quotes
- Restart the development server (`Ctrl+C` then `npm start`)

### "RefererNotAllowedMapError"
- Add `localhost:3000/*` to HTTP referrers in API restrictions

### APIs not enabled
- Make sure both Maps JavaScript API and Directions API are enabled
- Wait a few minutes after enabling (can take time to propagate)

### .env file not working
- Make sure file is named exactly `.env` (not `.env.txt`)
- Restart development server after creating/modifying `.env`

## 🔒 Security Best Practices

1. **Never commit `.env` to version control**
   - Already included in `.gitignore`
   
2. **Use API restrictions**
   - Restrict to specific URLs in production
   
3. **Monitor usage**
   - Check Google Cloud Console regularly
   - Set up billing alerts

4. **For production deployment**
   - Use environment variables in your hosting platform
   - Don't expose API key in client-side code for sensitive apps
   - Consider using a backend proxy

## 📊 Check Your Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Dashboard**
4. View API usage graphs and quotas

---

✅ Once completed, you're ready to simulate ambulance routes!
