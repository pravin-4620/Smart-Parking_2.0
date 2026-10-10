import { MobilityIllustration, SkeletonCards } from '../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { joinParkingRoom, leaveParkingRoom, subscribeToParkingUpdated } from '../services/socket.js';
import {
  MapPin,
  Compass,
  CalendarCheck,
  Clock,
  Car,
  ArrowRight,
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
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const parkingIds = nearbyParking.map((parking) => parking.parkingId);
    parkingIds.forEach(joinParkingRoom);
    const unsubscribe = subscribeToParkingUpdated((update) => {
      setNearbyParking((current) => current.map((parking) => parking.parkingId === update.parkingLocationId ? {
        ...parking,
        totalSlots: update.totalSlots,
        availableSlots: update.availableSlots,
        unknownSlots: update.unknownSlots,
        occupancy: update.occupancyRate,
        telemetryStatus: update.unknownSlots === update.totalSlots ? 'UNAVAILABLE' : update.unknownSlots > 0 ? 'PARTIAL' : 'LIVE',
      } : parking));
    });
    return () => {
      unsubscribe();
      parkingIds.forEach(leaveParkingRoom);
    };
  }, [nearbyParking.map((parking) => parking.parkingId).join(',')]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const nearbyPromise = new Promise<void>((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setCurrentLocation({ lat, lng });
            void loadNearby(lat, lng).finally(resolve);
          },
          () => {
            setLocationError('Location permission is unavailable. Use Nearby Parking to retry or search all facilities.');
            resolve();
          },
          { timeout: 10000 },
          );
        } else {
          setLocationError('This browser does not support geolocation. You can still view all facilities.');
          resolve();
        }
      });

      // Fetch Bookings
      const bookingsRes = await apiClient.get('/reservations?limit=10');
      const allBookings = bookingsRes.data.data || [];

      // Find upcoming booking
      const upcoming = allBookings.find(
        (b: any) => b.status === 'CONFIRMED' || b.status === 'PENDING_CONFIRMATION'
      );
      setUpcomingBooking(upcoming || null);
      setRecentBookings(allBookings.slice(0, 5));

      // Fetch Active Sessions
      const sessionsRes = await apiClient.get('/parking-sessions');
      const sessions = sessionsRes.data.data || [];
      const active = sessions.find((s: any) => s.status === 'ACTIVE');
      setActiveSession(active || null);
      await nearbyPromise;
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNearby = async (lat: number, lng: number) => {
    try {
      const res = await apiClient.get(`/parking/nearby?lat=${lat}&lng=${lng}&radius=10`);
      setNearbyParking(res.data.data || []);
    } catch (err) {
      console.error('Failed to load nearby parking:', err);
    }
  };

  if (loading) {
    return <SkeletonCards count={3} label="Loading your parking activity" />;
  }

  return (
    <div className="driver-dashboard space-y-8">
      {locationError && <div role="alert" className="inline-notice"><AlertCircle size={18} />{locationError}</div>}
      <section className="dashboard-hero">
        <div><p className="eyebrow">Your everyday parking, simplified</p><h1>A space for wherever<br />life takes you.</h1><p>Find nearby parking, reserve your next stop, and keep every journey moving.</p>
          <div className="dashboard-actions"><button onClick={() => navigate('/nearby')} className="ui-button ui-button-dark"><Compass size={16} />Explore Nearby</button><button onClick={() => navigate('/booking')} className="ui-button"><Plus size={16} />Quick Reserve</button></div>
        </div><MobilityIllustration />
      </section>
      <section aria-label="Your parking activity" className="activity-row">
        <div><MapPin size={21} className="mb-4 text-slate-500" /><span className="metric-label">Your location</span><span className="metric-value">{currentLocation ? `${currentLocation.lat.toFixed(4)}° N, ${currentLocation.lng.toFixed(4)}° E` : 'Location not shared'}</span><span className="metric-detail">Your parking search starts here</span></div>
        <div><CalendarCheck size={21} className="mb-4 text-indigo-600" /><span className="metric-label">Upcoming reservation</span>{upcomingBooking ? <><span className="metric-value">{upcomingBooking.parkingLocationId?.name || 'Smart Parking'}</span><span className="metric-detail">Slot #{upcomingBooking.slotId?.slotNumber || 'Assigned'} · {new Date(upcomingBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></> : <><span className="metric-value">Your next stop awaits</span><span className="metric-detail">No active upcoming booking</span></>}</div>
        <div><Clock size={21} className="mb-4 text-slate-500" /><span className="metric-label">Current parking session</span>{activeSession ? <><span className="metric-value text-emerald-600">Parked now</span><span className="metric-detail">Entry: {new Date(activeSession.entryTime).toLocaleTimeString()}</span></> : <><span className="metric-value">You're on the move</span><span className="metric-detail">Not parked in any facility</span></>}</div>
      </section>

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
                    {parking.address} ({parking.distance.toFixed(1)} km)
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
                          : b.status === 'PENDING_CONFIRMATION'
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
