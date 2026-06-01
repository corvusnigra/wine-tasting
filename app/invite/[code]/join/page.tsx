import { GuestForm } from "@/components/layout/GuestForm";

type Params = Promise<{ code: string }>;
type Search = Promise<{ s?: string }>;

export default async function InviteJoinPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { code } = await params;
  const { s: sessionId } = await searchParams;
  const returnTo = `/invite/${code}${sessionId ? `?s=${sessionId}` : ""}`;
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <p className="smallcaps text-xs text-gold mb-3">Вас пригласили</p>
      <h1 className="font-display italic text-4xl sm:text-5xl mb-3 text-center leading-[0.95]">
        Дегустация ждёт
      </h1>
      <p className="text-muted italic text-center mb-10 max-w-md leading-relaxed">
        Назовитесь, чтобы присоединиться к вечеру. Друзья увидят вас под этим
        именем.
      </p>
      <GuestForm returnTo={returnTo} />
    </div>
  );
}
