import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { ThemeProvider } from '@/hooks/useTheme';
import { SettingsProvider } from '@/hooks/useSettings';
import { ToastProvider } from '@/components/ui/Toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
);
