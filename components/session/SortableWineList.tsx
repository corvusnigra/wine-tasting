"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type WineRef = {
  id: string;
  name: string;
  vintage: number | null;
};

function SortableItem({
  wine,
  index,
  onRemove,
}: {
  wine: WineRef;
  index: number;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wine.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[2rem_2.5rem_1fr_auto] gap-3 items-baseline py-4 border-t border-border first:border-t-0 group bg-background"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted hover:text-gold cursor-grab active:cursor-grabbing touch-none h-full flex items-center justify-center"
        aria-label="Перетащить"
      >
        ⠿
      </button>
      <span className="editorial-num text-2xl text-gold-soft text-right">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <div className="font-display text-xl">{wine.name}</div>
        {wine.vintage && (
          <div className="text-xs text-muted italic mt-0.5">{wine.vintage}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(wine.id)}
        className="w-8 h-8 rounded-full hover:text-rust text-muted text-base"
        aria-label="Убрать"
      >
        ×
      </button>
    </li>
  );
}

export function SortableWineList({
  wines,
  onChange,
  onRemove,
}: {
  wines: WineRef[];
  onChange: (next: WineRef[]) => void;
  onRemove: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = wines.findIndex((w) => w.id === active.id);
    const newIdx = wines.findIndex((w) => w.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onChange(arrayMove(wines, oldIdx, newIdx));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={wines.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col mb-6">
          {wines.map((w, idx) => (
            <SortableItem key={w.id} wine={w} index={idx} onRemove={onRemove} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
