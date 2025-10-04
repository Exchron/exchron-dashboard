import DashboardLayout from '@/components/dashboard/dashboardlayout';
import ClassroomModelSelectionTab from '@/components/dashboard/classroom/modelselection';

export default function ClassroomModelSelectionPage() {
  return (
    <DashboardLayout activeTab="model-selection" mode="classroom">
      <ClassroomModelSelectionTab />
    </DashboardLayout>
  );
}