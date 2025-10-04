import DashboardLayout from '@/components/dashboard/dashboardlayout';
import DataInputTab from '@/components/dashboard/playground/datainput';

export default function PlaygroundDataInputPage() {
  return (
    <DashboardLayout activeTab="data-input" mode="playground">
      <DataInputTab />
    </DashboardLayout>
  );
}