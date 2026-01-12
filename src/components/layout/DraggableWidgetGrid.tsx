import { useEffect, ReactNode, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { IoMove, IoCheckmark, IoGrid } from 'react-icons/io5';
import { useLayoutStore, WIDGET_INFO } from '../../store/useLayoutStore';
import { useLanguage } from '../../i18n';

interface SortableWidgetProps {
  id: string;
  children: ReactNode;
  isEditMode: boolean;
}

function SortableWidget({ id, children, isEditMode }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`masonry-item relative ${
        isDragging ? 'z-50' : 'z-0'
      }`}
    >
      {/* Edit mode overlay */}
      {isEditMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 z-20 rounded-md cursor-grab active:cursor-grabbing
            border-2 border-dashed transition-colors duration-200
            ${isDragging
              ? 'border-accent-cyan bg-accent-cyan/5'
              : 'border-accent-cyan/40 hover:border-accent-cyan/70 bg-transparent hover:bg-accent-cyan/5'
            }`}
          {...attributes}
          {...listeners}
        >
          {/* Drag handle indicator */}
          <div className={`absolute top-2 left-1/2 -translate-x-1/2
            flex items-center gap-1.5 px-3 py-1.5 rounded-full
            ${isDragging
              ? 'bg-accent-cyan text-terminal-bg'
              : 'bg-terminal-bg/90 text-accent-cyan border border-accent-cyan/40'
            } transition-colors duration-200`}
          >
            <IoMove className="text-sm" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {isDragging ? 'Drop here' : 'Drag'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Widget content - dimmed during drag */}
      <div className={`transition-opacity duration-200 ${
        isDragging ? 'opacity-30' : 'opacity-100'
      }`}>
        {children}
      </div>
    </div>
  );
}

interface DraggableWidgetGridProps {
  widgets: Record<string, ReactNode>;
}

export function DraggableWidgetGrid({ widgets }: DraggableWidgetGridProps) {
  const { language, t } = useLanguage();
  const {
    widgetOrder,
    isEditMode,
    loadLayout,
    isInitialized,
    swapWidgets,
    setDragging,
    toggleEditMode,
    resetToDefault,
  } = useLayoutStore();

  // Load saved layout on mount
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setDragging(true, active.id as string);
  }, [setDragging]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDragging(false);

    if (over && active.id !== over.id) {
      swapWidgets(active.id as string, over.id as string);
    }
  }, [swapWidgets, setDragging]);

  const handleDragCancel = useCallback(() => {
    setDragging(false);
  }, [setDragging]);

  // Show loading state until layout is initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Edit Mode Controls */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {isEditMode && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={resetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-neutral-400
              hover:text-neutral-200 bg-terminal-card hover:bg-terminal-card-hover
              border border-terminal-border rounded-md transition-colors"
          >
            {t('resetLayout')}
          </motion.button>
        )}

        <button
          onClick={toggleEditMode}
          className={`flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-md
            border transition-all duration-200 ${
            isEditMode
              ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40 hover:bg-accent-cyan/30'
              : 'bg-terminal-card text-neutral-400 border-terminal-border hover:text-neutral-200 hover:border-neutral-600'
          }`}
        >
          {isEditMode ? (
            <>
              <IoCheckmark className="text-sm" />
              <span>{t('done')}</span>
            </>
          ) : (
            <>
              <IoGrid className="text-sm" />
              <span>{t('editLayout')}</span>
            </>
          )}
        </button>
      </div>

      {/* Edit mode hint */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-md bg-accent-cyan/10 border border-accent-cyan/20"
          >
            <p className="text-[11px] text-accent-cyan text-center">
              {t('editModeHint')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <motion.div
            className="masonry-grid"
            layout
          >
            {widgetOrder.map((widgetId) => {
              const widget = widgets[widgetId];
              if (!widget) return null;

              return (
                <SortableWidget
                  key={widgetId}
                  id={widgetId}
                  isEditMode={isEditMode}
                >
                  {widget}
                </SortableWidget>
              );
            })}
          </motion.div>
        </SortableContext>

        {/* Simple drag overlay - just shows a placeholder */}
        <DragOverlay>
          {useLayoutStore.getState().draggedWidget ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-md bg-accent-cyan/20 border-2 border-accent-cyan
                shadow-lg shadow-accent-cyan/20 p-4 min-h-[100px] min-w-[200px]
                flex items-center justify-center"
            >
              <div className="text-center">
                <IoMove className="text-2xl text-accent-cyan mx-auto mb-2" />
                <p className="text-sm text-accent-cyan font-medium">
                  {language === 'tr'
                    ? WIDGET_INFO[useLayoutStore.getState().draggedWidget!]?.titleTr
                    : WIDGET_INFO[useLayoutStore.getState().draggedWidget!]?.title}
                </p>
              </div>
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
