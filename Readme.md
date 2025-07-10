# MyGreenHome: Smart Energy Management & Green Living Assistant 💚

---

## 1. 🌟 Overview

MyGreenHome is a full-stack MERN-based web application that empowers users to monitor, understand, and reduce their household electricity usage. It uses OCR technology to extract bill data and delivers dynamic energy-saving tips. With engaging gamification, historical data tracking, PDF report generation, and a custom in-app AI Green Helper, users are encouraged to lead a more sustainable lifestyle.

Key points include:

* Built for eco-conscious individuals and smart home adopters
* Separate flows for users and admins
* Secure authentication via OTP
* Trend visualizations of CO₂ emissions
* Points, badges, and leaderboards for motivation
* Tesseract-powered OCR for electricity bills
* Rule-based chatbot for contextual user assistance
* PDF summaries and donation showcases

---

## 2. 🌍 Hosted Link

🔗 [Live App on Railway](https://greeninitative-production.up.railway.app/auth)

---

## 🖼 UI Screenshots (Laptop & Mobile Views)

### 🔐 Login Page

* *Laptop:*
  ![Login Laptop]![Screenshot 2025-07-10 153648](https://github.com/user-attachments/assets/2b9a591f-67d7-4edc-adfd-6d7a0b9e5a50)
* *Mobile view :*
  
  ![Login Mobile]![WhatsApp Image 2025-07-10 at 15 57 42_10d91920](https://github.com/user-attachments/assets/243e8eb4-1d11-465f-b49b-49def950767e)

### 🏠 Dashboard

* *Laptop:*
  ![Dashboard Laptop]![Screenshot 2025-07-10 154026](https://github.com/user-attachments/assets/9c84f34e-2e44-4603-bead-ef50c4ba98b5)
* *Mobile View:*
* 
  ![Dashboard Mobile]![WhatsApp Image 2025-07-10 at 15 58 57_fd9e9cd0](https://github.com/user-attachments/assets/0c58cf4a-6e79-49f7-8c3d-0ee9fae7bd89)

### 📑 Analyze Bill

* *Laptop:*
  ![Analyze Laptop]![Screenshot 2025-07-10 154208](https://github.com/user-attachments/assets/79a93a2a-93fa-4daf-9f14-56c8a3ad1af8)
* *Mobile View:*
* 
  ![Analyze Mobile]![WhatsApp Image 2025-07-10 at 15 59 44_bdee9827](https://github.com/user-attachments/assets/7da0bada-c6cc-40ec-8ae7-d0415b358ab0)


### 🤖 AI Chat

* *Laptop:*
  ![AI Chat Laptop]![Screenshot 2025-07-10 154829](https://github.com/user-attachments/assets/7cde986d-d456-4815-a2f9-2e794e47bd77)
* *Mobile View:*
  ![AI Chat Mobile]![WhatsApp Image 2025-07-10 at 16 00 36_18f4412b](https://github.com/user-attachments/assets/49c60686-fdd4-4f73-8978-34ea8ab6aa76)

### 👤 Profile Page

* *Laptop:*
  ![Profile Laptop]![Screenshot 2025-07-10 155014](https://github.com/user-attachments/assets/89f2ca66-7cce-4e3d-b9a2-b56d525396b3)
* *Mobile View:*
  ![Profile Mobile]![WhatsApp Image 2025-07-10 at 16 01 18_c3fe312a](https://github.com/user-attachments/assets/df1253bf-127e-4e8e-bfea-2b76fa5a941c)


### 💰 Donate

* *Laptop:*
  ![Donate Laptop]![Screenshot 2025-07-10 160247](https://github.com/user-attachments/assets/521cc16a-facf-4653-9f69-be67a7283912)

* *Mobile View:*
* 
  ![Donate Mobile]![WhatsApp Image 2025-07-10 at 16 02 16_186b2c9d](https://github.com/user-attachments/assets/3b25deb1-7158-4611-9875-a6ce60df1798)


### 📜 Donation History

* *Laptop:*
  ![History Laptop]![Screenshot 2025-07-10 155108](https://github.com/user-attachments/assets/4707dff2-0e4c-4a88-aa6e-4b8bac0a10fb)
* *Mobile View:*
  ![History Mobile]![WhatsApp Image 2025-07-10 at 16 03 27_80da52b8](https://github.com/user-attachments/assets/be6498db-bbd7-42d2-ad98-c584dde7db0d)


### 👥 Team Members

* *Laptop:*
  ![Team Laptop]![Screenshot 2025-07-10 155629](https://github.com/user-attachments/assets/7a81a4ce-eef0-45e5-b2ea-e163dbee6b84)
* *Mobile View:*
  ![Team Mobile]![WhatsApp Image 2025-07-10 at 16 04 16_5e101753](https://github.com/user-attachments/assets/391498c2-1c2f-439c-8861-9671e28351c5)



...

---

## 4. 📁 Project Structure

```
MyGreenHome/
├── app.js                      # Entry point
├── .env                        # Environment configuration
├── routes/                     # Express routes
│   ├── auth.js
│   ├── bill.js
│   └── dashboard.js
├── models/                     # Mongoose models
│   ├── user.js
│   ├── otp.js
│   └── models.js
├── public/                     # Static assets
│   ├── styles/
│   ├── scripts/
│   └── images/
├── utils/                      # Custom utilities
│   ├── mailer.js
│   ├── ocrParser.js
│   ├── tips.js
│   └── mindee.js
├── views/                      # EJS Templates
│   ├── dashboard.ejs
│   ├── login.ejs
│   ├── signup.ejs
│   ├── result.ejs
│   └── profile.ejs
└── uploads/                    # User uploads (bills, avatars)
```

---

## 5. 🛠️ Environment Variables (.env)

```bash
MONGO_URI=your_mongodb_connection_string_here
SESSION_SECRET=your_secure_random_string
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_gmail_app_password
```

---

## 6. 🚀 Technologies Used

* Node.js + Express
* MongoDB + Mongoose
* EJS templating
* Tesseract.js (OCR)
* Chart.js
* HTML/CSS/JavaScript
* bcryptjs, multer, nodemailer, dotenv

---

## 7. ✨ Core Features

* Secure Login/Signup with OTP
* Profile Editing + Profile Pic Upload
* OCR Bill Upload & CO₂ Estimation
* Trend Graphs & History Logs
* Green Points & Badges
* AI Assistant (in-app rule-based)
* Downloadable PDF Reports
* Leaderboard & Donation History
* Admin Panel for user management

---

## 8. 🧱 Setup Instructions

```bash
git clone <repo-url>
cd MyGreenHome
npm install
# Configure .env
npm start
```

---

## 9. 🧪 Testing Phases

### ✅ User Flow

* Visit `/auth/signup` ➝ Enter details ➝ OTP Verification
* Login ➝ Redirect to Dashboard
* Profile page ➝ Edit info ➝ Upload profile picture

### ✅ Bill Analysis

* Dashboard ➝ Upload electricity bill image ➝ Analyze ➝ View results
* Repeat with second bill ➝ Track CO₂ and consumption trend

### ✅ Gamification

* Check badges page ➝ Points increase after each analysis
* Leaderboard reflects changes with new users

### ✅ AI Assistant

* AI Chat ➝ Ask questions: "give me 3 tips", "what’s my usage?", etc.
* Test typo handling: "donatioin", "bages"

### ✅ Admin Panel

* Make a user admin via DB ➝ Login at `/admin/login`
* View dashboard ➝ Manage Users ➝ Update roles ➝ Delete users

### ✅ Donation Showcase

* View "Donate" ➝ Static demo only ➝ Confirm no real payment
* History page logs previous donations

### ✅ PDF Download

* Tracking page ➝ Click "Download Full Report" ➝ View PDF content

---

## 10. 👥 Team Members

| Name         | Role                        | GitHub                                               |
| ------------ | --------------------------- | ---------------------------------------------------- |
| Konda Reddy  | Full Stack Developer (Lead) | [@Kondareddy1209](https://github.com/Kondareddy1209) |
| Katika Sahil | Full Stack Developer        | [@sahi-sahils](https://github.com/sahi-sahils)       |
| E. Poojitha  | Data Analyst & UI Designer  | [@192211190](https://github.com/192211190)           |
| N. Sagar     | Backend & Integration Lead  | [@sagar7121](https://github.com/sagar7121)           |

---

## 11. 📝 Notes

* Make sure Tesseract is installed on your system.
* Use Gmail App Password for OTP emails.
* Update `.env` carefully before deploying.

---

## 12. 🤝 Contribution

Feel free to fork the repo, raise issues, or create PRs for improvements. All contributions are welcome!

---

## 13. 📄 License

This project is licensed under the MIT License.

---

##  THANK YOU 💚 Made with Heart for a Greener Tomorrow

