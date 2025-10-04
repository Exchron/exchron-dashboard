import DashboardLayout from '@/components/dashboard/dashboardlayout';
import EnhanceTab from '@/components/dashboard/playground/enhance';

export default function PlaygroundEnhancePage() {
  return (
    <DashboardLayout activeTab="enhance" mode="playground">
      <EnhanceTab />
    </DashboardLayout>
  );
}