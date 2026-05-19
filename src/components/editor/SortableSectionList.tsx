'use client'

import { useMemo, ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Section } from '@/lib/resume-data'

interface SortableSectionListProps {
  sections: Section[]
  onReorder: (sections: Section[]) => void
  children: (section: Section) => ReactNode
}

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="drag-handle"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="2" cy="6" r="1.5" />
            <circle cx="2" cy="10" r="1.5" />
            <circle cx="10" cy="2" r="1.5" />
            <circle cx="10" cy="6" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
          </svg>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

export function SortableSectionList({ sections, onReorder, children }: SortableSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const items = useMemo(() => sections.map((s) => s.id), [sections])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id)
      const newIndex = sections.findIndex((s) => s.id === over.id)
      onReorder(arrayMove(sections, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {sections
          .sort((a, b) => a.order - b.order)
          .map((section) => (
            <SortableItem key={section.id} id={section.id}>
              {children(section)}
            </SortableItem>
          ))}
      </SortableContext>
    </DndContext>
  )
}
