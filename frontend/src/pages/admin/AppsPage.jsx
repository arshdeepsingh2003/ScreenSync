import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useApps from '../../hooks/useApps';
import useSession from '../../hooks/useSession';
import useSocket from '../../hooks/useSocket';
import appService from '../../services/appService';
import AppTable from '../../components/admin/AppTable';
import AppForm from '../../components/admin/AppForm';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { useEffect } from 'react';

export default function AppsPage() {
  const { apps, loading, error, refetch } = useApps();
  const { activeAppId } = useSession();
  const socket = useSocket();

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirm state
  const [deleteApp, setDeleteApp] = useState(null);

  // Listen for socket events to refresh list
  useEffect(() => {
    if (!socket) return;
    const handler = () => refetch();
    socket.on('app:activated', handler);
    socket.on('content:updated', handler);
    return () => {
      socket.off('app:activated', handler);
      socket.off('content:updated', handler);
    };
  }, [socket, refetch]);

  const openCreate = () => {
    setEditingApp(null);
    setFormOpen(true);
  };

  const openEdit = (app) => {
    setEditingApp(app);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingApp(null);
  };

  const handleSubmit = async (data) => {
    setFormLoading(true);
    try {
      if (editingApp) {
        await appService.updateApp(editingApp.id, data);
        toast.success(`"${data.name}" updated successfully`);
      } else {
        await appService.createApp(data);
        toast.success(`"${data.name}" created successfully`);
      }
      closeForm();
      refetch();
    } catch (err) {
      console.error('App save failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to save app');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteApp) return;
    await appService.deleteApp(deleteApp.id);
    toast.success(`"${deleteApp.name}" deleted`);
    setDeleteApp(null);
    refetch();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Apps Management</h3>
          <p className="text-slate-400 text-sm mt-1">
            Create and manage slideshow apps. Each app contains a collection of slides.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }>
          Create App
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Apps Grid */}
      <AppTable
        apps={apps}
        activeAppId={activeAppId}
        onEdit={openEdit}
        onDelete={setDeleteApp}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingApp ? `Edit "${editingApp.name}"` : 'Create New App'}
      >
        <AppForm app={editingApp} onSubmit={handleSubmit} loading={formLoading} />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteApp}
        onClose={() => setDeleteApp(null)}
        onConfirm={handleDelete}
        title="Delete App"
        message={`Are you sure you want to delete "${deleteApp?.name}"? All slides within this app will also be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete App"
      />
    </div>
  );
}
