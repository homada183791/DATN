import {
  MonitorIcon,
  TrophyIcon,
  BookIcon,
  DashboardIcon,
  GraduationCapIcon,
  UsersIcon,
  SubmissionsIcon,
  FormatIcon,
} from "@/components/nav-icons";
import type { NavItem } from "@/components/sidebar";

export const publicNavItems: NavItem[] = [
  { key: "problems", label: "Bài tập", href: "/", icon: <MonitorIcon /> },
  { key: "contests", label: "Cuộc thi", href: "/contests", icon: <TrophyIcon /> },
  { key: "guide", label: "Hướng dẫn sử dụng", href: "/guide", icon: <BookIcon /> },
];

// Các route riêng cho instructor nằm dưới tiền tố /instructor/*
// để khớp với middleware.ts đã chặn theo tiền tố này.
export const instructorNavItems: NavItem[] = [
  {
    key: "dashboard",
    label: "Bảng điều khiển",
    href: "/instructor/dashboard",
    icon: <DashboardIcon />,
  },
  { key: "problems", label: "Bài tập", href: "/", icon: <MonitorIcon /> },
  { key: "contests", label: "Cuộc thi", href: "/contests", icon: <TrophyIcon /> },
  {
    key: "classes",
    label: "Lớp học",
    href: "/instructor/classes",
    icon: <GraduationCapIcon />,
  },
  {
    key: "students",
    label: "Sinh viên",
    href: "/instructor/students",
    icon: <UsersIcon />,
  },
  {
    key: "submissions",
    label: "Bài nộp",
    href: "/instructor/submissions",
    icon: <SubmissionsIcon />,
  },
  {
    key: "format-guide",
    label: "Hướng dẫn định dạng",
    href: "/instructor/format-guide",
    icon: <FormatIcon />,
  },
  { key: "guide", label: "Hướng dẫn sử dụng", href: "/guide", icon: <BookIcon /> },
];
