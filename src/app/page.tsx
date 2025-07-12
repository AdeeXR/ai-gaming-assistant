// src/app/page.tsx
// This is your application's root page.
// It will render the LoginForm component.

import LoginForm from '@/components/LoginForm'; // Import your LoginForm component

// This is a Server Component by default.
// It renders the LoginForm, which is a Client Component.
export default function HomePage() {
  return (
    <main>
      {/* Render your LoginForm component here */}
      <LoginForm />
    </main>
  );
}
