# API Response Standardization Guide

## Overview

All API endpoints should use the standardized response utilities from `utils/apiResponse.js` to ensure consistency across the application.

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... }  // Optional detailed errors
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasMore": true
  }
}
```

## Usage Examples

### Import the utility
```javascript
const apiResponse = require('../utils/apiResponse');
```

### Success Responses

#### Basic success (200)
```javascript
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  return apiResponse.success(res, users, 'Users retrieved successfully');
});
```

#### Created (201)
```javascript
app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body);
  return apiResponse.created(res, user, 'User created successfully');
});
```

#### Paginated response
```javascript
app.get('/api/products', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const products = await Product.find()
    .limit(limit)
    .skip((page - 1) * limit);
  const total = await Product.countDocuments();

  return apiResponse.paginated(res, products, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    hasMore: (page * limit) < total
  });
});
```

### Error Responses

#### Bad Request (400)
```javascript
if (!email || !password) {
  return apiResponse.badRequest(res, 'Email and password are required');
}
```

#### Unauthorized (401)
```javascript
if (!validPassword) {
  return apiResponse.unauthorized(res, 'Invalid credentials');
}
```

#### Forbidden (403)
```javascript
if (user.role !== 'admin') {
  return apiResponse.forbidden(res, 'Admin access required');
}
```

#### Not Found (404)
```javascript
const user = await User.findById(id);
if (!user) {
  return apiResponse.notFound(res, 'User not found');
}
```

#### Conflict (409)
```javascript
const existingUser = await User.findOne({ email });
if (existingUser) {
  return apiResponse.conflict(res, 'User with this email already exists');
}
```

#### Validation Error (422)
```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return apiResponse.validationError(res, errors.array(), 'Validation failed');
}
```

#### Server Error (500)
```javascript
try {
  // ... operation
} catch (error) {
  logger.error('Operation failed', { error: error.message, stack: error.stack });
  return apiResponse.serverError(res, 'Failed to complete operation');
}
```

## Migration Strategy

When updating existing endpoints:

1. Import the apiResponse utility at the top of the file
2. Replace existing response patterns with standardized methods
3. Ensure all success responses include `success: true`
4. Ensure all error responses include `success: false`
5. Use appropriate HTTP status codes
6. Include descriptive messages

### Before
```javascript
res.status(200).json({
  users,
  total: users.length
});
```

### After
```javascript
return apiResponse.success(res, {
  users,
  total: users.length
}, 'Users retrieved successfully');
```

## Benefits

- **Consistency**: All endpoints follow the same response structure
- **Maintainability**: Centralized response logic
- **Client-friendly**: Frontend can rely on consistent `success` flag
- **Developer experience**: Clear, self-documenting response patterns
- **Error handling**: Standardized error responses with appropriate status codes

## Available Methods

| Method | Status Code | Use Case |
|--------|-------------|----------|
| `success()` | 200 | Successful GET, PUT, DELETE operations |
| `created()` | 201 | Successful POST operations |
| `badRequest()` | 400 | Invalid request data |
| `unauthorized()` | 401 | Authentication required/failed |
| `forbidden()` | 403 | User lacks permissions |
| `notFound()` | 404 | Resource doesn't exist |
| `conflict()` | 409 | Resource already exists |
| `validationError()` | 422 | Input validation failed |
| `serverError()` | 500 | Unexpected server errors |
| `paginated()` | 200 | List endpoints with pagination |
