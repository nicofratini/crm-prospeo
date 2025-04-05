import { z } from "npm:zod@v3.22.4";

// Schema for Cal.com API response
const calcomBookingSchema = z.object({
  id: z.number(),
  uid: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(['ACCEPTED', 'PENDING', 'CANCELLED', 'REJECTED']),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
  })),
  location: z.string().optional().nullable(),
});

type CalcomBooking = z.infer<typeof calcomBookingSchema>;

/**
 * Fetches bookings from Cal.com API
 */
export async function getCalComBookings(params: { dateFrom?: string; dateTo?: string } = {}) {
  const apiKey = Deno.env.get("CALCOM_API_KEY");
  if (!apiKey) {
    throw new Error("Cal.com API key not configured");
  }

  const { dateFrom, dateTo } = params;
  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.append('dateFrom', dateFrom);
  if (dateTo) queryParams.append('dateTo', dateTo);

  try {
    const response = await fetch(
      `https://api.cal.com/v1/bookings?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Cal.com bookings');
    }

    const data = await response.json();
    return data.bookings.map((booking: CalcomBooking) => ({
      calcom_booking_id: booking.uid,
      title: booking.title,
      description: booking.description,
      start_time: booking.startTime,
      end_time: booking.endTime,
      status: booking.status.toLowerCase(),
      attendee_name: booking.attendees[0]?.name,
      attendee_email: booking.attendees[0]?.email,
      location: booking.location,
    }));

  } catch (error) {
    console.error('Cal.com API error:', error);
    throw error;
  }
}