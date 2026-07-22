import React from 'react';

interface AuditFiltersProps {
  onChange: (filters: Record<string, string>) => void;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({ onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // Basic implementation
    onChange({ [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow flex space-x-4">
      <input type="date" name="from" onChange={handleChange} className="border p-2 rounded" title="From Date" />
      <input type="date" name="to" onChange={handleChange} className="border p-2 rounded" title="To Date" />
      <input type="text" name="actor" placeholder="Actor ID" onChange={handleChange} className="border p-2 rounded" />
      <input type="text" name="action" placeholder="Action" onChange={handleChange} className="border p-2 rounded" />
      <input type="text" name="resource" placeholder="Resource Type" onChange={handleChange} className="border p-2 rounded" />
    </div>
  );
};
