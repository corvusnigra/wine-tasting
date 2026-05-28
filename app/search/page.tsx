import { SearchClient } from "@/components/search/SearchClient";

export default function SearchPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 w-full">
      <h1 className="font-display text-4xl mb-6">Поиск</h1>
      <SearchClient />
    </div>
  );
}
