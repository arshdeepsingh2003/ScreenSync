import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Button from '../common/Button';

const TYPE_BADGES = {
  image: { label: 'Image', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  video: { label: 'Video', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  text: { label: 'Text', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  pdf: { label: 'PDF', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  html: { label: 'HTML', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
};

/**
 * SlideList Component
 * Drag-and-drop reorderable list of slides using @hello-pangea/dnd.
 * 
 * @param {Array} slides - Ordered list of slide objects
 * @param {function} onReorder - Callback with new ordered slide IDs
 * @param {function} onEdit - Callback to edit a slide
 * @param {function} onDelete - Callback to delete a slide
 */
export function SlideList({ slides, onReorder, onEdit, onDelete }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const reordered = Array.from(slides);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    const newOrderedIds = reordered.map((s) => s.id);
    onReorder(newOrderedIds, reordered);
  };

  if (!slides.length) {
    return (
      <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center">
        <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-slate-500 text-sm">No slides yet. Add your first slide to this app.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="slide-list">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 transition-colors rounded-xl ${
              snapshot.isDraggingOver ? 'bg-indigo-500/5' : ''
            }`}
          >
            {slides.map((slide, index) => {
              const badge = TYPE_BADGES[slide.type] || TYPE_BADGES.text;

              return (
                <Draggable key={slide.id} draggableId={String(slide.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center space-x-4 px-4 py-3 rounded-xl border transition-all ${
                        snapshot.isDragging
                          ? 'bg-slate-800 border-indigo-500/40 shadow-xl shadow-black/30 scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                        </svg>
                      </div>

                      {/* Order Number */}
                      <span className="shrink-0 w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {index + 1}
                      </span>

                      {/* Thumbnail */}
                      {slide.type === 'image' && slide.file_url ? (
                        <img
                          src={slide.file_url}
                          alt={slide.title}
                          className="shrink-0 h-10 w-14 object-cover rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="shrink-0 h-10 w-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                          {slide.type === 'video' ? '🎬' : slide.type === 'pdf' ? '📄' : slide.type === 'html' ? '🌐' : '📝'}
                        </div>
                      )}

                      {/* Title + Meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {slide.title || 'Untitled Slide'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${badge.color}`}>
                            {badge.label}
                          </span>
                          {slide.duration && (
                            <span className="text-xs text-slate-500">{slide.duration}s</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(slide)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(slide)}
                          className="!text-red-400 hover:!text-red-300 hover:!bg-red-950/30"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default SlideList;
