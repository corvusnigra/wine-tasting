import { GuestForm } from "@/components/layout/GuestForm";

type Params = Promise<{ code: string }>;

export default async function InviteJoinPage({ params }: { params: Params }) {
  const { code } = await params;
  const returnTo = `/invite/${code}`;
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <h1 className="font-display text-4xl mb-3 text-center">Вас пригласили на вечер</h1>
      <p className="text-muted text-center mb-10 max-w-md">
        Представьтесь, чтобы присоединиться. Если хотите сохранить заметки — после
        вечера привяжите email на странице профиля.
      </p>
      <GuestForm returnTo={returnTo} />
    </div>
  );
}
