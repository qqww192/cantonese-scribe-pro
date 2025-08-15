# 🚀 Simple Step-by-Step Deployment Guide

## Hey! Let's Get Your App Online! 🎉

Think of this like building with LEGO blocks - we'll put together all the pieces one by one to make your CantoneseScribe app work on the internet!

---

## 📋 What We're Going to Do

We need to set up 6 main things:
1. **Vercel** (where your website lives)
2. **Supabase** (where your data is stored)
3. **Google Cloud** (turns speech into text AND translates Cantonese)
4. **Google Gemini** (AI assistant for better understanding)
5. **Email service** (sends emails to users)
6. **Analytics** (tells you how many people use your app)

Don't worry - I'll walk you through each one! 🌟

---

## 🏠 **Step 1: Setting Up Vercel (Your Website's Home)**

### What is Vercel?
Think of Vercel like renting a house for your website to live in. When people type your website address, Vercel shows them your app!

### Let's Do This:

**1.1 Create a Vercel Account**
- Go to [vercel.com](https://vercel.com)
- Click "Sign Up" 
- Use your GitHub account (it's easier!)

**1.2 Connect Your Code**
- Click "New Project"
- Find your CantoneseScribe code
- Click "Import"

**1.3 Set Up Environment Variables (Secret Settings)**
These are like secret passwords your app needs to work:

- In Vercel, go to your project
- Click "Settings" → "Environment Variables"
- Add these one by one (copy exactly!):

```
Name: ENVIRONMENT
Value: production

Name: NODE_ENV  
Value: production

Name: DEBUG
Value: false

Name: VITE_ENABLE_FILE_UPLOAD
Value: true

Name: VITE_ENABLE_WAITLIST
Value: true

Name: VITE_ENABLE_PAYMENTS
Value: false

Name: FREE_TIER_CREDITS
Value: 30

Name: FREE_TIER_FILE_SIZE_MB
Value: 25
```

**1.4 Deploy Your Site**
- Click "Deploy"
- Wait for the green checkmark ✅
- Click on your new website link to see it live!

---

## 🗄️ **Step 2: Setting Up Supabase (Your Data Storage)**

### What is Supabase?
Imagine a super organized filing cabinet that remembers all your users, their videos, and how much they've used your app.

### Let's Do This:

**2.1 Create Supabase Account**
- Go to [supabase.com](https://supabase.com)
- Click "Start your project"
- Sign up with GitHub

**2.2 Create Your Database**
- Click "New Project"
- Choose a name: "cantonese-scribe" 
- Pick a password (write it down!)
- Choose a region close to you
- Wait 2-3 minutes for setup

**2.3 Get Your Secret Keys**
- In Supabase, go to Settings → API
- Copy these and save them somewhere safe:
  - `Project URL` (starts with https://)
  - `anon public` key (long text starting with "eyJ...")
  - `service_role` key (another long text)

**2.4 Add Keys to Vercel**
- Go back to Vercel → Settings → Environment Variables
- Add these:

```
Name: SUPABASE_URL
Value: [paste your Project URL]

Name: SUPABASE_KEY  
Value: [paste your anon public key]

Name: SUPABASE_SERVICE_KEY
Value: [paste your service_role key]
```

**2.5 Set Up Your Database Tables**
- In Supabase, go to "SQL Editor"
- Copy the content from `database/migrations/001_initial_schema.sql` 
- Paste it and click "RUN"
- Do the same with `002_usage_tracking_enhancements.sql`

---

## 🔑 **Step 3: Setting Up Google Cloud (Speech & Translation)**

### What is Google Cloud?
It's like having a super smart robot friend who can:
- Listen to Cantonese speech and write it down perfectly
- Translate between Cantonese, English, and other languages
- Understand context and meaning

### Let's Do This:

**3.1 Create Google Cloud Account**
- Go to [cloud.google.com](https://cloud.google.com)
- Click "Get started for free"
- You get $300 free credit! 💰

**3.2 Create a Project**
- In Google Cloud Console, click "New Project"
- Name it "cantonese-scribe"
- Click "Create"

**3.3 Enable the APIs We Need**
- Search for "Speech-to-Text API" and click "Enable"
- Search for "Cloud Translation API" and click "Enable"
- Search for "Generative AI API" and click "Enable" (for Gemini)

**3.4 Create Service Account (Like a Robot Helper)**
- Go to "IAM & Admin" → "Service Accounts"
- Click "Create Service Account"
- Name: "cantonese-scribe-service"
- Click "Create and Continue"
- Add these roles:
  - "Speech to Text Editor"
  - "Cloud Translation API Editor" 
  - "AI Platform Developer"
- Click "Done"

**3.5 Download Your Keys**
- Click on your service account
- Go to "Keys" tab
- Click "Add Key" → "Create new key" → "JSON"
- Save the file (it's like a key to your house!)

**3.6 Convert Your Key File**
- Open the downloaded JSON file in notepad
- Copy ALL the text
- Go to [base64encode.org](https://www.base64encode.org)
- Paste the JSON text and click "Encode"
- Copy the result (long text that looks scrambled)

**3.7 Add to Vercel**
```
Name: GOOGLE_CLOUD_PROJECT_ID
Value: bobchatbot

Name: GOOGLE_CLOUD_CREDENTIALS
Value: ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiYm9iY2hhdGJvdCIsCiAgInByaXZhdGVfa2V5X2lkIjogIjE3OTk2MWFlNmIxMWMxMzdkZjEzOTIzMjdkYTM1MDkxNGNkZjRlOWQiLAogICJwcml2YXRlX2tleSI6ICItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRHBsQlBha2lBRTg2SUVcbmlWZ0dRWVdONFdXZUFGUHo5UjlkM01VY3NzbFhqYTNrelg5L1NUY1NhcWx4ZkFob1I0N01OMGF3elIrL0NqZHhcblM4NjBGRkczNFdYQlo3RWp1dlM2Q3VnUWdYMWRRN1NGT1RVSFQ3ZW5jcmFQU2kzNDI5L0N6eWFaS2NsalhDY0VcbjVnNG94MzlEYndFQkxYbTI5TE81VGRiQStTSEJGdzJUdURIYnhsaUZTWGlLOS80MG9wUnRLZEowMjJnd3h6emRcbnZXY01ZbmpCUW84SmxkcGhYMjcvbzh2UXZzWXZid3hWbnMreTluamZiYk5PWkJPbmpwY01LRFprTS9zYXp4ZDNcbjJ6WDAvd25BdjJNVllRQmpMUE1YbGZzNWxIQThtZEpGY3Z6S2RVai9aTHV0TGZDOTRhVmhYZVVXRnVzYzJpcTBcbjNhREhtU1BUQWdNQkFBRUNnZ0VBY3FZa09KeVE2dDFMSVQ3bzNlazdUTERkMS9nQlBUV0w5OTV0UWZEZnN3SHZcbjRPYWROalVSdXhCdnF5eGVWQkVMbm1GamFWVEZ5RmVUYnlEdWpLV01sdDBqdlJMUWQrRkVUaTBjU3ozRDh3dFFcbmlEUFVPNHA5Y3N0em9GR2d6dzNkZnhsK3NKODZJbk1SRSs1MzlMdzNVem9oSEJyZUsxZGhBQXVjNVl0amJncWFcbmlCRkI3bHZ0MExhVEpvRHFhMFFxU2FJSzZrcld4bWtXMDA0cHl1TlJsaEFITkZ0Q05WL1VjMmJITk9SZHBmRmdcbm5LakFnTGM0amVFMWcvSkx4b0FxalpBaTEzOEpESnpXTnZIc09oRWhUc1hqYThWZFRQSE5xdEF1SGkvejZtY2lcbkl1S3dnc2hoQXpiM2hMK0JybnNMd2N0VzcrN0dXd2krQk5jL3RqbFRBUUtCZ1FEOHVDMStOY3dwanVvYVFXbmNcbjBGalhIZTRMMmNueHZvSzlEQU83YlZGVHpoc0RuZ3BqV21EWWRrbUZ2SnV6MnR1aENCbE9SaCtVdnNHRG9kV1Fcbit1cXAvU3c4MmpJQXZJenhwbzVXUlFIVUtRdEVrT3BaMHVHQUVaRjdnYnRqTnZQY3RCRGJqWFdlbXRPOE9Vb3lcbi9yM0I4cEsyZWFBYzRpZDNWdXJ6bUpQVWd3S0JnUURzbkVxaldsd0JKbGR4YVFtU0xKZCtyZytlaG9XazZaUUtcbk1aRHlpV0ZEaitML2swQ3JTcmYzMnhMaU9MZGtnU1pPdTRacllwZG9BS0o3WlRCWjI3aThmK2ZxdFRqS05UWDNcbkRvdXZ4M0JxNGJDSlZkcVk2N25UTDR0MmYrYW9tamhLYXhUd25pVkRDT05Md2lTQWM5bUNUZEp2SkdpZktuaHdcbko3bjZUWkp5Y1FLQmdCaHJ2OUdyWnpBNDVEeG5SOUNUdlpJRURXWE54T3I4YXV2VHhtU05Pc2VyYWdiZWRjaUdcbkNrZkFubmd5OHFUZHFFMldWOE90bVEycHBVK1FDdkE0bndhUU5YOG40cDhabVZFY3RESjM5cVpHMVJUcUlBdFFcbkNvUnlyaWxPTHdwMlcvaGUyaVl0TkVtQVVxZWtyWnZoNi9wYTgzeDRvbFZJTVdJaDN4QnRGUlA3QW9HQUV4TEtcblJYN01PZCtBWHdrTGwzZjJ3bVIvcDlUS1F5LzlHaEZDMFBwWUY5MHFmRlcvZWM5dEl4TEs0K2VVaVFxTUx2NllcbjZHRXJPVndMdlF5OEtCSTVReURBYmtBcmtzbFZUMVFoMklxb09rVjFPS3p1RVRPM2FCbkdFVWhnTEtrNTdtM1JcblkxQXNTc29Wb0k3RzZIL3VRYjNLUCtGY2ViQXZ3MExBa0RmZW5WRUNnWUVBaTA5M3IwRE9Cb2tHdVpxQWtDemZcbnlhZWJmV2tFZE1ERDZUa2hla0RGQjI0STJUUzlDbCtld3UxczJNcHFiZlhwS0F6cFNxUG0vY1pUTEpqRHlyVE9cbmtmcHNaU2dpa1czN29WMkMyZGRMWlBtZDdIY2xYVndxdVN0N3hLdDdkbHVQWldHQkEwTkw0aVpzQUhvVExCVmdcblBMTmdCOU40eHdyeW42bm1mbUMva3FVPVxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwKICAiY2xpZW50X2VtYWlsIjogImNhbnRvbmVzZS1zY3JpYmUtc2VydmljZUBib2JjaGF0Ym90LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAiY2xpZW50X2lkIjogIjEwNDAyNzQ1MDY3NDE3MzY0MTExNiIsCiAgImF1dGhfdXJpIjogImh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwKICAidG9rZW5fdXJpIjogImh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwKICAiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9jZXJ0cyIsCiAgImNsaWVudF94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvY2FudG9uZXNlLXNjcmliZS1zZXJ2aWNlJTQwYm9iY2hhdGJvdC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQo=
```

---

## 🤖 **Step 4: Setting Up Google Gemini (AI Assistant)**

### What is Google Gemini?
It's like having a super smart AI assistant that can:
- Help improve transcription accuracy
- Provide better context understanding
- Enhance translation quality
- Make your app smarter over time!

### Let's Do This:

**4.1 Get Gemini API Key**
- Go to [makersuite.google.com](https://makersuite.google.com)
- Click "Get API Key"
- Sign in with your Google account
- Click "Create API Key"
- Choose your "cantonese-scribe" project
- Copy the key (starts with "AI...")
- Save it somewhere safe!

**4.2 Set Up Usage Quotas**
- In Google Cloud Console, go to "APIs & Services" → "Quotas"
- Search for "Generative Language API"
- Set daily request limit: 1000 (so you don't spend too much)

**4.3 Add to Vercel**
```
Name: GOOGLE_GEMINI_API_KEY
Value: [paste your Gemini API key]

Name: GOOGLE_TRANSLATE_API_KEY
Value: [paste the same Gemini key - it works for both!]
```

**4.4 Test It Works**
- Go to [makersuite.google.com/app/prompts](https://makersuite.google.com/app/prompts)
- Try asking: "Hello, can you help with Cantonese translation?"
- If you get a response, it's working! ✅

---

## 📧 **Step 5: Setting Up Email (Talking to Users)**

### What is Email Service?
When users sign up or need help, your app needs to send them emails automatically!

### Let's Do This:

**5.1 Create Resend Account**
- Go to [resend.com](https://resend.com)
- Click "Get Started"
- Sign up with your email

**5.2 Verify Your Domain**
- Go to "Domains" in your dashboard
- Click "Add Domain"
- Add your website domain
- Follow DNS setup instructions

**5.3 Create API Key**
- Go to "API Keys" in your dashboard
- Click "Create API Key"
- Name: "cantonese-scribe"
- Copy the key (starts with "re_")

**5.4 Add to Vercel**
```
Name: RESEND_API_KEY
Value: [paste your Resend key]

Name: FROM_EMAIL
Value: [your verified email]

Name: SUPPORT_EMAIL  
Value: [your email for support]
```

---

## 📊 **Step 6: Setting Up Analytics (See How You're Doing)**

### What is Analytics?
It's like having a scoreboard that shows you how many people use your app and what they like!

### Let's Do This:

**6.1 Create Google Analytics Account**
- Go to [analytics.google.com](https://analytics.google.com)
- Click "Start measuring"
- Create account name: "CantoneseScribe"

**6.2 Set Up Property**
- Property name: "CantoneseScribe Website"
- Select your timezone
- Click "Create"

**6.3 Set Up Data Stream**
- Choose "Web"
- Add your website URL (from Vercel)
- Stream name: "CantoneseScribe"
- Click "Create stream"

**6.4 Get Tracking Code**
- Copy the "Measurement ID" (looks like GA-XXXXXXXXX)
- We'll add this to your website code later

---

## 🔐 **Step 7: Security Settings (Keep Bad Guys Out)**

### Let's Add Some Protection:

**7.1 Create a Strong Secret Key**
- Go to [randomkeygen.com](https://randomkeygen.com)
- Copy a "CodeIgniter Encryption Key"
- Add to Vercel:

```
Name: SECRET_KEY
Value: [paste the random key]

Name: ACCESS_TOKEN_EXPIRE_MINUTES
Value: 60

Name: ALGORITHM
Value: HS256
```

**7.2 Set Up Domain Protection**
- Replace "your-domain" in these with your actual website address:

```
Name: ALLOWED_ORIGINS
Value: https://your-actual-domain.vercel.app

Name: ALLOWED_HOSTS  
Value: your-actual-domain.vercel.app
```

---

## 🌐 **Step 8: Custom Domain (Optional - Make It Pretty)**

### Want a custom website name like "myapp.com"?

**8.1 Buy a Domain**
- Go to [namecheap.com](https://namecheap.com) or [godaddy.com](https://godaddy.com)
- Search for a name you like
- Buy it (usually $10-15/year)

**8.2 Connect to Vercel**
- In Vercel, go to your project → Settings → Domains
- Add your domain name
- Follow the instructions to point your domain to Vercel

---

## ✅ **Step 9: Testing Everything Works**

### Let's Make Sure Everything is Working:

**9.1 Test Your Website**
- Visit your Vercel URL
- Try signing up for an account
- Try uploading a short video
- Check if you get emails

**9.2 Check Your Databases**
- In Supabase, go to "Table Editor"
- You should see tables like "users", "usage_records"
- If someone signed up, you should see them in the "users" table

**9.3 Monitor Costs**
- Check Google Cloud billing
- Check OpenAI usage
- Make sure you're not spending too much money

---

## 🎯 **Step 10: Keep Track of Success**

### Watch These Numbers:

**Daily Checks:**
- How many new users signed up?
- How many videos were processed?
- Are there any error messages?

**Weekly Checks:**
- How much money are you spending on APIs?
- How many people joined the waitlist?
- Are users happy? (check for feedback)

---

## 🚨 **Important Safety Tips**

### Keep These Safe:
- Never share your API keys with anyone
- Use strong passwords everywhere
- Enable 2-factor authentication on all accounts
- Back up your database regularly

### If Something Breaks:
- Check Vercel for error messages
- Look at your API usage in each service
- Make sure you haven't hit spending limits
- Check if any APIs are down

---

## 🎉 **You Did It!**

### Congratulations! Your app is now live on the internet! 

Here's what people can now do:
- Visit your website
- Sign up for free accounts
- Upload Cantonese videos
- Get transcriptions with Yale romanization
- Join the waitlist for Pro features

### What's Next?
- Tell your friends to try it!
- Share it on social media
- Listen to user feedback
- Keep improving your app
- Prepare for the Pro launch in Q2 2025

---

## 📞 **Need Help?**

If you get stuck:
1. **Read error messages carefully** - they usually tell you what's wrong
2. **Check each service's status page** - sometimes they have outages
3. **Double-check your environment variables** - typos cause problems
4. **Look at the logs** in Vercel - they show what's happening
5. **Ask for help** - everyone needs help sometimes!

**Remember: You built something amazing! Be proud of yourself! 🌟**