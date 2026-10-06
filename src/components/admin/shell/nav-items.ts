import { Download, GalleryVerticalEnd, Globe, Images, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard/collections", label: "Coleções", icon: GalleryVerticalEnd },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/portfolio", label: "Portfólio", icon: Images },
  { href: "/dashboard/site", label: "Site", icon: Globe },
  { href: "/dashboard/downloads", label: "Downloads", icon: Download },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

export const SIDEBAR_COOKIE = "bc_sidebar";
