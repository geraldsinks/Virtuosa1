# Clean URL Deployment Guide for Virtuosa

## Setup Instructions

### 1. Vercel Configuration
The `vercel.json` file handles server-side rewrites to map clean URLs to actual HTML files.

### 2. Domain Configuration
Ensure your custom domain `virtuosazm.com` is properly configured in Vercel:

1. Go to Vercel dashboard → Project Settings → Domains
2. Add `virtuosazm.com` and `www.virtuosazm.com`
3. Configure DNS records as provided by Vercel

### 3. Clean URL Examples
Before → After:
- `/pages/login.html` → `/login`
- `/pages/products.html` → `/products`
- `/pages/product-detail.html?id=123` → `/product/123`
- `/pages/seller-shop.html?shop=storename` → `/seller/storename`

### 4. Backend API Configuration
Your backend at `api.virtuosazm.com` remains unchanged. Frontend will continue to use:
```
const API_BASE = "https://api.virtuosazm.com/api";
```

### 5. Testing Clean URLs
After deployment, test these URLs:
- https://virtuosazm.com/login
- https://virtuosazm.com/products
- https://virtuosazm.com/cart
- https://virtuosazm.com/dashboard

### 6. SEO Benefits
Clean URLs provide:
- Better user experience
- Improved SEO rankings
- Easier sharing and bookmarking
- Professional appearance

### 7. Migration Steps
1. Deploy with `vercel.json`
2. Test all clean URLs work correctly
3. Update any hardcoded `.html` links in marketing materials
4. Monitor 404 errors in Vercel analytics

## Troubleshooting

### Common Issues:
1. **404 errors**: Check `vercel.json` syntax and rewrite rules
2. **Broken redirects**: Ensure all paths are correctly mapped
3. **API issues**: Verify CORS settings allow `virtuosazm.com`

### Debug Commands:
```bash
# Test locally with Vercel CLI
vercel dev

# Check deployment logs
vercel logs
```
