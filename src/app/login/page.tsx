
import { AuthForm } from '@/components/auth/AuthForm';
import { Suspense } from 'react'; // Keep Suspense

export default function MockAuthenticationPage() {
  return (
    <Suspense fallback={<div>Loading login form...</div>}>
        <AuthForm />
    </Suspense>
  );
}
