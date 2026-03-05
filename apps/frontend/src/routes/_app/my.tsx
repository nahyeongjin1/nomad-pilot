import { createFileRoute } from '@tanstack/react-router';
import { User } from 'lucide-react';

export const Route = createFileRoute('/_app/my')({
  component: MyPage,
});

function MyPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <User className="size-12 text-brand-600" />
      <h1 className="text-xl font-bold">마이</h1>
      <p className="text-sm text-muted-foreground">프로필 및 설정</p>
    </div>
  );
}
