export interface FeedbackItem {
  type: 'warning' | 'info' | 'success'
  category: string
  message: string
  tip: string
}

export interface ShotCreateResponse {
  shot: Shot
  feedback: FeedbackItem[]
}

export interface Shot {
  id: number
  club: string
  ball_speed: number
  launch_angle: number
  back_spin: number
  side_spin: number
  club_path: number
  carry_distance: number
  total_distance: number
  created_at: string
}
