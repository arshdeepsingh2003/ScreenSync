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
  const { socket } = useSocket();

  const app = apps.find((a) => String(a.id) === String(appId));

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirm state
  const [deleteSlide, setDeleteSlide] = useState(null);

  // PDF import state
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported. Please save your presentation as PDF and upload.');
      return;
    }
    
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const updatedSlides = await contentService.importPdf(appId, formData);
      setSlides(updatedSlides);
      toast.success(`Successfully imported ${updatedSlides.length - slides.length} slides from PDF`);
      setImportOpen(false);
    } catch (err) {
      console.error('Failed to import PDF:', err);
      toast.error(err.response?.data?.detail || 'Failed to import slides from PDF');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

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
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="md" onClick={() => setImportOpen(true)} icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }>
            Import PDF / Slides
          </Button>
          <Button variant="primary" size="md" onClick={openCreate} icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }>
            Add Slide
          </Button>
        </div>
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

      {/* Import PDF Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => !importLoading && setImportOpen(false)}
        title="Import Slides from PDF"
      >
        <div className="space-y-4 p-2 font-sans text-left">
          <p className="text-sm text-slate-400">
            Select a PDF document (or a presentation exported as PDF). 
            The system will automatically count the pages and add each page as a slide to this playlist app.
          </p>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/10 hover:border-slate-700 transition-colors">
            <svg className="w-12 h-12 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <input
              type="file"
              accept=".pdf"
              id="pdf-upload-file"
              className="hidden"
              onChange={handlePdfUpload}
              disabled={importLoading}
            />
            <label
              htmlFor="pdf-upload-file"
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-lg ${importLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {importLoading ? 'Importing Slides...' : 'Choose PDF File'}
            </label>
            {importLoading && (
              <div className="mt-4 flex items-center space-x-2 text-slate-400 text-xs">
                <Spinner size="sm" />
                <span>Uploading and extracting pages...</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
