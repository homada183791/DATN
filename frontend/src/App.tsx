import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { queryClient } from './api/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ClassProvider } from './context/ClassContext';
import { HomeworkProvider } from './context/HomeworkContext';
import { ContributedProvider } from './context/ContributedContext';
import InstructorClass from './pages/instructor/Class';
import InstructorHomework from './pages/instructor/Homework';
import JoinClass from './pages/student/JoinClass';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginRegister from './pages/auth/LoginRegister';
import StudentDashboard from './pages/student/Dashboard';
import PersonalPage from './pages/student/PersonalPage';
import SettingsPage from './pages/student/SettingsPage';
import ProblemList from './pages/student/ProblemList';
import ProblemSolve from './pages/student/ProblemSolve';
import StudentHomework from './pages/student/Homework';

import Contest from './pages/student/Contest';
import Submission from './pages/student/Submission';
import ClassPage from './pages/student/Class';
import InstructorDashboard from './pages/instructor/Dashboard';
import InstructorContest from './pages/instructor/Contest';
import InstructorStudent from './pages/instructor/Student';
import NotFoundPage from './pages/NotFound';

export default function App() {
  useEffect(() => {
    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket'] });

    socket.on('leaderboard_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <ClassProvider>
        <HomeworkProvider>
        <ContributedProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRegister />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Student Routes - chỉ student mới được truy cập */}
          <Route path="/student" element={<ProtectedRoute allowedRole="student"><Layout><Navigate to="/student/dashboard" replace /></Layout></ProtectedRoute>} />
          <Route path="/student/dashboard" element={<ProtectedRoute allowedRole="student"><Layout><StudentDashboard /></Layout></ProtectedRoute>} />
          <Route path="/student/problems" element={<ProtectedRoute allowedRole="student"><Layout><ProblemList /></Layout></ProtectedRoute>} />
          <Route path="/student/problem/:id" element={<ProtectedRoute allowedRole="student"><Layout fullBleed><ProblemSolve /></Layout></ProtectedRoute>} />
          <Route path="/student/homework" element={<ProtectedRoute allowedRole="student"><Layout><StudentHomework /></Layout></ProtectedRoute>} />
          <Route path="/student/contest" element={<ProtectedRoute allowedRole="student"><Layout><Contest /></Layout></ProtectedRoute>} />
          <Route path="/student/submission" element={<ProtectedRoute allowedRole="student"><Layout><Submission /></Layout></ProtectedRoute>} />
          <Route path="/student/class" element={<ProtectedRoute allowedRole="student"><Layout><ClassPage /></Layout></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRole="student"><Layout><PersonalPage /></Layout></ProtectedRoute>} />
          <Route path="/student/settings" element={<ProtectedRoute allowedRole="student"><Layout><SettingsPage /></Layout></ProtectedRoute>} />
          
          {/* Instructor Routes - chỉ instructor mới được truy cập */}
          <Route path="/instructor" element={<ProtectedRoute allowedRole="instructor"><Layout><Navigate to="/instructor/dashboard" replace /></Layout></ProtectedRoute>} />
          <Route path="/instructor/dashboard" element={<ProtectedRoute allowedRole="instructor"><Layout><InstructorDashboard /></Layout></ProtectedRoute>} />
          <Route path="/instructor/classes" element={<ProtectedRoute allowedRole="instructor"><Layout><InstructorClass /></Layout></ProtectedRoute>} />
          <Route path="/instructor/contest" element={<ProtectedRoute allowedRole="instructor"><Layout><InstructorContest /></Layout></ProtectedRoute>} />
          <Route path="/instructor/students" element={<ProtectedRoute allowedRole="instructor"><Layout><InstructorStudent /></Layout></ProtectedRoute>} />
          <Route path="/instructor/homework" element={<ProtectedRoute allowedRole="instructor"><Layout><InstructorHomework /></Layout></ProtectedRoute>} />
          <Route path="/instructor/problems" element={<ProtectedRoute allowedRole="instructor"><Layout><ProblemList /></Layout></ProtectedRoute>} />
          <Route path="/instructor/submissions" element={<ProtectedRoute allowedRole="instructor"><Layout><Submission /></Layout></ProtectedRoute>} />

          {/* Invite link: /join/CODE */}
          <Route path="/join/:code" element={<JoinClass />} />

          {/* Catch all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BrowserRouter>
        </ContributedProvider>
        </HomeworkProvider>
        </ClassProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
