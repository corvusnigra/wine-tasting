export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto px-6 py-12 prose prose-invert">
      <h1 className="font-display text-4xl mb-6">Политика конфиденциальности</h1>
      <p className="text-muted leading-relaxed">
        Мы собираем только то, что нужно для работы дневника: имя, e-mail (если вы
        входите по магической ссылке), ваши собственные дегустационные заметки.
        Данные хранятся в инфраструктуре Supabase (eu-central, Франкфурт) и доступны
        только участникам вашей группы.
      </p>
      <p className="text-muted leading-relaxed mt-4">
        Полная редакция — под 152-ФЗ и GDPR — будет опубликована перед публичным
        запуском.
      </p>
    </article>
  );
}
