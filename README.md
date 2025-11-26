# Mobishaala Backend API

Backend server for Mobishaala Dashboard with authentication.

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobishaala-backend
npm install
```

### 2. MongoDB Setup

You need to have MongoDB installed and running on your system.

**Option 1: Local MongoDB**
- Install MongoDB from https://www.mongodb.com/try/download/community
- Start MongoDB service
- Default connection: `mongodb://localhost:27017/mobishaala`

**Option 2: MongoDB Atlas (Cloud)**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a new cluster
- Get your connection string
- Update `MONGODB_URI` in `.env` file

### 3. Cloudinary Setup (For Image Uploads)

1. Create a free account at https://cloudinary.com
2. Go to Dashboard and copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

### 4. Environment Variables

Create a `.env` file in the `mobishaala-backend` folder:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mobishaala
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
ALLOWED_EMAIL=admin@mobishaala.com

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Important:** 
- Change `JWT_SECRET` to a strong random string in production
- Set `ALLOWED_EMAIL` to the email address that should be allowed to login
- Add your Cloudinary credentials for image uploads to work

### 5. Create Initial User

After starting the server, you need to create a user account. You can do this by:

**Option 1: Using API (Recommended)**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mobishaala.com","password":"your_password"}'
```

**Option 2: Using Postman or similar tool**
- POST request to `http://localhost:5000/api/auth/register`
- Body (JSON):
```json
{
  "email": "admin@mobishaala.com",
  "password": "your_password"
}
```

### 6. Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@mobishaala.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "admin@mobishaala.com"
  }
}
```

### GET /api/auth/verify
Verify JWT token (requires Authorization header).

**Headers:**
```
Authorization: Bearer <token>
```

### POST /api/auth/register
Register a new user (only works with allowed email).

**Request:**
```json
{
  "email": "admin@mobishaala.com",
  "password": "your_password"
}
```

## Institute API Endpoints

All institute endpoints require authentication (Bearer token in Authorization header).

### GET /api/institutes
Get all institutes.

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

### GET /api/institutes/:id
Get a single institute by ID.

### POST /api/institutes
Create a new institute. Requires multipart/form-data for file uploads.

**Form Fields:**
- businessName* (required)
- businessOwnerName* (required)
- businessNumber* (required)
- businessEmail* (required)
- businessGSTNumber* (required)
- businessPANNumber* (required)
- businessMobileNumber* (required)
- businessCategory* (required)
- city* (required)
- pinCode* (required)
- businessAddress* (required)
- businessLogo (file)
- instituteImage (file)
- businessWebsite
- businessYouTubeChannel
- annualTurnoverRange
- status

**Response:**
```json
{
  "success": true,
  "message": "Institute created successfully",
  "data": {
    "instituteId": "CDIDBYFG34GD",
    ...
  }
}
```

### PUT /api/institutes/:id
Update an existing institute.

### DELETE /api/institutes/:id
Delete an institute.

## Security Notes

- Only the email specified in `ALLOWED_EMAIL` can login
- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Always use HTTPS in production
- Keep your `JWT_SECRET` secure and never commit it to version control

