import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api.js';
import { VehicleType } from '@smart-parking/shared';
import { Car, Plus, Trash2, Edit3, Star, Loader2, Check } from 'lucide-react';

export const MyVehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Form State
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.CAR);
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/vehicles');
      setVehicles(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingVehicleId(null);
    setLicensePlate('');
    setMake('');
    setModel('');
    setColor('');
    setVehicleType(VehicleType.CAR);
    setIsDefault(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (v: any) => {
    setEditingVehicleId(v._id);
    setLicensePlate(v.licensePlate);
    setMake(v.make || '');
    setModel(v.model || '');
    setColor(v.color || '');
    setVehicleType(v.vehicleType || VehicleType.CAR);
    setIsDefault(v.isDefault || false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingVehicleId) {
        await apiClient.patch(`/vehicles/${editingVehicleId}`, {
          make,
          model,
          color,
          vehicleType,
          isDefault,
        });
      } else {
        await apiClient.post('/vehicles', {
          licensePlate,
          make,
          model,
          color,
          vehicleType,
          isDefault,
        });
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this vehicle registration?')) return;
    try {
      await apiClient.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-7 h-7 text-indigo-600" /> Registered Vehicles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Link license plates for automatic ALPR and RFID barrier entry access.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition"
        >
          <Plus className="w-4 h-4" /> Add New Vehicle
        </button>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Vehicles Registered</h3>
          <p className="text-xs text-slate-400 mt-1">Add your vehicle license plate to enable fast barrier entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div
              key={v._id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      {v.licensePlate}
                    </span>
                    {v.isDefault && (
                      <span className="p-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200" title="Default Vehicle">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
                    {v.vehicleType}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-700 mt-3">
                  {v.make || 'Custom'} {v.model || 'Vehicle'} {v.color && `(${v.color})`}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => handleOpenEditModal(v)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(v._id)}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editingVehicleId ? 'Edit Registered Vehicle' : 'Add New Vehicle'}
            </h2>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">License Plate Number</label>
              <input
                type="text"
                required
                disabled={!!editingVehicleId}
                placeholder="e.g. KA-01-AB-1234"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Make / Brand</label>
                <input
                  type="text"
                  placeholder="e.g. Tata, Hyundai"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Model Name</label>
                <input
                  type="text"
                  placeholder="e.g. Nexon, Creta"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Color</label>
                <input
                  type="text"
                  placeholder="e.g. White, Black"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Vehicle Category</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-bold"
                >
                  {Object.values(VehicleType).map((vt) => (
                    <option key={vt} value={vt}>
                      {vt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-700">Set as Primary Default Vehicle</span>
            </label>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Vehicle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
