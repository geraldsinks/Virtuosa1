# Role-Based Access Control Setup Guide

This guide explains how to assign specific roles to users in the Virtuosa admin system.

## Available Roles

### 1. Admin (CEO/Super Admin)
- **Role Name**: `admin`
- **Description**: Full system access - can access all admin functions
- **Access**: All permissions (wildcard `*`)

### 2. Marketing and Communications Lead
- **Role Name**: `marketing_lead`
- **Description**: Marketing and Communications Lead
- **Access**:
  - Mass messaging
  - Asset library
  - Marketing management
  - About page editing
  - View analytics

### 3. Support and Customer Care Lead
- **Role Name**: `support_lead`
- **Description**: Support and Customer Care Lead
- **Access**:
  - Account deletion
  - Disputes
  - Contact support
  - Live chat
  - View user data

### 4. Products Lead
- **Role Name**: `products_lead`
- **Description**: Products Lead
- **Access**:
  - Maintenance mode
  - Mass messaging
  - Maintenance reports
  - UI queries
  - UX queries
  - Maintenance section

### 5. Transaction and Safety Lead
- **Role Name**: `transaction_safety_lead`
- **Description**: Transaction and Safety Lead
- **Access**:
  - Transaction system
  - Disputes
  - View transaction data
  - Transaction reports

### 6. Strategy and Growth Lead
- **Role Name**: `strategy_growth_lead`
- **Description**: Strategy and Growth Lead
- **Access**:
  - User analytics
  - Strategic analytics
  - Analytics reports
  - Growth metrics

## Database Update Instructions

### MongoDB Commands

To assign a role to a user, update their document in the `users` collection:

```javascript
// Connect to your MongoDB database
// Example using mongosh or MongoDB Compass

// Update a user to Marketing and Communications Lead
db.users.updateOne(
  { email: "user@example.com" }, // Find user by email
  { $set: { role: "marketing_lead" } }
)

// Update a user to Support and Customer Care Lead
db.users.updateOne(
  { email: "support@example.com" },
  { $set: { role: "support_lead" } }
)

// Update a user to Products Lead
db.users.updateOne(
  { email: "products@example.com" },
  { $set: { role: "products_lead" } }
)

// Update a user to Transaction and Safety Lead
db.users.updateOne(
  { email: "transactions@example.com" },
  { $set: { role: "transaction_safety_lead" } }
)

// Update a user to Strategy and Growth Lead
db.users.updateOne(
  { email: "strategy@example.com" },
  { $set: { role: "strategy_growth_lead" } }
)

// Update a user to Admin (CEO/Super Admin)
db.users.updateOne(
  { email: "ceo@example.com" },
  { $set: { role: "admin" } }
)
```

### Using Node.js Script

Create a script file `assign-roles.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

// Role assignments
const roleAssignments = [
  { email: 'marketing@virtuosa.com', role: 'marketing_lead' },
  { email: 'support@virtuosa.com', role: 'support_lead' },
  { email: 'products@virtuosa.com', role: 'products_lead' },
  { email: 'transactions@virtuosa.com', role: 'transaction_safety_lead' },
  { email: 'strategy@virtuosa.com', role: 'strategy_growth_lead' },
  { email: 'admin@virtuosa.com', role: 'admin' } // CEO
];

async function assignRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User');
    
    for (const assignment of roleAssignments) {
      const result = await User.updateOne(
        { email: assignment.email },
        { $set: { role: assignment.role } }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Updated ${assignment.email} to ${assignment.role}`);
      } else {
        console.log(`❌ User not found: ${assignment.email}`);
      }
    }
    
    console.log('Role assignment completed');
    process.exit(0);
  } catch (error) {
    console.error('Error assigning roles:', error);
    process.exit(1);
  }
}

assignRoles();
```

Run the script:
```bash
node assign-roles.js
```

## Verification

After assigning roles, you can verify the setup:

1. **Check Role Information API**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:3000/api/admin/role-info
   ```

2. **Test Access Control**:
   - Log in as a user with a specific role
   - Try to access endpoints they shouldn't have access to
   - Verify they get a 403 Forbidden error

3. **Check Dashboard Navigation**:
   - Log in as different role users
   - Verify the admin dashboard shows only relevant navigation cards

## Security Considerations

1. **Principle of Least Privilege**: Only assign the minimum permissions necessary for each role
2. **Regular Audits**: Periodically review role assignments
3. **Role Changes**: When changing roles, ensure the user logs out and logs back in to get the new permissions
4. **Backup**: Always backup your database before making bulk changes

## Troubleshooting

### Common Issues

1. **User Still Has Old Permissions**:
   - Clear browser localStorage
   - Log out and log back in
   - Check if the role was properly updated in the database

2. **403 Forbidden Errors**:
   - Verify the user's role in the database
   - Check if the endpoint has the correct permission requirement
   - Ensure the role-based middleware is properly configured

3. **Navigation Not Updating**:
   - Check browser console for JavaScript errors
   - Verify the `/api/admin/role-info` endpoint is working
   - Ensure the role navigation configuration is correct

### Debug Commands

```javascript
// Check a user's current role in MongoDB
db.users.findOne({ email: "user@example.com" }, { role: 1, email: 1 })

// List all users with their roles
db.users.find({}, { email: 1, role: 1, fullName: 1 })

// Count users by role
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## Future Enhancements

1. **Role Hierarchy**: Implement role inheritance
2. **Custom Permissions**: Allow more granular permission control
3. **Role Expiration**: Add time-based role assignments
4. **Audit Logging**: Track role changes and access attempts
5. **Multi-Factor Authentication**: Add 2FA for high-privilege roles

---

For questions or issues, contact the development team.
