Xeno CRM Platform
A Mini CRM Platform for customer segmentation, personalized campaign delivery, and intelligent insights, built as part of the Xeno SDE Internship Assignment 2025.
Features

Data Ingestion: REST APIs to ingest customers and orders.
Campaign Creation: Web UI to define audience segments and initiate campaigns.
Campaign Delivery: Simulated vendor API with delivery success/failure logging.
Authentication: Google OAuth 2.0 via NextAuth.
Dashboard: Beautiful dashboard with metrics and recent activity.

Tech Stack

Frontend: Next.js, React, ShadCN, Tailwind CSS
Backend: Next.js API Routes, Mongoose (MongoDB)
Database: MongoDB
Authentication: NextAuth with Google OAuth
Validation: Zod
Optional: Redis Streams for pub-sub (commented out)

Setup Instructions

Clone the repository:git clone <repo-url>
cd xeno-crm


Install dependencies:npm install


Set up environment variables in .env:MONGODB_URI=mongodb://localhost:27017/xeno_crm
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000


Run the development server:npm run dev


Access the app at http://localhost:3000.

Architecture Diagram
[Client] --> [Next.js App]
                |
                v
 [API Routes] --> [Mongoose] --> [MongoDB]
                |
                v
 [Vendor API] --> [Delivery Receipt API]

Known Limitations

Simplified rule-based querying in /api/customers/preview.
Pub-sub architecture is commented out (requires Redis setup).
AI features not yet implemented.

Submission

GitHub Repo: <your-repo-url>
Deployed URL: <your-vercel-url>
Demo Video: <your-video-url>

