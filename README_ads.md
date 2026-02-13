# Advertisement Management Guide

## 1. Using the Admin Panel
The application now includes a built-in Admin Panel for managing the homepage banner without modifying code.

1. Navigate to the **Admin** link in the website footer (or go to `/#/admin`).
2. **Upload:** Click the placeholder box to select a PNG/JPG image from your computer (Max 2MB).
3. **Save:** Click "Set Active" to apply the banner. This saves the image data to your browser's local storage.
4. **Preview:** The image will immediately appear on the Dashboard homepage.
5. **Remove:** Click "Remove" to revert to the default placeholder.

*Note: Since this is currently a static, client-side app, the banner settings are stored in your browser's LocalStorage. If you clear your cache or open the site on a different device, the banner will not persist unless configured on that specific device.*

---

## 2. Backend Integration & Production Strategy

To make the banner permanent for **all** visitors (not just the admin's browser), you must connect the Admin Panel to a backend service.

### Recommended Architecture

1.  **Storage Service:** Do not store base64 strings in a database. Use an object storage service like **AWS S3**, **Google Cloud Storage**, or **Cloudinary**.
2.  **API Endpoint:** Create a simple REST API (e.g., using Node/Express, Python/Flask, or Next.js API routes).
    *   `POST /api/banner`: Accepts a file upload, saves it to Storage, and saves the public URL to a database.
    *   `GET /api/banner`: Returns the public URL of the active banner.

### Implementation Steps

#### A. Update `pages/Admin.tsx`
Replace the `localStorage` logic with an API call.

```typescript
// Replace handleSave with:
const handleSave = async () => {
  const formData = new FormData();
  formData.append('banner', fileObject);
  
  await fetch('/api/admin/banner', {
    method: 'POST',
    body: formData
  });
};
```

#### B. Update `components/AdBanner.tsx`
Replace `localStorage.getItem` with a fetch call on mount.

```typescript
useEffect(() => {
  fetch('/api/banner')
    .then(res => res.json())
    .then(data => setAdImage(data.url));
}, []);
```

#### C. Secure the Admin Panel
Currently, the `/admin` route is public. To secure it:
1.  Implement an authentication provider (e.g., Auth0, Firebase Auth, or NextAuth).
2.  Wrap the `Admin` component in a Protected Route.
3.  Ensure your API endpoints verify the user's session/token before allowing updates.

### Interim "Static" Solution
If you do not have a backend server, you can still make the banner permanent by:
1.  Renaming your image to `banner.jpg`.
2.  Placing it in the `public/ads/` folder.
3.  Hardcoding the path in `AdBanner.tsx`:
    ```typescript
    const [adImage] = useState('/ads/banner.jpg');
    ```
