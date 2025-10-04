import DashboardLayout from '@/components/dashboard/dashboardlayout';
import OverviewTab from '@/components/dashboard/playground/overview';

export default function PlaygroundOverviewPage() {
  return (
    <DashboardLayout activeTab="overview" mode="playground">
      <OverviewTab />
    </DashboardLayout>
  );
}