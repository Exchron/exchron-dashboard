import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to playground overview
  redirect('/dashboard/playground/overview');
}