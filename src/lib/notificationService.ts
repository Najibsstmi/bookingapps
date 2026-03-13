import { supabase } from "./supabase"

type CreateNotificationInput = {
  userId: string
  title: string
  message: string
}

export async function createNotification({
  userId,
  title,
  message,
}: CreateNotificationInput) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
  })

  if (error) throw error
}
