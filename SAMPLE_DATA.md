/**
 * IntelliQueue - Sample Firestore Data
 * Import this data structure into your Firebase project
 */

// Collections to create with sample data:

// 1. Branches Collection
{
  "branches": [
    {
      "id": "branch1",
      "name": "Main Hospital - Cardiology",
      "location": "Downtown Medical Center",
      "totalCounters": 5,
      "activeCounters": 3,
      "lastQueueNumber": 45,
      "createdAt": "2026-01-01T08:00:00Z",
      "updatedAt": "2026-02-20T12:00:00Z"
    },
    {
      "id": "branch2",
      "name": "Main Hospital - General",
      "location": "City Hospital",
      "totalCounters": 3,
      "activeCounters": 2,
      "lastQueueNumber": 32,
      "createdAt": "2026-01-01T08:00:00Z",
      "updatedAt": "2026-02-20T12:00:00Z"
    },
    {
      "id": "branch3",
      "name": "Downtown Bank Branch",
      "location": "Financial District",
      "totalCounters": 4,
      "activeCounters": 2,
      "lastQueueNumber": 28,
      "createdAt": "2026-01-05T09:00:00Z",
      "updatedAt": "2026-02-20T12:00:00Z"
    }
  ]
}

// 2. Services Collection
{
  "services": [
    {
      "id": "service1",
      "branchId": "branch1",
      "serviceName": "Consultation",
      "avgServiceTime": 15,
      "description": "Doctor consultation"
    },
    {
      "id": "service2",
      "branchId": "branch1",
      "serviceName": "Medical Checkup",
      "avgServiceTime": 20,
      "description": "Full medical examination"
    },
    {
      "id": "service3",
      "branchId": "branch3",
      "serviceName": "Payment Processing",
      "avgServiceTime": 5,
      "description": "Bill payment and processing"
    }
  ]
}

// 3. Counters Collection
{
  "counters": [
    {
      "id": "counter1",
      "branchId": "branch1",
      "counterNumber": 1,
      "status": "serving",
      "currentTokenId": "token100",
      "createdAt": "2026-01-01T08:00:00Z"
    },
    {
      "id": "counter2",
      "branchId": "branch1",
      "counterNumber": 2,
      "status": "idle",
      "currentTokenId": null,
      "createdAt": "2026-01-01T08:00:00Z"
    },
    {
      "id": "counter3",
      "branchId": "branch1",
      "counterNumber": 3,
      "status": "serving",
      "currentTokenId": "token99",
      "createdAt": "2026-01-01T08:00:00Z"
    }
  ]
}

// 4. Tokens Collection (Active)
{
  "tokens": [
    {
      "id": "token100",
      "tokenId": "token100",
      "queueNumber": 46,
      "branchId": "branch1",
      "serviceType": "consultation",
      "userName": "John Doe",
      "userPhone": "+1234567890",
      "status": "serving",
      "createdAt": "2026-02-20T10:30:00Z",
      "serviceStartTime": "2026-02-20T11:45:00Z",
      "serviceEndTime": null,
      "qrCodeValue": "token100"
    },
    {
      "id": "token101",
      "tokenId": "token101",
      "queueNumber": 47,
      "branchId": "branch1",
      "serviceType": "checkup",
      "userName": "Jane Smith",
      "userPhone": "+9876543210",
      "status": "waiting",
      "createdAt": "2026-02-20T11:00:00Z",
      "serviceStartTime": null,
      "serviceEndTime": null,
      "qrCodeValue": "token101"
    }
  ]
}

// 5. QueueHistory Collection (Completed)
{
  "queueHistory": [
    {
      "id": "history1",
      "tokenId": "token50",
      "queueNumber": 31,
      "branchId": "branch1",
      "serviceType": "consultation",
      "userName": "Alice Johnson",
      "userPhone": "+1111111111",
      "status": "completed",
      "createdAt": "2026-02-20T09:15:00Z",
      "serviceStartTime": "2026-02-20T09:30:00Z",
      "serviceEndTime": "2026-02-20T09:45:00Z",
      "qrCodeValue": "token50",
      "updatedAt": "2026-02-20T09:45:00Z"
    }
  ]
}

// Notes:
// - Create each collection in Firebase Firestore Console
// - Use the 'id' field as the document ID
// - Timestamps should be in ISO 8601 format or use Firebase server timestamp
// - Null values can be omitted from Firestore
