import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import LoginRegister from './pages/auth/LoginRegister';
import StudentDashboard from './pages/student/Dashboard';
import PersonalPage from './pages/student/PersonalPage';
import SettingsPage from './pages/student/SettingsPage';
import ProblemList from './pages/student/ProblemList';
import ProblemSolve from './pages/student/ProblemSolve';

import Contest from './pages/student/Contest';
import Submission from './pages/student/Submission';
import ClassPage from './pages/student/Class';
import InstructorDashboard from './pages/instructor/Dashboard';
import InstructorContest from './pages/instructor/Contest';
import InstructorStudent from './pages/instructor/Student';

export default function App() {
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
          
          {/* Student Routes */}
          <Route path="/student" element={<Layout><Navigate to="/student/dashboard" replace /></Layout>}>
          </Route>
          <Route path="/student/dashboard" element={<Layout><StudentDashboard /></Layout>} />
          <Route path="/student/problems" element={<Layout><ProblemList /></Layout>} />
          <Route path="/student/problem/:id" element={<Layout fullBleed><ProblemSolve /></Layout>} />
          <Route path="/student/homework" element={<Navigate to="/student/class" replace />} />
          <Route path="/student/contest" element={<Layout><Contest /></Layout>} />
          <Route path="/student/submission" element={<Layout><Submission /></Layout>} />
          <Route path="/student/class" element={<Layout><ClassPage /></Layout>} />
          <Route path="/student/profile" element={<Layout><PersonalPage /></Layout>} />
          <Route path="/student/settings" element={<Layout><SettingsPage /></Layout>} />
          
          {/* Instructor Routes */}
          <Route path="/instructor" element={<Layout><Navigate to="/instructor/dashboard" replace /></Layout>}>
          </Route>
          <Route path="/instructor/dashboard" element={<Layout><InstructorDashboard /></Layout>} />
          <Route path="/instructor/classes" element={<Layout><InstructorClass /></Layout>} />
          <Route path="/instructor/contest" element={<Layout><InstructorContest /></Layout>} />
          <Route path="/instructor/students" element={<Layout><InstructorStudent /></Layout>} />
          <Route path="/instructor/homework" element={<Layout><InstructorHomework /></Layout>} />
          <Route path="/instructor/problems" element={<Layout><ProblemList /></Layout>} />

          {/* Invite link: /join/CODE */}
          <Route path="/join/:code" element={<JoinClass />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
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
