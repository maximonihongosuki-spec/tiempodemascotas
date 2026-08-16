'use client';
import React from 'react';
import AdminPanel from '../../src/pages/AdminPanel';
import MetadataUpdater from '../../src/components/MetadataUpdater';

export default function Page() {
  return (
    <>
      <MetadataUpdater />
      <AdminPanel />
    </>
  );
}