import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore, apiFetch } from "./lib/authStore";
import { UIProvider, Skeleton } from "./components/UIUtilities";
import SideNavBar, { StudentTopNavBar } from "./components/SideNavBar";
import AuthPortal from "./pages/AuthPortal";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import OrgAdminPortal from "./pages/OrgAdminPortal";
import StudentPortal from "./pages/StudentPortal";
import AIQuestionGenerator from "./components/AIQuestionGenerator";
import { QuestionGroup, Folder } from "./types";

// Setup TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainAppCoordinator() {
  const { user, initialized, initializeAuth } = useAuthStore();
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetGroupId, setAiTargetGroupId] = useState("");
  const [aiTargetFolderId, setAiTargetFolderId] = useState("");

  // Global lists for global AI generator dropdowns
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lastImportTime, setLastImportTime] = useState(0);

  // Floating quiz list triggers for student top navbar CTA
  const [isQuizListOpen, setIsQuizListOpen] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Update default tab based on user role when user logs in
  useEffect(() => {
    if (user) {
      if (user.role === "SuperAdmin") {
        setCurrentTab("dashboard");
      } else if (user.role === "OrgAdmin") {
        setCurrentTab("org-dashboard");
        // Fetch global group & folder lists to support global "Create with AI" modal
        fetchGlobalLists();
      } else if (user.role === "Student") {
        setCurrentTab("student-dashboard");
      }
    }
  }, [user]);

  const fetchGlobalLists = async () => {
    try {
      const groupsRes = await apiFetch("/api/questiongroup");
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
        // Fetch folders for each group
        const allFolders: Folder[] = [];
        await Promise.all(
          groupsData.map(async (g: QuestionGroup) => {
            const fRes = await apiFetch(`/api/question-groups/${g.id}/folders`);
            if (fRes.ok) {
              const fData = await fRes.json();
              allFolders.push(...fData);
            }
          })
        );
        setFolders(allFolders);
      }
    } catch (err) {
      console.error("Error loading dropdown scopes", err);
    }
  };

  const handleOpenAiModalGlobal = () => {
    setAiTargetGroupId("");
    setAiTargetFolderId("");
    // Re-trigger dropdown fetch to make sure new folders/groups appear
    fetchGlobalLists();
    setAiModalOpen(true);
  };

  const handleOpenAiModalWithTarget = (groupId: string, folderId: string) => {
    setAiTargetGroupId(groupId);
    setAiTargetFolderId(folderId);
    setAiModalOpen(true);
  };

  const handleImportSuccess = () => {
    // Notify folder views to reload their list
    setLastImportTime(Date.now());
  };

  // Wait for initial session loading token check
  if (!initialized) {
    return (
      <div className="min-h-screen w-full bg-[#060e20] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin mb-4" />
        <h2 className="font-display font-semibold text-lg text-white">Verifying Authorized Session...</h2>
        <p className="text-slate-400 text-xs mt-1.5 font-mono">LOADING KEYRING ENCRYPTORS</p>
      </div>
    );
  }

  // Not signed in -> Auth Screen
  if (!user) {
    return <AuthPortal />;
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-sans antialiased">
      {/* 1. ADMINS VIEW (SuperAdmin & OrgAdmin Side Bar Layout) */}
      {(user.role === "SuperAdmin" || user.role === "OrgAdmin") && (
        <div className="flex">
          <SideNavBar 
            currentTab={currentTab} 
            setCurrentTab={setCurrentTab} 
            openAiModal={handleOpenAiModalGlobal} 
          />
          {/* Main content stage offset by sidebar width */}
          <main className="flex-1 min-w-0 pl-66 min-h-screen">
            <div className="p-6 md:p-12 max-w-7xl mx-auto">
              {user.role === "SuperAdmin" ? (
                <SuperAdminPortal currentTab={currentTab} />
              ) : (
                <OrgAdminPortal 
                  currentTab={currentTab} 
                  setCurrentTab={setCurrentTab} 
                  openAiModalWithTarget={handleOpenAiModalWithTarget}
                  lastImportTime={lastImportTime}
                />
              )}
            </div>
          </main>
        </div>
      )}

      {/* 2. STUDENTS VIEW (TopNavBar Fluid Layout) */}
      {user.role === "Student" && (
        <div className="flex flex-col min-h-screen">
          <StudentTopNavBar 
            currentTab={currentTab} 
            setCurrentTab={setCurrentTab} 
            openQuizList={() => setIsQuizListOpen(true)} 
          />
          {/* Main stage with padding offset for sticky headers */}
          <main className="flex-1 min-w-0 pt-28 px-4 md:px-12 max-w-7xl mx-auto w-full">
            <StudentPortal 
              currentTab={currentTab} 
              setCurrentTab={setCurrentTab} 
              isQuizListOpen={isQuizListOpen}
              setIsQuizListOpen={setIsQuizListOpen}
            />
          </main>
        </div>
      )}

      {/* 3. PROMINENT DYNAMIC AI IMPORTER MODAL */}
      <AIQuestionGenerator
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        groupId={aiTargetGroupId}
        folderId={aiTargetFolderId}
        groupsList={groups}
        foldersList={folders}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <MainAppCoordinator />
      </UIProvider>
    </QueryClientProvider>
  );
}
