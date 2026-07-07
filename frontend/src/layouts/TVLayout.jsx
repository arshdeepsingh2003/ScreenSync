import React from 'react';
import { Outlet } from 'react-router-dom';

export default function TVLayout() {
  return (
    <div className="w-full h-full min-h-screen bg-black text-white overflow-hidden select-none cursor-none relative">
      <Outlet />
    </div>
  );
}
