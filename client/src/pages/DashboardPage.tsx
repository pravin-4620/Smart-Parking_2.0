import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import {
  MapPin,
  Compass,
  CalendarCheck,
  Clock,
  Car,
  Zap,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [nearbyParking, setNearbyParking] = useState<any[]>([]);
  const [upcomingBooking, setUpcomingBooking] = useState<any | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Default to Bangalore coordinates if geolocation not supported
      let lat = 12.9716;
      let lng = 77.5946;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            setCurrentLocation({ lat, lng });
            loadNearby(lat, lng);
          },
          () => {
            setCurrentLocation({ lat, lng });
            loadNearby(lat, lng);
          }
        );
      } else {
        setCurrentLocation({ lat, lng });
        loadNearby(lat, lng);
      }

      // Fetch Bookings
      const bookingsRes = await apiClient.get('/reservations?limit=10');
      const allBookings = bookingsRes.data.data || [];

      // Find upcoming booking
      const upcoming = allBookings.find(
        (b: any) => b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT'
      );
      setUpcomingBooking(upcoming || null);
      setRecentBookings(allBookings.slice(0, 5));

      // Fetch Active Sessions
      const sessionsRes = await apiClient.get('/parking-sessions');
      const sessions = sessionsRes.data.data || [];
      const active = sessions.find((s: any) => s.status === 'ACTIVE');
      setActiveSession(active || null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNearby = async (lat: number, lng: number) => {
    try {
      const res = await apiClient.get(`/parking/nearby?lat=${lat}&lng=${lng}&radius=10000`);
      setNearbyParking(res.data.data || []);
    } catch (err) {
      console.error('Failed to load nearby parking:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-semibold backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" /> Real-time IoT Slot Allocation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Smart Parking Driver Portal
          </h1>
          <p className="text-sm text-slate-300">
            Find, reserve, and pay for guaranteed parking slots powered by IoT occupancy sensors and dynamic pricing.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/booking')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Quick Reserve
            </button>
            <button
              onClick={() => navigate('/nearby')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm border border-slate-700 flex items-center gap-2 transition"
            >
              <Compass className="w-4 h-4 text-emerald-400" /> Explore Nearby
            </button>
          </div>
        </div>
      </div>

      {/* Grid Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Location Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Current Location</span>
            <span className="text-sm font-bold text-slate-800 block mt-1">
              {currentLocation ? `${currentLocation.lat.toFixed(4)}° N, ${currentLocation.lng.toFixed(4)}° E` : 'Bengaluru City Center'}
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> GPS Active
            </span>
          </div>
        </div>

        {/* Upcoming Booking Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-slate-400 font-bold uppercase block">Upcoming Reservation</span>
            {upcomingBooking ? (
              <div>
                <span className="text-sm font-bold text-slate-800 block truncate mt-1">
                  {upcomingBooking.parkingLocationId?.name || 'Smart Parking'}
                </span>
                <span className="text-xs text-indigo-600 font-semibold block mt-0.5">
                  Slot #{upcomingBooking.slotId?.slotNumber || 'Assigned'} — {new Date(upcomingBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 block mt-1">No active upcoming booking</span>
            )}
          </div>
        </div>

        {/* Active Session Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Active Parking Session</span>
            {activeSession ? (
              <div>
                <span className="text-sm font-bold text-emerald-600 block mt-1">
                  PARKED NOW
                </span>
                <span className="text-xs text-slate-500 block">
                  Entry: {new Date(activeSession.entryTime).toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 block mt-1">Not parked in any facility</span>
            )}
          </div>
        </div>
      </div>

      {/* Nearby Parking Facility Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Nearby Parking Facilities</h2>
          <Link to="/nearby" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            View All Map <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {nearbyParking.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm">No nearby parking locations found within radius.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nearbyParking.slice(0, 3).map((parking) => (
              <div
                key={parking.parkingId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 text-base">{parking.name}</h3>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                      {parking.availableSlots}/{parking.totalSlots} Slots Free
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {parking.address} ({(parking.distance / 1000).toFixed(1)} km)
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Starting Rate</span>
                    <span className="text-sm font-extrabold text-slate-800">₹{parking.startingPrice}/hr</span>
                  </div>
                  <button
                    onClick={() => navigate(`/parking/${parking.parkingId}`)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bookings Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Recent Bookings</h2>
          <Link to="/my-bookings" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No recent bookings found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <div key={b._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {b.parkingLocationId?.name || 'Smart Parking Facility'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Slot #{b.slotId?.slotNumber || 'A-101'} • {new Date(b.startTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'PENDING_PAYMENT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-xs font-bold text-slate-700 block mt-1">
                      ₹{b.pricingSnapshot?.totalAmount || 60}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
