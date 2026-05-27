import { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { ToastProvider, useToast } from '../components/ui/Toast';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Tabs from '../components/ui/Tabs';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';
import ApprovalCard from '../components/ui/ApprovalCard';
import BranchSelector from '../components/ui/BranchSelector';

function Section({ title, children }) {
  return (
    <section className="mb-12">
      <h2 className="font-heading text-3xl text-white uppercase mb-6 border-b-2 border-or-gold pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DemoContent() {
  const showToast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectVal, setSelectVal] = useState('');
  const [branchId, setBranchId] = useState(null);

  const sampleBranches = [
    { _id: '1', name: 'Sandton', branchCode: 'SND' },
    { _id: '2', name: 'Rosebank', branchCode: 'RSB' },
    { _id: '3', name: 'Menlyn', branchCode: 'MLN' },
  ];

  const sampleMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 7a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zm-10 2a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3z" /></svg> },
    { key: 'inventory', label: 'Inventory', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { key: 'pos', label: 'POS', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
    { key: 'orders', label: 'Orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
    { key: 'staff', label: 'Staff', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];

  const sampleTableData = [
    { _id: '1', name: 'OG Kush Pre-Roll', sku: 'PRE-001', category: 'Pre-Rolls', price: 85, stock: 42 },
    { _id: '2', name: 'CBD Oil 1000mg', sku: 'CBD-010', category: 'Oils', price: 450, stock: 8 },
    { _id: '3', name: 'Ceramic Grinder', sku: 'ACC-003', category: 'Accessories', price: 220, stock: 0 },
    { _id: '4', name: 'Edible Gummies 10pk', sku: 'EDI-005', category: 'Edibles', price: 150, stock: 23 },
    { _id: '5', name: 'Glass Water Pipe', sku: 'ACC-012', category: 'Accessories', price: 680, stock: 3 },
  ];

  const tableColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Category', accessor: 'category' },
    { header: 'Price', accessor: 'price', render: (row) => `R${row.price.toFixed(2)}` },
    {
      header: 'Stock',
      accessor: 'stock',
      render: (row) => {
        const status = row.stock <= 0 ? 'rejected' : row.stock <= 10 ? 'pending' : 'active';
        const label = row.stock <= 0 ? 'Out of Stock' : row.stock <= 10 ? 'Low Stock' : 'In Stock';
        return <Badge status={status}>{label}</Badge>;
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* Page header */}
      <Header
        title="Component Library"
        user={{ firstName: 'Demo', lastName: 'User', role: 'admin' }}
        onMenuClick={() => setSidebarOpen(true)}
        branchSelector={<BranchSelector branches={sampleBranches} currentBranch={branchId} onChange={setBranchId} />}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={sampleMenuItems}
        activeItem="inventory"
        onNavigate={() => {}}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-5xl text-or-gold uppercase">Origin Components</h1>
          <p className="font-accent text-xl text-or-gold italic mt-1">P16 Shared Component Library</p>
        </div>

        {/* BUTTONS */}
        <Section title="Button">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary / Gold</Button>
            <Button variant="secondary">Secondary / Green</Button>
            <Button variant="danger">Danger / Red</Button>
            <Button variant="ghost">Ghost / Outline</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="sm" variant="primary">Small</Button>
            <Button size="md" variant="primary">Medium</Button>
            <Button size="lg" variant="primary">Large</Button>
            <Button disabled variant="primary">Disabled</Button>
          </div>
        </Section>

        {/* BADGES */}
        <Section title="Badge">
          <div className="flex flex-wrap gap-3">
            {['active', 'pending', 'approved', 'rejected', 'processing', 'completed', 'paid', 'redeemed'].map(
              (s) => (
                <Badge key={s} status={s}>
                  {s}
                </Badge>
              )
            )}
          </div>
        </Section>

        {/* CARDS */}
        <Section title="Card">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card header="Standard Card" hoverable>
              <p className="text-sm text-gray-600">Card with header, body, and hover lift effect. Matches vanilla or-brand.css card styles.</p>
            </Card>
            <Card
              header="Card with Footer"
              footer={<Button size="sm" variant="primary">Action</Button>}
            >
              <p className="text-sm text-gray-600">This card includes a footer section with an action button.</p>
            </Card>
          </div>
        </Section>

        {/* STAT CARDS */}
        <Section title="StatCard">
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard label="Total Revenue" value="R124,850" trend={12.5} trendLabel="vs last month" />
            <StatCard label="Orders Today" value="47" trend={-3.2} trendLabel="vs yesterday" />
            <StatCard label="Active Staff" value="8" />
          </div>
        </Section>

        {/* INPUT */}
        <Section title="Input">
          <div className="max-w-md space-y-2">
            <Input label="Product Name" placeholder="Enter product name..." />
            <Input label="Price (R)" type="number" placeholder="0.00" />
            <Input label="Email" type="email" placeholder="user@origin.cleva-ai.co.za" error="Invalid email address" />
          </div>
        </Section>

        {/* SELECT */}
        <Section title="Select">
          <div className="max-w-md">
            <Select
              label="Category"
              searchable
              options={[
                { value: 'pre-rolls', label: 'Pre-Rolls' },
                { value: 'oils', label: 'CBD Oils' },
                { value: 'edibles', label: 'Edibles' },
                { value: 'accessories', label: 'Accessories' },
                { value: 'topicals', label: 'Topicals' },
              ]}
              value={selectVal}
              onChange={setSelectVal}
              placeholder="Choose a category..."
            />
          </div>
        </Section>

        {/* TABS */}
        <Section title="Tabs">
          <Tabs
            tabs={[
              { key: 'inventory', label: 'Inventory' },
              { key: 'orders', label: 'Orders' },
              { key: 'staff', label: 'Staff' },
              { key: 'reports', label: 'Reports' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600">Active tab: <strong>{activeTab}</strong></p>
          </div>
        </Section>

        {/* TABLE */}
        <Section title="Table">
          <Table
            columns={tableColumns}
            data={sampleTableData}
            searchable
            paginated
            pageSize={3}
          />
        </Section>

        {/* MODAL */}
        <Section title="Modal">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Sample Modal"
            footer={
              <>
                <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>Confirm</Button>
              </>
            }
          >
            <p className="text-sm text-gray-600 mb-4">
              Centered modal with backdrop overlay, keyboard close (Esc), and click-outside-to-close.
              Matches the vanilla or-core.js confirm modal pattern.
            </p>
            <Input label="Example Field" placeholder="Type something..." />
          </Modal>
        </Section>

        {/* TOAST */}
        <Section title="Toast">
          <div className="flex flex-wrap gap-3">
            <Button size="sm" variant="secondary" onClick={() => showToast('Product saved successfully', 'success', 'Success')}>
              Success Toast
            </Button>
            <Button size="sm" variant="danger" onClick={() => showToast('Failed to process order', 'error', 'Error')}>
              Error Toast
            </Button>
            <Button size="sm" variant="primary" onClick={() => showToast('Stock running low on CBD Oil', 'warning', 'Warning')}>
              Warning Toast
            </Button>
            <Button size="sm" variant="ghost" onClick={() => showToast('New order received from Sandton branch', 'info')}>
              Info Toast
            </Button>
          </div>
        </Section>

        {/* LOADING SPINNER */}
        <Section title="LoadingSpinner">
          <div className="flex items-end gap-8">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" label="Loading products..." />
            <LoadingSpinner size="lg" />
          </div>
        </Section>

        {/* EMPTY STATE */}
        <Section title="EmptyState">
          <EmptyState
            title="No Products Found"
            message="There are no products matching your filter criteria. Try adjusting your search."
            action={<Button size="sm" variant="primary">Clear Filters</Button>}
          />
        </Section>

        {/* APPROVAL CARD */}
        <Section title="ApprovalCard">
          <div className="max-w-lg">
            <ApprovalCard
              title="New Product Submission"
              subtitle="From: Green Valley Farm"
              meta={['Category: Pre-Rolls', 'THC: 18%', 'Submitted: 2 hours ago']}
              onApprove={() => showToast('Product approved', 'success')}
              onReject={(reason) => showToast(`Rejected: ${reason}`, 'error')}
            >
              <p className="text-sm text-gray-600">
                OG Kush Premium Pre-Roll, 1g. Farm-to-shelf certified.
                Requesting MDC activation for Lifestyle catalogue.
              </p>
            </ApprovalCard>
          </div>
        </Section>

        {/* BRANCH SELECTOR (standalone) */}
        <Section title="BranchSelector">
          <div className="inline-block">
            <BranchSelector
              branches={sampleBranches}
              currentBranch={branchId}
              onChange={setBranchId}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Selected: {branchId ? sampleBranches.find((b) => b._id === branchId)?.name : 'All Branches'}
          </p>
        </Section>

        {/* SIDEBAR (shown via hamburger in header) */}
        <Section title="Sidebar">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            Open Sidebar
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Click the hamburger menu in the header or this button. 280px drawer, slides from left with bounce animation.
          </p>
        </Section>

        <div className="text-center py-8 text-sm text-gray-400">
          P16 Component Library — 16 UI components, 3 layouts
        </div>
      </div>
    </div>
  );
}

export default function ComponentDemo() {
  return (
    <ToastProvider>
      <DemoContent />
    </ToastProvider>
  );
}
