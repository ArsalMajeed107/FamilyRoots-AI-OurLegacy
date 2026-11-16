import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { Box, GitFork } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, AppView } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { Tree2DView } from './components/Tree2DView';
import { ThreeFamilyTree } from './components/ThreeFamilyTree';
import { MemberProfileModal } from './components/MemberProfileModal';
import { RegistrationWizard } from './components/RegistrationWizard';
import { FamilyGuideChat } from './components/FamilyGuideChat';
import { ArchiveView } from './components/ArchiveView';
import { AdminDashboard } from './components/AdminDashboard';
import { LiveHeritageBackground } from './components/LiveHeritageBackground';
import { FloatingFamilyGuide } from './components/FloatingFamilyGuide';
import { FamilyMember } from './types/family';

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] p-6 text-center text-[#0F2342] dark:bg-[#081120] dark:text-[#F8FAFC]">
          <div className="max-w-md rounded-xl border border-[#E2E8F0] bg-white p-6 dark:border-[#1E3252] dark:bg-[#0F1D33]">
            <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-xs text-[#64748B] dark:text-[#94A3B8]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainWorkspace: React.FC = () => {
  const { user, authReady, members, branches } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [treeMode, setTreeMode] = useState<'2d' | '3d'>('3d');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] dark:bg-[#081120]">
        <p className="font-display text-lg text-[#0F2342] dark:text-[#D4AF37]">Loading OurLegacy...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="relative min-h-screen text-[#0F2342] dark:text-[#F8FAFC]">
      <LiveHeritageBackground />
      <Navbar activeView={activeView} onNavigate={setActiveView} />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && (
          <DashboardView onNavigate={setActiveView} onSelectMember={setSelectedMember} />
        )}

        {activeView === 'tree' && (
          <div className="space-y-4">
            <div className="no-print flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#9A7214] dark:text-[#D4AF37]">
                  Interactive Multigenerational Genealogy
                </p>
                <h1 className="font-display text-3xl font-semibold">Family Tree Explorer</h1>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-[#F1F4F9]/90 p-1 backdrop-blur-sm dark:bg-[#0F1D33]/90">
                <button
                  type="button"
                  onClick={() => setTreeMode('3d')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    treeMode === '3d'
                      ? 'bg-[#0F2342] text-white dark:bg-[#D4AF37] dark:text-[#081120]'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  <Box className="h-3.5 w-3.5" />
                  3D Heritage View
                </button>
                <button
                  type="button"
                  onClick={() => setTreeMode('2d')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    treeMode === '2d'
                      ? 'bg-[#0F2342] text-white dark:bg-[#D4AF37] dark:text-[#081120]'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  <GitFork className="h-3.5 w-3.5" />
                  2D Chart &amp; PDF
                </button>
              </div>
            </div>

            {treeMode === '3d' ? (
              <ThreeFamilyTree
                members={members}
                branches={branches}
                selectedMemberId={selectedMember?.id || null}
                onSelectMember={setSelectedMember}
                selectedBranchId={selectedBranchId}
                onChangeBranch={setSelectedBranchId}
              />
            ) : (
              <Tree2DView
                members={members}
                branches={branches}
                selectedMemberId={selectedMember?.id || null}
                onSelectMember={setSelectedMember}
                selectedBranchId={selectedBranchId}
                onChangeBranch={setSelectedBranchId}
              />
            )}
          </div>
        )}

        {activeView === 'register' && (
          <RegistrationWizard onOpenGuide={() => setActiveView('guide')} />
        )}

        {activeView === 'archive' && <ArchiveView onSelectMember={setSelectedMember} />}

        {activeView === 'guide' && <FamilyGuideChat />}

        {activeView === 'admin' && <AdminDashboard onSelectMember={setSelectedMember} />}
      </main>

      {selectedMember && (
        <MemberProfileModal
          member={members.find((m) => m.id === selectedMember.id) || selectedMember}
          onClose={() => setSelectedMember(null)}
          onSelectMember={setSelectedMember}
        />
      )}

      {activeView !== 'guide' && !(activeView === 'tree' && treeMode === '3d') && (
        <FloatingFamilyGuide onOpenFullGuide={() => setActiveView('guide')} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
