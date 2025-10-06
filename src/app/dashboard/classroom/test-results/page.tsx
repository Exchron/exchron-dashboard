'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClassroomStore } from '@/lib/ml/state/classroomStore';

// This is a redirect component to maintain backwards compatibility
// It redirects old test-results path to the new test-export path
export default function ClassroomTestResultsRedirect() {
	const [state] = useClassroomStore();
	const router = useRouter();

	useEffect(() => {
		// Redirect to the new path
		router.replace('/dashboard/classroom/test-export');
	}, [router]);

	return null;
}
