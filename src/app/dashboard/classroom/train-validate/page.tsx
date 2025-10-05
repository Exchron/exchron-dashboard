import DashboardLayout from '@/components/dashboard/dashboardlayout';
import ClassroomTrainValidateTab from '@/components/dashboard/classroom/trainvalidate';

export default function ClassroomTrainValidatePage() {
	return (
		<DashboardLayout activeTab="train-validate" mode="classroom">
			<ClassroomTrainValidateTab />
		</DashboardLayout>
	);
}
