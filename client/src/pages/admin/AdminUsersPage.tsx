import { PageHeader } from '../../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    adminService.getUsers().then(setUsers).catch(console.error);
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader eyebrow="People & permissions" title="Your user directory" description="Review registered people, access roles, and account status." />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="responsive-table w-full text-left text-xs">
          <thead className="bg-slate-50 border-b font-bold text-slate-700">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u._id}>
                <td data-label="Name" className="p-3 font-bold">{u.name}</td>
                <td data-label="Email" className="p-3">{u.email}</td>
                <td data-label="Role" className="p-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 font-bold text-xs"
                  >
                    <option value="USER">USER</option>
                    <option value="PARKING_MANAGER">PARKING_MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td data-label="Status" className="p-3 font-bold">{u.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
