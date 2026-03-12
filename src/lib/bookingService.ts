import { supabase } from "./supabase"

type CreateBookingInput = {
  schoolId: string
  roomId: string
  userId: string
  bookingDate: string
  startTime: string
  endTime: string
  purpose?: string
}

export async function createBooking(input: CreateBookingInput) {
  if (input.startTime >= input.endTime) {
    throw new Error("Masa tamat mesti selepas masa mula.")
  }

  const { data: clashes, error: clashError } = await supabase
    .from("bookings")
    .select("id")
    .eq("school_id", input.schoolId)
    .eq("room_id", input.roomId)
    .eq("booking_date", input.bookingDate)
    .lt("start_time", input.endTime)
    .gt("end_time", input.startTime)

  if (clashError) throw clashError

  if (clashes && clashes.length > 0) {
    throw new Error("Bilik ini sudah ditempah pada masa tersebut.")
  }

  const { error } = await supabase.from("bookings").insert({
    school_id: input.schoolId,
    room_id: input.roomId,
    user_id: input.userId,
    booking_date: input.bookingDate,
    start_time: input.startTime,
    end_time: input.endTime,
    purpose: input.purpose || null,
  })

  if (error) throw error
}

export async function getBookingsBySchool(schoolId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      booking_date,
      start_time,
      end_time,
      purpose,
      rooms(name)
    `
    )
    .eq("school_id", schoolId)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true })

  if (error) throw error
  return data
}
