# LabSuite: Scientific Calculator & Protocol Suite

A zero-dependency, client-side scientific suite for laboratory calculations, protocol generation, and data analysis. Built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start (Run Locally)

If you are setting this up for the first time on your computer:

### 1. Prerequisites
*   **Node.js**: Download and install [Node.js](https://nodejs.org/) (Version 18 or higher).
*   **Code Editor**: VS Code is recommended.

### 2. Installation
Open your terminal (Command Prompt or Terminal) in the project folder and run:

```bash
# 1. Install project dependencies
npm install

# 2. Start the development server
npm run dev
```

You should see a URL (usually `http://localhost:5173`) in the terminal. Open that link in your browser to see the app.

---

## 🌐 Ultimate GitHub Pages Hosting Guide

This application is designed to be "Static", meaning it does not require a backend server and is perfect for free hosting on GitHub Pages.

Follow these steps precisely to get your app online.

### Phase 1: Prepare Your Project

1.  **Verify Configuration**:
    Open `vite.config.ts` and ensure the `base` property is set to `'./'`.
    ```typescript
    export default defineConfig({
      // ...
      base: './', // This ensures assets load correctly on GitHub Pages
      // ...
    });
    ```

2.  **Install Deployment Tool**:
    Open your terminal in the project folder and run:
    ```bash
    npm install gh-pages --save-dev
    ```

3.  **Update Scripts**:
    Open `package.json`. Locate the `"scripts"` section and add the `predeploy` and `deploy` scripts as shown below:
    
    ```json
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview",
      "predeploy": "npm run build",
      "deploy": "gh-pages -d dist"
    }
    ```

### Phase 2: Create Repository & Push Code

1.  **Create Repository**:
    *   Go to [GitHub.com](https://github.com) and sign in.
    *   Click the **+** icon in the top right -> **New repository**.
    *   Name it (e.g., `lab-suite`).
    *   **Important**: Check "Public" (unless you have a Pro account).
    *   Click **Create repository**.

2.  **Connect & Push**:
    In your project terminal, run these commands (replace `<YOUR-USERNAME>` and `<REPO-NAME>` with your details):

    ```bash
    # Initialize Git (if not already done)
    git init

    # Add all files
    git add .

    # Commit changes
    git commit -m "Initial commit"

    # Link to GitHub (Copy this line from your new GitHub repo page)
    git remote add origin https://github.com/<YOUR-USERNAME>/<REPO-NAME>.git

    # Rename branch to main
    git branch -M main

    # Push code
    git push -u origin main
    ```

### Phase 3: Deploy

Now that your project is configured and on GitHub, run the deploy command:

```bash
npm run deploy
```

**What this does:**
1.  Runs `npm run build` to create a production-ready `dist` folder.
2.  Uploads the contents of `dist` to a special branch on your repository called `gh-pages`.

### Phase 4: Configure GitHub Settings

1.  Go to your repository on GitHub.
2.  Click on **Settings** (top tab).
3.  On the left sidebar, click **Pages**.
4.  Under **Build and deployment** > **Branch**:
    *   Select `gh-pages` from the dropdown.
    *   Ensure the folder is set to `/ (root)`.
    *   Click **Save**.
5.  Wait about 1-2 minutes. Refresh the page. You will see a banner at the top saying:
    > "Your site is live at https://<username>.github.io/<repo-name>/"

Click that link to view your live app!

---

## 🛠 Troubleshooting

**Problem: The page is blank or white when I open the live link.**
*   **Fix**: Check your `vite.config.ts`. Ensure `base: './'` is set. If it was missing, add it, commit, and run `npm run deploy` again.
*   **Fix**: Open the browser console (F12) to see if there are 404 errors for `.js` or `.css` files. This usually means the `base` path is wrong.

**Problem: "Permission denied" when deploying.**
*   **Fix**: Ensure you are logged in to git. Run `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.

**Problem: Routing (like /dilution) gives a 404 when I refresh.**
*   **Fix**: This app uses `HashRouter` (in `App.tsx`), which is specifically designed to prevent this issue on GitHub Pages. Ensure you haven't switched to `BrowserRouter`.

---

## 🎨 Customization

### Adding Your Logo
1.  Rename your logo image to `logo.png`.
2.  Place it in the `public/branding/` folder.
3.  The app will automatically detect it.

### Adding Banner Ads
1.  Go to the `/admin` route (e.g., `your-site.github.io/repo/#/admin`).
2.  Enter the access code: `6188`.
3.  Upload images for the Hero, Middle, or Footer banners.
4.  *Note: These are stored in browser LocalStorage for this static version.*

---

## 🛠 Tech Stack

*   **Framework**: React 18 + TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **Routing**: React Router DOM (HashRouter)
*   **Icons**: Lucide React
