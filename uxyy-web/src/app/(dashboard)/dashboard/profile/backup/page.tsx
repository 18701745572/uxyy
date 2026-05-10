import { Suspense } from 'react';
import BackupPanel from './backup-panel';

export default function BackupPage() {
  return (
    <Suspense fallback={null}>
      <BackupPanel />
    </Suspense>
  );
}