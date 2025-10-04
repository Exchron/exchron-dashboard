import DashboardLayout from '@/components/dashboard/dashboardlayout';
import ClassroomTestExportTab from '@/components/dashboard/classroom/testexport';

export default function ClassroomTestExportPage() {
  return (
    <DashboardLayout activeTab="test-export" mode="classroom">
      <ClassroomTestExportTab />
    </DashboardLayout>
  );
}