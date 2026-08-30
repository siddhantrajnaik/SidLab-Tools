/// <reference types="vite/client" />

// No VITE_* secrets are declared on purpose. Vite inlines those into the public bundle at
// build time, so a shared API key placed here would be readable by anyone loading the
// site. The AI Illustrator asks each visitor for their own key instead, kept in their own
// browser. See pages/AiIllustrator.tsx.
