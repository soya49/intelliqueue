# IntelliQueue - API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication
Currently, the API does not require authentication for most endpoints. For production, implement JWT or Firebase Authentication.

---

## Endpoints

### 1. Book Token
**POST** `/api/token/book`

Books a new token for a customer in the queue.

**Request Body:**
```json
{
  "branchId": "branch1",
  "serviceType": "consultation",
  "userName": "John Doe",
  "userPhone": "+1234567890"
}
```

**Response (201 - Created):**
```json
{
  "success": true,
  "message": "Token booked successfully",
  "token": {
    "tokenId": "token_abc123",
    "queueNumber": 42,
    "branchId": "branch1",
    "serviceType": "consultation",
    "userName": "John Doe",
    "userPhone": "+1234567890",
    "status": "waiting",
    "createdAt": "2026-02-20T10:30:00Z",
    "qrCodeValue": "token_abc123"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Missing required fields: branchId, serviceType, userName"
}
```

---

### 2. Get Queue Status
**GET** `/api/token/queue/:branchId?serviceType=consultation`

Get current queue status for a branch and service type.

**Query Parameters:**
- `serviceType` (optional): Filter by service type

**Response (200):**
```json
{
  "success": true,
  "data": {
    "branchId": "branch1",
    "waitingCount": 5,
    "currentlyServing": {
      "tokenId": "token100",
      "queueNumber": 38,
      "userName": "Jane Smith",
      "status": "serving"
    },
    "estimatedWaitTime": 45,
    "crowdDensity": {
      "level": "MEDIUM",
      "ratio": "2.50",
      "color": "yellow"
    }
  }
}
```

**Crowd Density Levels:**
- `LOW`: ratio < 2 (green)
- `MEDIUM`: ratio 2-5 (yellow)
- `HIGH`: ratio > 5 (red)

---

### 3. Get Token Details
**GET** `/api/token/:tokenId`

Get detailed information about a specific token.

**Response (200):**
```json
{
  "success": true,
  "token": {
    "tokenId": "token_abc123",
    "queueNumber": 42,
    "branchId": "branch1",
    "serviceType": "consultation",
    "userName": "John Doe",
    "userPhone": "+1234567890",
    "status": "waiting",
    "createdAt": "2026-02-20T10:30:00Z",
    "qrCodeValue": "token_abc123"
  },
  "estimatedWaitTime": 25,
  "position": 5,
  "positionMessage": "You are #5 in queue"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Token not found"
}
```

---

### 4. Update Token Status
**POST** `/api/token/update-status`

Update the status of a token (admin action).

**Request Body:**
```json
{
  "tokenId": "token_abc123",
  "status": "serving",
  "branchId": "branch1"
}
```

**Valid Statuses:**
- `arrived`: Customer has arrived at counter
- `serving`: Service is in progress
- `completed`: Service is complete
- `cancelled`: Token has been cancelled

**Response (200):**
```json
{
  "success": true,
  "message": "Token status updated to serving",
  "token": {
    "tokenId": "token_abc123",
    "queueNumber": 42,
    "status": "serving",
    "serviceStartTime": "2026-02-20T10:45:00Z"
  }
}
```

---

### 5. Cancel Token
**POST** `/api/token/cancel`

Cancel a token and remove it from the queue.

**Request Body:**
```json
{
  "tokenId": "token_abc123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token cancelled successfully"
}
```

---

### 6. Get Analytics
**GET** `/api/token/analytics/:branchId`

Get analytics for a branch (tokens today, average service time, peak hours, etc.).

**Response (200):**
```json
{
  "success": true,
  "analytics": {
    "totalTokensToday": 87,
    "completedTokens": 42,
    "cancelledTokens": 3,
    "averageServiceTime": 12,
    "peakHour": {
      "hour": 12,
      "count": 18,
      "formattedHour": "12:00 - 13:00"
    },
    "noShowRate": 3.45,
    "hourlyData": [
      {
        "hour": "09:00",
        "tokens": 8
      },
      {
        "hour": "10:00",
        "tokens": 12
      },
      {
        "hour": "11:00",
        "tokens": 15
      },
      {
        "hour": "12:00",
        "tokens": 18
      }
    ]
  }
}
```

---

### 7. Health Check
**GET** `/health`

Check if the server is running.

**Response (200):**
```json
{
  "status": "IntelliQueue Server is running!"
}
```

---

## Real-Time Events (Socket.io)

### Client Events

#### Join Branch
```javascript
socket.emit('joinBranch', 'branch1');
```

#### Leave Branch
```javascript
socket.emit('leaveBranch', 'branch1');
```

### Server Events

#### Queue Updated
Emitted to all clients in a branch room when queue changes.

```javascript
socket.on('queueUpdated', (data) => {
  // data structure:
  {
    action: 'tokenBooked', // or 'tokenStatusUpdated', 'tokenCancelled'
    tokenId: 'token_abc123',
    token: { /* token object */ },
    message: 'New token #42 created'
  }
});
```

---

## Error Responses

### 400 - Bad Request
Missing required fields or invalid parameters.

```json
{
  "success": false,
  "message": "Missing required fields: branchId, serviceType, userName"
}
```

### 404 - Not Found
Resource doesn't exist.

```json
{
  "success": false,
  "message": "Token not found"
}
```

### 500 - Internal Server Error
Server-side error.

```json
{
  "success": false,
  "message": "Error booking token",
  "error": "Error details (only in development)"
}
```

---

## Rate Limiting
Not currently implemented. Recommended for production:
- 100 requests per minute per IP for public endpoints
- 1000 requests per minute for authenticated admin endpoints

---

## CORS Headers
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Pagination
Not currently implemented. Future enhancement:
```
GET /api/token/queue/:branchId?page=1&limit=10
```

---

## Filtering
Current filtering options:
- `serviceType`: Filter tokens by service type
- `status`: Filter by token status
- `branchId`: Filter by branch

Example:
```
GET /api/token/queue/branch1?serviceType=consultation
```

---

## Future Enhancements

1. **User Authentication**: JWT or Firebase Auth
2. **Pagination**: For large datasets
3. **Advanced Filtering**: Date ranges, time periods
4. **Export**: CSV/PDF export of analytics
5. **Video API**: Integration for remote consultations
6. **SMS/Email**: Notification system
7. **Webhooks**: For third-party integrations
8. **GraphQL**: Alternative query language

---

## Testing with cURL

### Book a token
```bash
curl -X POST http://localhost:5000/api/token/book \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch1",
    "serviceType": "consultation",
    "userName": "John Doe",
    "userPhone": "+1234567890"
  }'
```

### Get queue status
```bash
curl http://localhost:5000/api/token/queue/branch1?serviceType=consultation
```

### Get token details
```bash
curl http://localhost:5000/api/token/token_abc123
```

### Update token status
```bash
curl -X POST http://localhost:5000/api/token/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "token_abc123",
    "status": "serving",
    "branchId": "branch1"
  }'
```

### Get analytics
```bash
curl http://localhost:5000/api/token/analytics/branch1
```

---

## Version History
- **v1.0.0** (2026-02-20): Initial release with core features
