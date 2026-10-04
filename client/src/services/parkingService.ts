import { apiClient } from './api';
import { NearbyParkingResponse, SlotStatus, SlotType } from '@smart-parking/shared';

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radius?: number;
  slotType?: SlotType;
}

export interface ParkingLocationDetail extends NearbyParkingResponse {
  pricingProfile?: {
    baseHourlyRate: number;
    minimumCharge: number;
    maximumDailyCharge: number;
  };
  slots: Array<{
    _id: string;
    slotNumber: string;
    status: SlotStatus;
    slotType: SlotType;
    isActive: boolean;
    sensorId?: string;
  }>;
  slotStats: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  };
}

export const getNearbyParkingApi = async (
  params: NearbySearchParams
): Promise<NearbyParkingResponse[]> => {
  const response = await apiClient.get<{ count: number; data: NearbyParkingResponse[] }>(
    '/parking/nearby',
    { params }
  );
  return response.data.data;
};

export const getParkingLocationDetailsApi = async (
  id: string
): Promise<ParkingLocationDetail> => {
  const response = await apiClient.get<{ data: ParkingLocationDetail }>(
    `/parking-locations/${id}`
  );
  return response.data.data;
};

export const getAllParkingLocationsApi = async (): Promise<NearbyParkingResponse[]> => {
  const response = await apiClient.get<{ data: NearbyParkingResponse[] }>('/parking-locations');
  return response.data.data;
};

export const parkingService = {
  getNearbyParking: getNearbyParkingApi,
  getParkingDetails: getParkingLocationDetailsApi,
  getAllParkingLocations: getAllParkingLocationsApi,
};
