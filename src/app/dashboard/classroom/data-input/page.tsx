'use client';
import DashboardLayout from '@/components/dashboard/dashboardlayout';
import ClassroomDataInputTab from '@/components/dashboard/classroom/datainput';

export default function ClassroomDataInputPage() {
	return (
		<DashboardLayout activeTab="data-input" mode="classroom">
			<ClassroomDataInputTab />
		</DashboardLayout>
	);
}
