import { JoinByInvitationForm } from "@/components/auth/join-by-invitation-form";

export default function JoinPage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <JoinByInvitationForm invitationToken={searchParams.t} />
    </main>
  );
}
