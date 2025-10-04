import DashboardLayout from '@/components/dashboard/dashboardlayout';
import ResultsTab from '@/components/dashboard/playground/results';

export default function PlaygroundResultsPage() {
  return (
    <DashboardLayout activeTab="results" mode="playground">
      <ResultsTab />
    </DashboardLayout>
  );
}