export const endpoints = {
  auth: {
    login: "/api/auth/login/",
    refresh: "/api/auth/token/refresh/",
    users: "/api/auth/users/",
    companies: "/api/auth/companies/",
    organisations: "/api/auth/organisations/"
  },
  patrols: {
    startShift: "/api/patrols/shifts/start/",
    endShift: "/api/patrols/shifts/end/",
    currentShift: "/api/patrols/shifts/current/",
    shifts: "/api/patrols/shifts/",
    shiftFilters: "/api/patrols/shifts/filters/",
    scan: "/api/patrols/scan/",
    incidents: "/api/patrols/incidents/",
    incidentFilters: "/api/patrols/incidents/filters/",
    sites: "/api/patrols/sites/",
    patrolLogs: "/api/patrols/patrol-logs/",
    patrolLogFilters: "/api/patrols/patrol-logs/filters/",
    dashboard: "/api/patrols/dashboard/",
    adminSites: "/api/patrols/manage/sites/",
    adminShifts: "/api/patrols/manage/shifts/",
    adminCheckpoints: "/api/patrols/manage/checkpoints/",
    adminVisitors: "/api/patrols/manage/visitors/",
    liveTracking: "/api/patrols/manage/live-tracking/"
  }
};
