import DashboardLayout from '@/components/dashboard/dashboardlayout';
// Note: When using next.js with TypeScript, @/ is an alias for the src/ directory
import ClassroomDataInputTab from '@/components/dashboard/classroom/datainput';

export default function ClassroomDataInputPage() {
  return (
    <DashboardLayout activeTab="data-input" mode="classroom">
      <ClassroomDataInputTab />
    </DashboardLayout>
  );
}