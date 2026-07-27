import { createHashRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ListDetailPage } from '@/pages/ListDetailPage';
import { StudyPage } from '@/pages/StudyPage';
import { SessionReportPage } from '@/pages/SessionReportPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StoriesPage } from '@/pages/StoriesPage';
import { StoryReaderPage } from '@/pages/StoryReaderPage';

/**
 * Hash router so the app works when opened from the filesystem or any static
 * host without server-side route rewrites — important for an offline-first PWA.
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'list/:listId', element: <ListDetailPage /> },
      { path: 'stories', element: <StoriesPage /> },
      { path: 'stories/:storyId', element: <StoryReaderPage /> },
      { path: 'stats', element: <StatisticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  // Full-screen, distraction-free study & report routes (no sidebar).
  { path: '/study/:listId', element: <StudyPage /> },
  { path: '/session/:sessionId/report', element: <SessionReportPage /> },
]);
