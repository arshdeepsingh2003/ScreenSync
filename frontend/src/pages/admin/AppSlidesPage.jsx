import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAppSlides from '../../hooks/useAppSlides';
import useApps from '../../hooks/useApps';
import useSocket from '../../hooks/useSocket';
import contentService from '../../services/contentService';
import SlideList from '../../components/admin/SlideList';
import SlideForm from '../../components/admin/SlideForm';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

export default function AppSlidesPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { slides, setSlides, loading, error, refetch } = useAppSlides(appId);
  const { apps } = useApps();
  const socket = useSocket();

  const app = apps.find((a) => String(a.id) === String(appId));

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirm state
  const [deleteSlide, setDeleteSlide] = useState(null);

  // Listen for socket events to refresh
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data?.app_id === parseInt(appId, 10) || data?.app_id === appId) {
        refetch();
      }
    };
    socket.on('content:updated', handler);
    return () => socket.off('content:updated', handler);
  }, [socket, appId, refetch]);

  const openCreate = () => {
    setEditingSlide(null);
    setFormOpen(true);
  };

  const openEdit = (slide) => {
    setEditingSlide(slide);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingSlide(null);
  };

  const handleSubmit = async (data) => {
    setFormLoading(true);
    try {
      if (editingSlide) {
        await contentService.updateSlide(editingSlide.id, data);
        toast.success(`"${data.title}" updated`);
      } else {
        await contentService.createSlide(appId, data);
        toast.success(`"${data.title}" added`);
      }
      closeForm();
      refetch();
    } catch (err) {
      console.error('Slide save failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to save slide');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSlide) return;
    await contentService.deleteSlide(deleteSlide.id);
    toast.success(`"${deleteSlide.title}" deleted`);
    setDeleteSlide(null);
    refetch();
  };

  const handleReorder = async (newOrderedIds, reorderedSlides) => {
    // Optimistic update
    setSlides(reorderedSlides);
    try {
      await contentService.reorderSlides(appId, newOrderedIds);
      toast.success('Slide order updated');
    } catch (err) {
      console.error('Reorder failed:', err);
      toast.error('Failed to reorder slides');
      refetch(); // Revert on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header with Back nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/apps')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Back to Apps"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 className="text-2xl font-bold text-white">
              {app ? app.name : `App #${appId}`} — Slides
            </h3>
            <p className="text-slate-400 text-sm mt-0.5">
              {slides.length} slide{slides.length !== 1 ? 's' : ''} • Drag to reorder
            </p>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={openCreate} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }>
          Add Slide
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Slides List */}
      <SlideList
        slides={slides}
        onReorder={handleReorder}
        onEdit={openEdit}
        onDelete={setDeleteSlide}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingSlide ? `Edit "${editingSlide.title}"` : 'Add New Slide'}
        maxWidth="max-w-xl"
      >
        <SlideForm slide={editingSlide} onSubmit={handleSubmit} loading={formLoading} />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteSlide}
        onClose={() => setDeleteSlide(null)}
        onConfirm={handleDelete}
        title="Delete Slide"
        message={`Are you sure you want to delete "${deleteSlide?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Slide"
      />
    </div>
  );
}
