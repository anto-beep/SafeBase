# Auth Testing Playbook (Emergent Google OAuth)

## Step 1: Create Test Session via mongosh
```
mongosh --eval "
use('test_database');
var userId = 'user_test123';
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user@example.com',
  name: 'Test User',
  role: 'owner',
  auth_provider: 'google',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Token: ' + sessionToken);
"
```

## Step 2: Test endpoints
```
curl -H "Authorization: Bearer SESSION_TOKEN" $BACKEND/api/auth/me
```

## Step 3: Browser cookie
Set `session_token` cookie (httpOnly, secure, samesite=none) then visit /dashboard
