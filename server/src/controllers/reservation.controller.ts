import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ReservationService } from '../services/reservation.service.js';
import { CreateReservationInput, ListReservationsQueryInput } from '@smart-parking/shared';

export const createReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input = req.body as CreateReservationInput;
    const reservation = await ReservationService.createReservation(input, req.user.id);

    res.status(201).json({
      message: 'Reservation created successfully in pending payment state',
      data: reservation,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.statusCode === 409 ? 'Reservation Conflict' : 'Failed to create reservation',
      message: error.message,
    });
  }
};

export const getReservationById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reservation = await ReservationService.getReservationById(
      req.params.id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({ data: reservation });
  } catch (error: any) {
    const statusCode = error.statusCode || 404;
    res.status(statusCode).json({ error: 'Reservation fetch failed', message: error.message });
  }
};

export const listReservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = req.query as unknown as ListReservationsQueryInput;
    const result = await ReservationService.listReservations(query, req.user.id, req.user.role);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list reservations', message: error.message });
  }
};

export const cancelReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reservation = await ReservationService.cancelReservation(
      req.params.id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      message: 'Reservation cancelled successfully',
      data: reservation,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: 'Failed to cancel reservation', message: error.message });
  }
};

