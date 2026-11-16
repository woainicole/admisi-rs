export const ROLE = {
  ADMIN: 'admin',
  PETUGAS: 'petugas',
}

/** Menu sidebar per role (Bagian 7 plan). */
export const MENU = [
  { to: '/dashboard', label: 'Dashboard', roles: [ROLE.ADMIN, ROLE.PETUGAS] },
  { to: '/pasien', label: 'Pasien', roles: [ROLE.ADMIN, ROLE.PETUGAS] },
  { to: '/kamar', label: 'Kamar', roles: [ROLE.ADMIN, ROLE.PETUGAS] },
  { to: '/operasi', label: 'Jadwal Operasi', roles: [ROLE.ADMIN, ROLE.PETUGAS] },
  { to: '/integrasi', label: 'Integrasi', roles: [ROLE.ADMIN, ROLE.PETUGAS] },
]

export function menuUntuk(role) {
  return MENU.filter((item) => item.roles.includes(role))
}

export function admin(role) {
  return role === ROLE.ADMIN
}
