# Origin by ILCO - JIGPOS

Cannabis retail and cultivation POS: dispensary, stock control, dispatch, compliance, and staff roles.

## Stack

- Static HTML/JS frontend (`newbrand/` - no build step)
- Node.js / Express backend (`newbrand/backend/`)
- MongoDB

## Prerequisites

- Node.js 20+
- MongoDB 6+ running locally (`mongodb://localhost:27017`)

## Local setup

```bash
git clone https://github.com/gioninarchitect/jig.git
cd jig/newbrand/backend
npm install
# Create a .env file with the vars below
npm run dev
```

The API starts on port 3001. Open the frontend by opening any HTML file in `newbrand/` directly in a browser, or serve the folder with `npx serve .` from `newbrand/`.

## Key env vars

Create `newbrand/backend/.env`:

```
MONGODB_URI=mongodb://localhost:27017/origin
JWT_SECRET=change-me-local
PORT=3001
NODE_ENV=development
```

For email (OTP), leave `SMTP_*` vars unset in local dev to skip sending.

## Notes

- The active backend entrypoint is `newbrand/backend/api.js`
- Branch ID (`activeBranchId`) is read from `sessionStorage` at login; seed a branch in MongoDB first if testing till management
- `config.js` in `newbrand/` controls all defaults
