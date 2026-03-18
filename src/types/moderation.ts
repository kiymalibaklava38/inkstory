// ── Report ────────────────────────────────────────────────
export type ReportTargetType = 'story' | 'comment' | 'user'
export type ReportStatus     = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export interface Report {
  id:          string
  reporter_id: string | null
  target_type: ReportTargetType
  target_id:   string
  reason:      string
  details:     string | null
  status:      ReportStatus
  reviewed_by: string | null
  admin_note:  string | null
  created_at:  string
  updated_at:  string
  // joined
  reporter?: { username: string; display_name: string | null; avatar_url: string | null } | null
}

// ── Moderated Story ───────────────────────────────────────
export type ModerationStatus = 'ok' | 'flagged' | 'removed'

export interface ModeratedStory {
  id:                string
  baslik:            string
  slug:              string
  durum:             string
  is_featured:       boolean
  is_locked:         boolean
  moderation_status: ModerationStatus
  goruntuleme:       number
  created_at:        string
  yazar_id:          string
  profiles?: { username: string; display_name: string | null; avatar_url: string | null }
  kategoriler?: { ad: string; ikon: string } | null
}

// ── Moderated Comment ─────────────────────────────────────
export interface ModeratedComment {
  id:               string
  icerik:           string
  is_deleted:       boolean
  moderation_flag:  boolean
  created_at:       string
  yazar_id:         string
  hikaye_id:        string
  profiles?: { username: string; display_name: string | null; avatar_url: string | null }
  hikayeler?: { baslik: string; slug: string } | null
}

// ── Moderated User ────────────────────────────────────────
export interface ModeratedUser {
  id:            string
  username:      string
  display_name:  string | null
  avatar_url:    string | null
  is_admin:      boolean
  is_banned:     boolean
  ban_reason:    string | null
  banned_at:     string | null
  shadow_banned: boolean
  created_at:    string
}

// ── AI Usage Log ──────────────────────────────────────────
export interface AiUsageLog {
  id:            string
  user_id:       string
  action:        string
  prompt_length: number
  result_length: number
  story_title:   string | null
  created_at:    string
  profiles?: { username: string; display_name: string | null }
}

export interface AiUsageSummary {
  user_id:      string
  username:     string
  display_name: string | null
  total_calls:  number
  total_tokens: number
  last_used:    string
  suspicious:   boolean  // >100 calls/day
}

// ── Admin action payloads ─────────────────────────────────
export interface BanUserPayload {
  userId:    string
  reason:    string
  shadow?:   boolean
}

export interface ResolveReportPayload {
  reportId:  string
  action:    'dismiss' | 'resolve' | 'delete_content' | 'ban_user'
  adminNote?: string
  banReason?: string
}

export interface ModerateStoryPayload {
  storyId:  string
  action:   'feature' | 'unfeature' | 'lock' | 'unlock' | 'unpublish' | 'delete' | 'flag' | 'unflag'
}

export interface ModerateCommentPayload {
  commentId: string
  action:    'delete' | 'flag' | 'unflag'
}
