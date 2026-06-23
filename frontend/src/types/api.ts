export interface DashboardStats {
  threat_actors: { total: number; active: number }
  leaks: {
    total: number
    new_today: number
    onion: number
    web: number
    by_severity: Record<string, number>
    by_source: { dark_web: number; surface_web: number }
  }
  iocs: { total: number }
  sources: { active: number }
}

export interface Leak {
  id: number
  title: string
  severity: string
  status: string
  description?: string
  victim_name?: string
  actor_name?: string
  source_url?: string
  data_types?: string[]
  confidence?: number
  tags?: string[]
  created_at?: string
  updated_at?: string
  is_onion?: boolean
}

export interface LeakListResponse {
  total: number
  leaks: Leak[]
}

export interface IOC {
  id: number
  type: string
  value: string
  context?: string
  confidence?: number
  source?: string
  source_name?: string
  tags?: string[]
  first_seen?: string
  last_seen?: string
  threat_score?: number
}

export interface IOCListResponse {
  total: number
  iocs: IOC[]
}

export interface Alert {
  id: number
  alert_type: string
  title: string
  severity: string
  description?: string
  source_name?: string
  entity_type?: string
  entity_id?: number
  entity_value?: string
  confidence?: number
  matched_keywords?: string[]
  is_read?: boolean
  is_dismissed?: boolean
  source_url?: string
  created_at?: string
  updated_at?: string
  metadata?: Record<string, unknown>
}

export interface AlertListResponse {
  total: number
  unread: number
  alerts: Alert[]
}

export interface Source {
  id: number
  name: string
  type: string
  is_active: boolean
  is_onion?: boolean
  uses_tor?: boolean
  url?: string
  onion_url?: string
  description?: string
  language?: string
  scrape_interval_minutes?: number
}

export interface SourceListResponse {
  total: number
  sources: Source[]
}

export interface ThreatActor {
  id: number
  name: string
  risk_level?: string
  description?: string
  aliases?: string[]
  motivation?: string
  sophistication?: string
  resource_level?: string
  target_industries?: string[]
  target_regions?: string[]
  is_active?: boolean
  first_seen?: string
  last_activity?: string
  ttps?: string[]
  associated_tools?: string[]
  wallet_addresses?: string[]
  notes?: string
  attribution_score?: number
  threat_score?: number
}

export interface ThreatActorListResponse {
  total: number
  actors: ThreatActor[]
  threat_actors?: ThreatActor[]
}

export interface ScrapeStatus {
  status: string
  progress: number
  total: number
  success: number
  failed: number
  duplicates?: number
  current_url?: string
  logs?: string[]
  start_time?: string
  end_time?: string
}
