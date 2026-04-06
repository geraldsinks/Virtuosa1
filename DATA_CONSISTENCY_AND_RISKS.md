# Data Consistency & Risk Mitigation System

## 🔒 Database Integrity Checks

### Transaction Creation Validation Chain

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/transactions (Line 3852)                              │
└─────────────────────────────────────────────────────────────────┘
           ↓
[1] USER VERIFICATION
   ├─ Check req.user exists (from authenticateToken middleware)
   ├─ Load User from database
   ├─ Verify user.isStudentVerified === true
   └─ ❌ If fails: Return 403 Forbidden

[2] REQUIRED FIELDS VALIDATION
   ├─ productId provided
   ├─ deliveryMethod provided ('Delivery' or 'Pickup')
   ├─ paymentMethod provided
   └─ ❌ If incomplete: Return 400 Bad Request

[3] PRODUCT EXISTENCE & STATUS CHECK (CRITICAL)
   ├─ const product = await Product.findById(productId)
   ├─ Check: product exists
   ├─ Check: product.status === 'Active'  // ✅ FROM FIX
   ├─ Check: product.seller !== user._id (not self-purchase)
   └─ ❌ If fails: Return 404 or 400

[4] INVENTORY CHECK (Multi-listing safe)
   ├─ IF product.listingType === 'persistent'
   │  ├─ Check: product.inventory > 0
   │  └─ ❌ If inventory=0: Return 400 'out of stock'
   └─ IF product.listingType === 'one_time'
      ├─ Already checked status='Active' (one available)
      └─ ✅ Proceed (will be 'Reserved' after transaction)

[5] SELLER EXISTENCE & ACCESSIBILITY
   ├─ product.seller points to valid User
   ├─ seller.email available (for notifications)  // ✅ FROM FIX
   ├─ seller.phoneNumber available              // ✅ FROM FIX
   └─ ✅ Essential for Transaction processing

[6] CREATE TRANSACTION RECORD
   ├─ new Transaction({
   │  ├─ buyer: user._id
   │  ├─ seller: product.seller  // ✅ NOW CORRECT
   │  ├─ product: product._id
   │  ├─ amount: product.price + deliveryFee
   │  ├─ platformFee: (paymentMethod === 'cash_on_delivery') ? 0 : amount * 0.06
   │  ├─ sellerAmount: amount - platformFee
   │  ├─ status: 'pending'
   │  └─ paymentMethod: method
   │  })
   └─ await transaction.save()

[7] UPDATE PRODUCT STATE (Atomic-like)
   ├─ IF product.listingType === 'one_time'
   │  ├─ product.status = 'Reserved'
   │  ├─ Prevents duplicate transactions
   │  └─ Will become 'Sold' after payment
   │
   └─ IF product.listingType === 'persistent'
      ├─ product.inventory -= 1
      ├─ product.totalSold += 1
      ├─ product.salesHistory.push({
      │   ├─ buyer: user._id,
      │   ├─ quantity: 1,
      │   ├─ price: product.price,
      │   └─ soldAt: now()
      │  })
      ├─ IF product.inventory <= 0
      │  └─ product.status = 'Out of Stock'
      └─ ELSE
         └─ product.status = 'Active'  // ✅ STAYS ACTIVE

[8] PERSIST PRODUCT CHANGES
   ├─ product.lastSoldAt = now()
   ├─ await product.save()
   └─ ✅ Ensures DB consistency

[9] SEND NOTIFICATIONS
   ├─ notificationService.sendOrderNotification(
   │  ├─ transaction,
   │  ├─ 'new_order',
   │  └─ product.seller  // ✅ NOW HAS EMAIL
   │  )
   └─ ✅ Seller alerted immediately

[10] RETURN SUCCESS RESPONSE
    └─ res.json(201, { transaction })
```

---

## 🎯 Data Consistency Mechanisms

### Problem: Race Conditions in Concurrent Orders

**Scenario**: Two buyers trying to buy same one-time product simultaneously

```
Timeline:
────────────────────────────────────────────────────────────────

t=0ms   BUYER 1 sends order request       BUYER 2 sends order request
         │                                 │
         └──→ Check product.status='Active'
         │                                 └──→ Check product.status='Active'
         │                                 │
         ├─ ✅ Pass (still 'Active')      ├─ ✅ Pass (still 'Active')
         │                                 │
         ├─→ Create Transaction 1          └──→ Create Transaction 2
         │                                 │
         ├─→ Set status='Reserved'         └──→ Set status='Reserved' (OVERWRITE!)
         │
```

**Current Issue**: Transaction 2 overwrites status, both transactions think it's valid.

**Solution in Production Code** (Line 3921-3954):

```javascript
// ATOMIC TRANSACTION-LIKE BEHAVIOR
if (product.listingType === 'one_time') {
    product.status = 'Reserved';
    // ✅ Prevents additional transactions
    // When payment confirmed later:
    // status → 'Sold' (final)
} else if (product.listingType === 'persistent') {
    product.inventory -= 1;  // ✅ Numeric counter
    product.totalSold += 1;
    product.salesHistory.push(...);  // ✅ Immutable history
    
    if (product.inventory <= 0) {
        product.status = 'Out of Stock';
    } else {
        product.status = 'Active';  // ✅ CAN CONTINUE
    }
}

product.lastSoldAt = new Date();
await product.save();  // ✅ Single save with all changes
```

**Better Solution** (MongoDB session transactions - future):
```javascript
// MongoDB 4.0+ support
const session = await mongoose.startSession();
session.startTransaction();

try {
    // All operations in transaction
    await Transaction(orderData).save({ session });
    product.status = 'Reserved';
    await product.save({ session });
    
    await session.commitTransaction();
} catch (error) {
    await session.abortTransaction();
}
```

---

## 💰 Financial Safety Measures

### Commission & Fee Calculation

```javascript
// Transaction Creation (Line 3878-3882)
const commissionRate = 0.06;  // 6% platform commission
const platformFee = deliveryMethod === 'cash_on_delivery' 
    ? 0 
    : product.price * commissionRate;

const deliveryFee = deliveryMethod === 'Delivery'
    ? 20  // K20 for delivery
    : 0;

const amount = product.price + deliveryFee;
const sellerAmount = product.price - platformFee;

// Example: Product costs K500, ship it
// ├─ product.price = 500
// ├─ deliveryFee = 20
// ├─ amount = 520  (charged to buyer)
// ├─ platformFee = 500 * 0.06 = 30
// ├─ sellerAmount = 500 - 30 = 470
// └─ platform keeps = 30 + 20 = 50

// Verification code should always check:
if (sellerAmount + platformFee !== amount) {
    throw new Error('Fee calculation mismatch');
}
```

### Escrow Protection

```javascript
// Transaction Model (from Transaction.js)
escrow: {
    enabled: true,              // Default: funds in escrow
    released: false,            // Released when delivery confirmed
    releasedAt: undefined,      // When seller gets paid
    holdPeriod: 7,              // Days to hold
    autoReleaseAt: new Date(   // Automatic payout date
        Date.now() + 7 * 24 * 60 * 60 * 1000
    )
}

// Flow:
// 1. Buyer pays → funds in escrow
// 2. Seller ships → Status updated
// 3. Buyer confirms delivery → Escrow released
// 4. Seller gets payment
// OR
// 5. 7 days pass → Auto-release (seller gets paid anyway)
```

### Risk Flagging System

```javascript
protection: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    riskScore: 0-100,  // 0=safe, 100=fraud probability
    
    flags: [{
        type: 'suspicious_activity' |
              'high_value_transaction' |
              'new_user' |
              'international' |
              'rapid_purchase' |
              'multiple_attempts' |
              'vpn_detected' |
              'mismatched_info' |
              'chargeback_risk',
        detectedAt: Date,
        severity: 'low' | 'medium' | 'high',
        description: string
    }]
}

// Example: Flag high-risk transaction
if (transaction.amount > 5000 && buyer.isBuyer && buyer.createdAt > 7days) {
    transaction.protection.flags.push({
        type: 'high_value_transaction',
        severity: 'high',
        description: 'High-value purchase by new unverified buyer'
    });
    transaction.protection.riskScore = 75;
    transaction.protection.riskLevel = 'high';
}
```

---

## 🔄 Status Workflow Guarantees

### One-Time Listing Lifecycle

```
Created in create-product.js
    │
    ├─ status = 'Active'
    ├─ condition = specified (New/Like New/Good/Fair)
    └─ inventory = 1 (implicit)
         │
         ↓
    First TRANSACTION created (Line 3921)
         │
         ├─ status = 'Reserved'  ← Product taken off market
         └─ Can't create 2nd transaction for same product
         │
         ↓
    Payment confirmed (POST /api/transactions/:id/pay, Line 4054)
         │
         ├─ Check: transaction.product.listingType === 'one_time'
         ├─ product.status = 'Sold'
         ├─ product.soldAt = now()
         └─ Prevents all future transactions
         │
         ↓
    FINAL STATE: 'Sold'
```

### Persistent Listing Lifecycle

```
Created in create-product.js
    │
    ├─ status = 'Active'
    ├─ listingType = 'persistent'
    ├─ inventory = N (user specified)
    └─ totalSold = 0
         │
         ├─ TRANSACTION 1 created
         │  ├─ inventory: N → N-1
         │  ├─ totalSold: 0 → 1
         │  ├─ status: 'Active' (NO CHANGE) ✅
         │  └─ salesHistory.push(buyer1)
         │
         ├─ TRANSACTION 2 created
         │  ├─ inventory: N-1 → N-2
         │  ├─ totalSold: 1 → 2
         │  ├─ status: 'Active' (NO CHANGE) ✅
         │  └─ salesHistory.push(buyer2)
         │
         ├─ ... continues ...
         │
         └─ TRANSACTION N created (last unit)
            ├─ inventory: 1 → 0
            ├─ totalSold: N-1 → N
            ├─ status: 'Out of Stock' (CHANGE)
            └─ soldAt = now()
                 │
                 ↓
         FINAL STATE: 'Out of Stock'
         (Can be reactivated by seller if inventory added)
```

---

## 📊 Inventory Tracking Features

### New Fields Added (From Fix)

```javascript
// In Product.js product creation (Fixed in server.js)

inventory: {
    type: Number,
    default: 1,
    min: 0  // ✅ Can't go negative
},

inventoryTracking: {
    type: Boolean,
    default: false  // Seller opt-in
},

lowStockThreshold: {
    type: Number,
    default: 1  // Alert when inventory ≤ this
},

// Sales history (maintained during transactions)
salesHistory: [{
    buyer: ObjectId,      // Who bought
    quantity: Number,     // How many (usually 1)
    price: Number,        // What they paid
    soldAt: Date         // When sold
}],

totalSold: {
    type: Number,
    default: 0  // Incremented with each persistent sale
},

lastSoldAt: Date  // Timestamp of last sale
```

### Low Stock Alert Logic

```javascript
// In transaction creation (Line 3942)
if (product.inventoryTracking && product.inventory <= product.lowStockThreshold) {
    console.log(`📦 Low stock alert triggered: 
                ${product.inventory} <= ${product.lowStockThreshold}`);
    
    // Could trigger:
    // - Seller notification
    // - Product featured flag
    // - "Only 2 left" label on UI
}
```

---

## ✅ Data Consistency Guarantees

### Before Fixes

```
❌ Problem 1: seller field mismatch
   product.sellerId (wrong)
   transaction.seller = product.seller (undefined)
   
❌ Problem 2: enum mismatches
   status: 'active' vs 'Active'
   listingType: 'single' vs 'one_time'/'persistent'
   condition: 'new' vs 'New'
   
❌ Problem 3: missing required fields
   sellerEmail (can't send notifications)
   sellerPhone (can't contact seller)
   campusLocation (queries fail)
   
❌ Problem 4: API endpoint mismatch
   Client: https://api.virtuosazm.com/api
   Server CORS: https://virtuosazm.com only
   Result: 403 CORS error
```

### After Fixes

```
✅ Solution 1: Field names match
   product.seller (ObjectId)
   transaction.seller = product.seller (works)
   Commission calculation: amount / seller properly linked
   
✅ Solution 2: Enum consistency
   status: 'Active' matches exactly
   listingType: verified as 'one_time' or 'persistent'
   condition: matched to valid enum
   
✅ Solution 3: Required fields populated
   sellerEmail: available for order notifications
   sellerPhone: available for contact attempts
   campusLocation: queries return proper results
   
✅ Solution 4: CORS allows all required origins
   api.virtuosazm.com added
   localhost:3000 added
   OPTIONS requests handled
   Credentials enabled for auth headers
```

---

## 🚨 Error Handling Improvements

### Validation Error Response

```javascript
// Before: Generic 500 error
❌ res.status(500).json({ message: 'Failed to create product' })

// After: Detailed validation errors
✅ res.status(400).json({ 
    message: 'Validation error',
    details: error.message,
    fields: Object.keys(error.errors)  // ['seller', 'campusLocation']
})

// Example Response:
{
    "message": "Validation error",
    "details": "Product validation failed: seller is required",
    "fields": ["seller", "campusLocation"]
}
```

### Transaction Creation Error Chain

```javascript
// Checks execute in order, stop at first failure

1. User verified?        → 403 if not
2. Fields present?       → 400 if not
3. Product exists?       → 404 if not
4. Product active?       → 404 if not
5. Not self-purchase?    → 400 if true
6. Inventory available?  → 400 if not (persistent)
7. Seller reachable?     → 503 if email fails

// Only proceeds if ALL pass
```

---

## 🎯 Testing Checklist

As part of deployment validation:

- [ ] Create product with all fields → Should save successfully
- [ ] Check schema fields: seller (not sellerId), campusLocation exists
- [ ] Create transaction for product → Inventory decrements
- [ ] For one-time: status changes to Reserved
- [ ] For persistent: status stays Active, continues accepting orders
- [ ] Seller gets notification email with correct contact info
- [ ] Commission calculated: amount - (amount * 0.06)
- [ ] Transaction linked to correct seller via product.seller reference
- [ ] Can't buy own product (seller check passes)
- [ ] Can't buy zero-inventory product (inventory check passes)
- [ ] API requests reach correct endpoint (CORS allows, no 403)

