import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the playground overview page (server-side)
  redirect('/dashboard/playground/overview');
}
