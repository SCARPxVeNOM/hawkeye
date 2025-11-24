<div align="center">

# 🦅 Hawkeye

### Campus Incident Reporting & Predictive Maintenance System

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/scarpxvenoms-projects/v0-incident-reporting-system)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![BentoML](https://img.shields.io/badge/ML-BentoML-FF6F61?style=for-the-badge)](https://www.bentoml.com/)

[🚀 Live Demo](https://hawkeye-nu.vercel.app) • [📚 Documentation](https://documentation-zeta-eight.vercel.app/) • [🤖 ML API](https://failure-prediction-prod-0d460137.mt-guc1.bentoml.ai)• [DEMO VIDEO](https://youtu.be/4ANA8-waX6k)

</div>

---

## 📖 Overview

**Hawkeye** is an intelligent campus incident reporting and predictive maintenance system that leverages machine learning to predict equipment failures before they occur. Built for educational institutions, it streamlines incident management, technician scheduling, and proactive maintenance planning.

### ✨ Key Highlights

- 🤖 **AI-Powered Predictions**: ML model deployed on BentoML Cloud predicts equipment failures with confidence scores
- 📊 **Real-time Analytics**: Comprehensive dashboards with heatmaps, aging analysis, and SLA monitoring
- 👥 **Multi-role System**: Separate portals for Students, Administrators, and Technicians
- 🔔 **Smart Notifications**: Real-time alerts for critical incidents and assignments
- 📍 **Geolocation Tracking**: GPS-based incident reporting with interactive heatmaps
- 📈 **Performance Metrics**: Technician performance tracking and workload optimization

---

## 🎯 Features

### For Students & Staff
- 📝 **Quick Incident Reporting**: Submit issues with images, location, and detailed descriptions
- 📱 **Real-time Tracking**: Monitor incident status from creation to resolution
- 💬 **Feedback System**: Rate technician performance and provide constructive feedback
- 🔔 **Instant Notifications**: Get updates on your reported incidents

### For Administrators
- 🎛️ **Comprehensive Dashboard**: Overview of all incidents with advanced filtering
- 👷 **Technician Management**: Assign tasks based on specialization and availability
- 📊 **Analytics Suite**:
  - Incident heatmaps by location and category
  - Aging analysis for long-pending issues
  - SLA monitoring with automatic escalation
  - Predictive alerts powered by ML
- 📈 **Performance Tracking**: Monitor technician efficiency and resolution times
- 👥 **User Management**: Control access and manage roles

### For Technicians
- 📋 **Task Dashboard**: View assigned incidents with priority sorting
- ✅ **Status Updates**: Update incident progress in real-time
- 📸 **Completion Reports**: Submit completion notes and images
- 📊 **Personal Metrics**: Track your performance and completed tasks

### ML-Powered Intelligence
- 🔮 **Failure Prediction**: Machine learning model predicts equipment failures
- 📉 **Risk Assessment**: Confidence scoring for predicted incidents
- 🎯 **Critical Alerts**: Automatic flagging of high-risk areas
- 📊 **Model Transparency**: R² scores and validation metrics displayed

---

## 🏗️ Architecture

### Tech Stack

#### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/)
- **Charts**: [Recharts](https://recharts.org/) & [Plotly.js](https://plotly.com/javascript/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

#### Backend
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **API**: Next.js API Routes (REST)
- **Rate Limiting**: Custom middleware

#### Machine Learning
- **Deployment**: [BentoML Cloud](https://www.bentoml.com/)
- **API Endpoint**: [failure-prediction-prod](https://failure-prediction-prod-0d460137.mt-guc1.bentoml.ai)
- **Features**: Equipment age, maintenance history, environmental factors
- **Output**: Days to failure prediction with confidence scores

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│  ┌──────────┬──────────┬──────────┬──────────────────┐     │
│  │  User    │  Admin   │Technician│   Components     │     │
│  │Dashboard │Dashboard │ Portal   │  (Radix UI)      │     │
│  └──────────┴──────────┴──────────┴──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                     │
│  ┌────────┬─────────┬───────────┬─────────┬──────────┐     │
│  │Incidents│Technicians│Predictions│Notifications│Auth│     │
│  └────────┴─────────┴───────────┴─────────┴──────────┘     │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐          ┌──────────────────────────┐
│   MongoDB Atlas      │          │   BentoML Cloud API      │
│  ┌────────────────┐  │          │  ┌────────────────────┐ │
│  │ • users        │  │          │  │ Failure Prediction │ │
│  │ • incidents    │  │          │  │    ML Model        │ │
│  │ • predictions  │  │          │  │  (R² Validated)    │ │
│  │ • notifications│  │          │  └────────────────────┘ │
│  │ • technician_  │  │          │                          │
│  │   schedule     │  │          └──────────────────────────┘
│  └────────────────┘  │
└──────────────────────┘
```

---

## 🗄️ Database Schema

### Collections

#### **users**
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password_hash: String,
  name: String,
  role: String, // "user" | "admin" | "technician"
  specialization: String, // For technicians
  created_at: Date,
  updated_at: Date
}
```

#### **incidents**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (indexed),
  title: String,
  category: String, // "Electricity", "Water", "IT", "Hostel", "Garbage"
  description: String,
  image_url: String,
  location: String,
  latitude: Number,
  longitude: Number,
  status: String (indexed), // "new", "assigned", "in_progress", "resolved", "closed"
  priority: Number, // 1-5
  assigned_to: ObjectId (indexed),
  created_at: Date (indexed),
  updated_at: Date,
  resolved_at: Date
}
```

#### **predictions**
```javascript
{
  _id: ObjectId,
  location: String (indexed),
  category: String (indexed),
  confidence_score: Number, // 0-1
  alert_message: String,
  predicted_time: Date,
  days_to_next_failure: Number,
  model_info: Object,
  created_at: Date (indexed)
}
```

#### **technician_schedule**
```javascript
{
  _id: ObjectId,
  technician_id: ObjectId (indexed),
  incident_id: ObjectId (indexed),
  scheduled_time: Date (indexed),
  duration_minutes: Number,
  status: String (indexed), // "scheduled", "in_progress", "completed", "cancelled"
  created_at: Date
}
```

#### **notifications**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (indexed),
  type: String,
  title: String,
  message: String,
  link: String,
  read: Boolean (indexed),
  created_at: Date (indexed)
}
```

#### **technician_feedback**
```javascript
{
  _id: ObjectId,
  incident_id: ObjectId (indexed),
  technician_id: ObjectId (indexed),
  user_id: ObjectId (indexed),
  rating: Number, // 1-5
  comment: String,
  created_at: Date (indexed)
}
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/pnpm
- **MongoDB Atlas** account (or local MongoDB instance)
- **BentoML Cloud** API access (optional, for ML predictions)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SCARPxVeNOM/hawkeye.git
   cd hawkeye/v0-incident-reporting-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://your-connection-string
   MONGODB_DB_NAME=incident_reporting

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here

   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Initialize the database**
   ```bash
   node scripts/init-db.js
   node scripts/create-admin.js
   node scripts/create-technician.js
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Credentials

#### Admin Access
- **URL**: `/admin/login`
- **Email**: `admin@campus.com`
- **Password**: `admin123`

#### Technician Access
- **URL**: `/technician/login`
- All technicians use password: `tech123`

**Available Technician Accounts:**

1. **Electrical Technician**
   - Email: `john.smith@campus.com`
   - Password: `tech123`
   - Specialization: Electrical

2. **Plumbing Technician**
   - Email: `sarah.johnson@campus.com`
   - Password: `tech123`
   - Specialization: Plumbing

3. **HVAC Technician**
   - Email: `mike.davis@campus.com`
   - Password: `tech123`
   - Specialization: HVAC

4. **IT Technician**
   - Email: `emily.chen@campus.com`
   - Password: `tech123`
   - Specialization: IT

5. **General Technician**
   - Email: `david.wilson@campus.com`
   - Password: `tech123`
   - Specialization: General

---

## 🤖 ML Model Integration

### Model Files

The trained ML model files are available in the `model/` directory:

- **`xgboost_advanced_model.joblib`** - Main XGBoost model for failure prediction (169MB)
- **`scaler.joblib`** - Feature scaler for data normalization
- **`target_encoder.joblib`** - Target encoder for categorical features
- **`feature_info.joblib`** / **`feature_info.pkl`** - Feature metadata and information
- **`optuna_study_advanced.pkl`** - Optuna hyperparameter optimization study
- **`test_predictions_advanced.csv`** - Test predictions and evaluation results
- **`feature_importance_advanced.png`** - Feature importance visualization

### BentoML Cloud API

The ML model is deployed on BentoML Cloud and accessible via REST API:

- **Production Endpoint**: `https://failure-prediction-prod-0d460137.mt-guc1.bentoml.ai`
- **Playground**: [BentoML Playground](https://service12.cloud.bentoml.com/deployments/failure-prediction-prod/playground)

> **Note**: The model files in the repository can be used for local development or to deploy your own BentoML service. The production API uses the same model architecture.

### Prediction Request Format

```json
{
  "location": "Building A - Room 101",
  "category": "Electricity",
  "equipment_age_days": 1825,
  "manufacturer": "Generic",
  "model": "Standard",
  "last_maintenance_days_ago": 90,
  "operating_hours": 4380,
  "temperature_celsius": 25.5,
  "humidity_percent": 55.0,
  "vibration_level": 2.5,
  "power_consumption_kw": 5.0
}
```

### Response Format

```json
{
  "prediction": 0.75,
  "days_to_next_failure": 15,
  "model_info": {
    "validation_r2": "0.85",
    "test_r2": "0.82"
  }
}
```

### Integration

```typescript
import { getMLPrediction } from '@/lib/services/prediction.service'

// Get prediction for an incident
const prediction = await getMLPrediction(incident)
console.log(`Failure predicted in ${prediction.days_to_next_failure} days`)
```

---

## 📁 Project Structure

```
v0-incident-reporting-system/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard
│   │   ├── dashboard/            # Admin dashboard page
│   │   └── login/                # Admin login
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── incidents/            # Incident CRUD
│   │   ├── predictions/          # ML predictions
│   │   ├── technicians/          # Technician management
│   │   └── notifications/        # Notification system
│   ├── auth/                     # User authentication pages
│   ├── dashboard/                # User dashboard
│   ├── technician/               # Technician portal
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── ui/                       # Radix UI components
│   ├── incident-form.tsx         # Incident reporting form
│   ├── incident-list.tsx         # Incident list view
│   ├── analytics-overview.tsx   # Dashboard analytics
│   ├── heatmap.tsx               # Location heatmap
│   ├── predictive-alerts.tsx    # ML prediction alerts
│   └── ...                       # Other components
├── lib/                          # Utility functions
│   ├── services/                 # Business logic services
│   │   ├── incident.service.ts   # Incident operations
│   │   ├── prediction.service.ts # ML predictions
│   │   ├── technician.service.ts # Technician management
│   │   └── notification.service.ts
│   ├── mongodb.ts                # MongoDB connection
│   └── utils.ts                  # Helper functions
├── scripts/                      # Database initialization
│   ├── init-db.js                # MongoDB setup
│   ├── create-admin.js           # Create admin user
│   └── create-technician.js      # Create technician users
├── public/                       # Static assets
├── types/                        # TypeScript definitions
├── .env.local                    # Environment variables
└── package.json                  # Dependencies
```

---

## 📊 Features Deep Dive

### 1. Intelligent Predictions

The system uses both rule-based and ML-powered prediction algorithms:

**Rule-Based Predictions**:
- Frequency analysis of historical incidents
- Location-category pattern recognition
- 7-day rolling window analysis

**ML-Based Predictions** (BentoML):
- Equipment age and maintenance history analysis
- Environmental factor correlation (temperature, humidity, vibration)
- Regression model with R² validation
- Days-to-failure prediction with confidence scores

### 2. SLA Monitoring & Escalation

- Automatic tracking of incident age
- SLA breach detection and alerting
- Priority escalation for overdue incidents
- Configurable SLA thresholds by category

### 3. Heatmap Visualization

- Interactive geospatial incident mapping
- Category-based filtering
- Density visualization using Plotly.js
- Real-time updates

### 4. Technician Performance

Metrics tracked:
- Average resolution time
- Completion rate
- User satisfaction ratings
- Workload distribution

### 5. Notification System

- Real-time push notifications
- Role-based notification routing
- Notification center with read/unread status
- Email integration (optional)

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ Yes |
| `MONGODB_DB_NAME` | Database name | ✅ Yes |
| `NEXTAUTH_URL` | Application URL | ✅ Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ❌ No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | ❌ No |

### Customization

#### Categories
Modify incident categories in `components/incident-form.tsx`:
```typescript
const categories = [
  { value: "electricity", label: "⚡ Electricity" },
  { value: "water", label: "💧 Water" },
  // Add your custom categories
]
```

#### SLA Thresholds
Update in `lib/services/escalation.service.ts`:
```typescript
const SLA_THRESHOLDS = {
  electricity: 24, // hours
  water: 12,
  // Customize per category
}
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy!

### Docker

```bash
docker build -t hawkeye .
docker run -p 3000:3000 --env-file .env.local hawkeye
```

### Manual Deployment

```bash
npm run build
npm start
```

---

## 📚 Documentation

Comprehensive documentation is available at:

🔗 **[https://documentation-zeta-eight.vercel.app/](https://documentation-zeta-eight.vercel.app/)**

Documentation includes:
- **AI Logic**: ML prediction system architecture
- **Routine Flow**: System workflows and processes
- **Task Scheduling**: Background jobs and cron logic
- **DB Schema**: Detailed database documentation

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/SCARPxVeNOM">
        <img src="https://github.com/SCARPxVeNOM.png" width="100px;" alt="Aryan Anand"/><br />
        <sub><b>Aryan Anand</b></sub><br />
        <sub>SCARPxVeNOM</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Anu062004">
        <img src="https://github.com/Anu062004.png" width="100px;" alt="Anubhav"/><br />
        <sub><b>Anubhav</b></sub><br />
        <sub>Anu062004</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/ayushsaklani-min">
        <img src="https://github.com/ayushsaklani-min.png" width="100px;" alt="Ayush Saklani"/><br />
        <sub><b>Ayush Saklani</b></sub><br />
        <sub>ayushsaklani-min</sub>
      </a>
    </td>
  </tr>
</table>

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **BentoML** for providing the ML deployment platform
- **Vercel** for hosting and deployment
- **MongoDB Atlas** for database infrastructure
- **Radix UI** for accessible component primitives
- **Next.js team** for the amazing framework

---

## 📧 Contact & Support

- **GitHub**: [@SCARPxVeNOM](https://github.com/SCARPxVeNOM)
- **Repository**: [hawkeye](https://github.com/SCARPxVeNOM/hawkeye)
- **Issues**: [Report a bug](https://github.com/SCARPxVeNOM/hawkeye/issues)

---

<div align="center">

**Built with ❤️ for smarter campus maintenance**

[⬆ Back to Top](#-hawkeye)

</div>
