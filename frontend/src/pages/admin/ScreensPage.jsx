import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import useScreens from '../../hooks/useScreens';
import useSocket from '../../hooks/useSocket';
import screenService from '../../services/screenService';
import ScreenTable from '../../components/admin/ScreenTable';
import ScreenForm from '../../components/admin/ScreenForm';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

export default function ScreensPage() {
  const { screens, loading, error, refetch } = useScreens();
  const { socket } = useSocket();

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirm state
  const [deleteScreen, setDeleteScreen] = useState(null);

  // Listen for socket events to refresh
  useEffect(() => {
    if (!socket) return;
    const handler = () => refetch();
    socket.on('screen:updated', handler);
    return () => socket.off('screen:updated', handler);
  }, [socket, refetch]);

  const openCreate = () => {
    setEditingScreen(null);
    setFormOpen(true);
  };

  const openEdit = (screen) => {
    setEditingScreen(screen);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingScreen(null);
  };

  const handleSubmit = async (data) => {
    setFormLoading(true);
    try {
      if (editingScreen) {
        await screenService.updateScreen(editingScreen.id, data);
        toast.success(`"${data.screen_name}" updated`);
      } else {
        await screenService.createScreen(data);
        toast.success(`"${data.screen_name}" added`);
      }
      closeForm();
      refetch();
    } catch (err) {
      console.error('Screen save failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to save screen');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (screen) => {
    try {
      await screenService.updateScreen(screen.id, {
        ...screen,
        is_active: !screen.is_active,
      });
      toast.success(
        `"${screen.screen_name}" ${screen.is_active ? 'deactivated' : 'activated'}`
      );
      refetch();
    } catch (err) {
      console.error('Toggle failed:', err);
      toast.error('Failed to update screen status');
    }
  };

  const handleDelete = async () => {
    if (!deleteScreen) return;
    try {
      await screenService.deleteScreen(deleteScreen.id);
      toast.success(`"${deleteScreen.screen_name}" removed`);
      setDeleteScreen(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete screen:', err);
      toast.error(err.response?.data?.detail || 'Failed to remove screen');
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Screens Management</h3>
          <p className="text-slate-400 text-sm mt-1">
            Register and manage TV displays. {screens.length} screen{screens.length !== 1 ? 's' : ''} configured.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }>
          Add Screen
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Screens Table */}
      <ScreenTable
        screens={screens}
        onToggleActive={handleToggleActive}
        onEdit={openEdit}
        onDelete={setDeleteScreen}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingScreen ? `Edit "${editingScreen.screen_name}"` : 'Add New Screen'}
      >
        <ScreenForm screen={editingScreen} onSubmit={handleSubmit} loading={formLoading} />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteScreen}
        onClose={() => setDeleteScreen(null)}
        onConfirm={handleDelete}
        title="Remove Screen"
        message={`Are you sure you want to remove "${deleteScreen?.screen_name}" (Screen #${deleteScreen?.screen_number})? Any open TV tab for this screen will lose its assignment.`}
        confirmLabel="Remove Screen"
      />
    </div>
  );
}
