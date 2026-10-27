export interface DemoUser {
  id: string; // matches demo_users.csv user_id
  name: string;
  firstName: string;
  title: string;
  badge: string;
  initials: string;
  role: 'field' | 'vecdim' | 'uniosun';
  state: string; // 'Osun' | 'Lagos' | 'Kano' | 'National'
  primaryLga: string;
  sentinelSite: string;
  division: string;
  defaultLat: number;
  defaultLon: number;
  avatarColor: string;
  accentColor: string;
  phone: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'u_field_03',
    name: 'Tega Babalola',
    firstName: 'Tega',
    title: 'Senior Field Entomologist',
    badge: 'Officer #042',
    initials: 'TB',
    role: 'field',
    state: 'Osun',
    primaryLga: 'Osogbo',
    sentinelSite: 'OS-774-WARD4 • Oja-Oba Central',
    division: 'Osun Field Division • Active',
    defaultLat: 7.7827,
    defaultLon: 4.5418,
    avatarColor: '#047857',
    accentColor: '#10B981',
    phone: '+234 803 456 7890',
  },
  {
    id: 'u_field_01',
    name: 'Biodun Adeleke',
    firstName: 'Biodun',
    title: 'Urban Vector Specialist',
    badge: 'Officer #011',
    initials: 'BA',
    role: 'field',
    state: 'Lagos',
    primaryLga: 'Ikorodu',
    sentinelSite: 'LA-245-WARD2 • Ikorodu Waterfront',
    division: 'Lagos Field Division • Active',
    defaultLat: 6.6214,
    defaultLon: 3.5108,
    avatarColor: '#0284C7',
    accentColor: '#38BDF8',
    phone: '+234 802 345 6789',
  },
  {
    id: 'u_field_02',
    name: 'Aminu Bello',
    firstName: 'Aminu',
    title: 'Arid Vector Surveillance Lead',
    badge: 'Officer #019',
    initials: 'AB',
    role: 'field',
    state: 'Kano',
    primaryLga: 'Nasarawa',
    sentinelSite: 'KN-118-WARD7 • Bompai Canal',
    division: 'Kano Field Division • Active',
    defaultLat: 12.0022,
    defaultLon: 8.5519,
    avatarColor: '#D97706',
    accentColor: '#FBBF24',
    phone: '+234 806 789 0123',
  },
  {
    id: 'u_vecdim_osun',
    name: 'Dr. Funke Adeyemi',
    firstName: 'Funke',
    title: 'Osun State Vector Coordinator',
    badge: 'State Lead #OS',
    initials: 'FA',
    role: 'vecdim',
    state: 'Osun',
    primaryLga: 'Osogbo',
    sentinelSite: 'Osun State Health Surveillance HQ',
    division: 'Osun State Ministry of Health',
    defaultLat: 7.7712,
    defaultLon: 4.5621,
    avatarColor: '#7C3AED',
    accentColor: '#A78BFA',
    phone: '+234 805 123 4567',
  },
  {
    id: 'u_vecdim_lagos',
    name: 'Babatunde Ojo',
    firstName: 'Babatunde',
    title: 'Lagos State Vector Coordinator',
    badge: 'State Lead #LA',
    initials: 'BO',
    role: 'vecdim',
    state: 'Lagos',
    primaryLga: 'Ikorodu',
    sentinelSite: 'Lagos Epidemiology Directorate',
    division: 'Lagos State Ministry of Health',
    defaultLat: 6.6018,
    defaultLon: 3.3515,
    avatarColor: '#2563EB',
    accentColor: '#60A5FA',
    phone: '+234 803 987 6543',
  },
  {
    id: 'u_vecdim_kano',
    name: 'Fatima Ibrahim',
    firstName: 'Fatima',
    title: 'Kano State Vector Coordinator',
    badge: 'State Lead #KN',
    initials: 'FI',
    role: 'vecdim',
    state: 'Kano',
    primaryLga: 'Nasarawa',
    sentinelSite: 'Kano Primary Healthcare Agency',
    division: 'Kano State Ministry of Health',
    defaultLat: 11.9812,
    defaultLon: 8.5218,
    avatarColor: '#C026D3',
    accentColor: '#E879F9',
    phone: '+234 808 654 3210',
  },
  {
    id: 'u_uniosun_01',
    name: 'Prof. Clement Onwubiko',
    firstName: 'Clement',
    title: 'Principal Investigator (UNIOSUN/MOOD)',
    badge: 'National Director',
    initials: 'CO',
    role: 'uniosun',
    state: 'National',
    primaryLga: 'Osogbo HQ',
    sentinelSite: 'UNIOSUN Vector Intelligence Command',
    division: 'UNIOSUN / MOOD Africa Consortium',
    defaultLat: 7.7827,
    defaultLon: 4.5418,
    avatarColor: '#0F172A',
    accentColor: '#64748B',
    phone: '+234 801 112 2334',
  },
];

export const DEFAULT_DEMO_USER: DemoUser = DEMO_USERS[0]; // Tega Babalola

export function getDemoUserById(id: string): DemoUser {
  return DEMO_USERS.find((u) => u.id === id) || DEFAULT_DEMO_USER;
}

export function findDemoUser(query: string): DemoUser | undefined {
  const q = query.trim().toLowerCase();
  return DEMO_USERS.find(
    (u) =>
      u.id.toLowerCase() === q ||
      u.name.toLowerCase() === q ||
      u.firstName.toLowerCase() === q
  );
}
