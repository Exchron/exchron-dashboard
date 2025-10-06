'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/dashboardlayout';
import ClassroomTestExportTab from '@/components/dashboard/classroom/testexport';
import { useClassroomStore } from '@/lib/ml/state/classroomStore';

export default function ClassroomTestExportPage() {
	const [state] = useClassroomStore();
	const router = useRouter();

	// Don't redirect if no test results - let the component handle the empty state
	// useEffect(() => {
	// 	if (!state.testExport.testMetrics) {
	// 		router.replace('/dashboard/classroom/train-validate');
	// 	}
	// }, [state.testExport.testMetrics, router]);

	return (
		<DashboardLayout activeTab="test-export" mode="classroom">
			<ClassroomTestExportTab />
		</DashboardLayout>
	);
}
